import * as Docker from 'dockerode';
import * as fs from 'fs';
import * as R from 'ramda';
import { Env, ParsedContainerName } from './types';

var socketPath = process.env.DOCKER_SOCKET || '/var/run/docker.sock';

if (process.env.NODE_ENV !== 'test' && !fs.statSync(socketPath).isSocket()) {
  throw new Error('Are you sure the docker is running?');
}
export const docker = new Docker({ socketPath });

export const getFirst = <T>(list: T[]): T => R.nth(0, list);

export const findContainers = (
  containerName: string
): Promise<Docker.ContainerInfo[]> =>
  new Promise((resolve, reject) => {
    const regexp = new RegExp(`^\/(.*_){0,1}${containerName}_[0-9]+$`, 'g');
    docker.listContainers({ all: true }).then(response => {
      const found = R.filter(
        R.where({
          Names: R.compose(
            R.not,
            R.isEmpty,
            R.filter(R.compose(R.not, R.isEmpty, R.match(regexp)))
          )
        })
      )(response) as Docker.ContainerInfo[];

      resolve(found);
    });
  });

export const findContainerWithId = (
  containerId: string
): Promise<Docker.ContainerInfo> =>
  new Promise((resolve, reject) => {
    return docker.listContainers({ all: true }).then(response => {
      const found = R.filter(R.where({ Id: R.equals(containerId) }))(
        response
      ) as Docker.ContainerInfo[];

      if (!found.length) {
        reject(`Container "${containerId}" not found`);
      }

      resolve(getFirst(found));
    });
  });

export const getContainerNetwork = (containerId: string) =>
  new Promise((resolve, reject) => {
    findContainerWithId(containerId)
      .then((container: any) => {
        const networks = Object.keys(container.NetworkSettings.Networks);
        networks
          ? resolve(container.NetworkSettings.Networks[getFirst(networks)])
          : reject(`No network found in.`);
      })
      .catch(err => reject(err));
  });

export const getContainerPort = (containerId: string): Promise<number> =>
  new Promise((resolve, reject) => {
    findContainerWithId(containerId).then(container => {
      container.Ports
        ? resolve(getFirst(container.Ports).PrivatePort)
        : reject(`No ports found in.`);
    });
  });

export const getContainerId = (containerName: string): Promise<string> =>
  new Promise((resolve, reject) => {
    findContainers(containerName)
      .then(container => resolve(getFirst(container).Id))
      .catch(err => reject(err));
  });

export const getContainerNeighbours = async (
  containerId: string
): Promise<Docker.ContainerInfo[]> => {
  const inspect = await docker.getContainer(containerId).inspect();
  const containerDockerComposeProject = R.path(
    ['Config', 'Labels', 'com.docker.compose.project'],
    inspect
  );

  return !R.isNil(containerDockerComposeProject)
    ? docker.listContainers({
        filters: {
          label: [`com.docker.compose.project=${containerDockerComposeProject}`]
        }
      })
    : new Promise(() => []);
};

export const stopAndRemoveContainers = (containers: Docker.ContainerInfo[]) =>
  containers.map((container: Docker.ContainerInfo) => {
    if (container.State === 'exited') {
      return docker.getContainer(container.Id).remove();
    } else {
      return docker
        .getContainer(container.Id)
        .stop()
        .then(container => container.remove());
    }
  });

export const parseContainerName = (name: string): ParsedContainerName => {
  const parsedName = name.match(/(.*[0-9]+)_(.*)_([0-9]+)/);
  if (R.isNil(parsedName)) throw Error('ContainerName parse error');

  return {
    prefix: parsedName[1],
    name: parsedName[2],
    scale: parseInt(parsedName[3], 10)
  };
};

export const parseEnvironment = (
  containers: Docker.ContainerInspectInfo
): Env =>
  R.fromPairs(
    R.map(R.split('='))(R.path(['Config', 'Env'], containers)) as any
  );

export const parseContainerNetwork = (
  containers: Docker.ContainerInspectInfo
) => {
  const networks = Object.keys(containers.NetworkSettings.Networks);
  return containers.NetworkSettings.Networks[getFirst(networks)];
};

export const renameContainers = (containers: Docker.ContainerInfo[]) =>
  containers.map(container => {
    const parsedName = parseContainerName(getFirst(container.Names));
    return docker
      .getContainer(container.Id)
      .rename({ name: `${parsedName.name}_${parsedName.scale}` });
  });
