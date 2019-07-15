import * as Docker from 'dockerode';
import * as fs from 'fs';
import * as R from 'ramda';
import {
  compose,
  equals,
  filter,
  isEmpty,
  match,
  not,
  nth,
  where
} from 'ramda';
import { Env } from './types';

var socket = process.env.DOCKER_SOCKET || '/var/run/docker.sock';
var stats = fs.statSync(socket);

export const getFirst = (list: any): any => nth(0, list);

if (!stats.isSocket()) {
  throw new Error('Are you sure the docker is running?');
}

export const docker = new Docker({ socketPath: socket });

export const findContainers = (containerName: string): Promise<any> =>
  new Promise((resolve, reject) => {
    const regexp = new RegExp(`^\/(.*_){0,1}${containerName}_[0-9]+$`, 'g');
    docker.listContainers({ all: true }).then(response => {
      const found = filter(
        where({
          Names: compose(
            not,
            isEmpty,
            filter(
              compose(
                not,
                isEmpty,
                match(regexp)
              )
            )
          )
        })
      )(response);

      found ? resolve(found) : reject(`Container "${containerName}" not found`);
    });
  });

export const findContainerWithId = (containerId: string) =>
  new Promise((resolve, reject) => {
    docker.listContainers({ all: true }).then(response => {
      const found = filter(where({ Id: equals(containerId) }))(response);

      found
        ? resolve(getFirst(found))
        : reject(`Container "${containerId}" not found`);
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

export const getContainerPort = (containerId: string) =>
  new Promise((resolve, reject) => {
    findContainerWithId(containerId)
      .then((container: any) => {
        container.Ports
          ? resolve(getFirst(container.Ports).PrivatePort)
          : reject(`No ports found in.`);
      })
      .catch(err => reject(err));
  });

export const getContainerId = (containerName: string) =>
  new Promise((resolve, reject) => {
    findContainers(containerName)
      .then(container => resolve(container.Id))
      .catch(err => reject(err));
  });

export const getContainerNeighbours = async (
  containerId: string
): Promise<any[]> => {
  const inspect = await docker.getContainer(containerId).inspect();
  const containerDockerComposeProject = R.pathOr(
    '',
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

export const stopAndRemoveContainers = containers =>
  containers.map(container => {
    if (container.State === 'exited') {
      return docker.getContainer(container.Id).remove();
    } else {
      return docker
        .getContainer(container.Id)
        .stop()
        .then(container => container.remove());
    }
  });

export const parseContainerName = (name: string): any => {
  const parsedName = name.match(/(.*[0-9]+)_(.*)_([0-9]+)/);
  if (R.isNil(parsedName)) throw Error('ContainerName parse error');

  return {
    prefix: parsedName[1],
    name: parsedName[2],
    scale: parseInt(parsedName[3], 10)
  };
};

export const parseEnvironment = (json: any): Env =>
  R.fromPairs(R.map(R.split('='))(R.path(['Config', 'Env'], json)) as any);

export const parseContainerNetwork = json => {
  const networks = Object.keys(json.NetworkSettings.Networks);
  return json.NetworkSettings.Networks[getFirst(networks)];
};

export const renameContainers = containers =>
  containers.map(container => {
    const parsedName = parseContainerName(getFirst(container.Names));
    return docker
      .getContainer(container.Id)
      .rename({ name: `${parsedName.name}_${parsedName.scale}` });
  });
