import fs from 'fs';
import Docker from 'dockerode';
import * as R from 'ramda';

var socket = process.env.DOCKER_SOCKET || '/var/run/docker.sock';
var stats = fs.statSync(socket);
import {
  compose,
  isEmpty,
  not,
  where,
  filter,
  contains,
  prop,
  tap,
  match,
  equals,
  nth,
  is
} from 'ramda';

export const getFirst = list => nth(0, list);

if (!stats.isSocket()) {
  throw new Error('Are you sure the docker is running?');
}

export const docker = new Docker({ socketPath: socket });

export const findContainers = containerName =>
  new Promise((resolve, reject) => {
    const regexp = new RegExp(`^\/(.*_){0,1}${containerName}_[0-9]+$`, 'g');
    docker.listContainers({ all: true }).then(response => {
      const found = filter(
        where({
          Names: compose(
            not,
            isEmpty,
            filter(compose(not, isEmpty, match(regexp)))
          )
        })
      )(response);

      found ? resolve(found) : reject(`Container "${containerName}" not found`);
    });
  });

export const findContainerWithId = containerId =>
  new Promise((resolve, reject) => {
    docker.listContainers({ all: true }).then(response => {
      const found = filter(where({ Id: equals(containerId) }))(response);

      found
        ? resolve(getFirst(found))
        : reject(`Container "${containerId}" not found`);
    });
  });

export const getContainerNetwork = containerId =>
  new Promise((resolve, reject) => {
    findContainerWithId(containerId)
      .then(container => {
        const networks = Object.keys(container.NetworkSettings.Networks);
        networks
          ? resolve(container.NetworkSettings.Networks[getFirst(networks)])
          : reject(`No network found in ${containerName}`);
      })
      .catch(err => reject(err));
  });

export const getContainerPort = containerId =>
  new Promise((resolve, reject) => {
    findContainerWithId(containerId)
      .then(container => {
        container.Ports
          ? resolve(getFirst(container.Ports).PrivatePort)
          : reject(`No ports found in ${containerName}`);
      })
      .catch(err => reject(err));
  });

export const getContainerId = containerName =>
  new Promise((resolve, reject) => {
    findContainer(containerName)
      .then(container => resolve(container.Id))
      .catch(err => reject(err));
  });

/**
 * Gets container's docker compose neighbours
 * @param  {string} containerId
 * @return {Promise<[]>}
 */
export const getContainerNeighbours = async containerId => {
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

export const parseContainerName = name => {
  const parsedName = name.match(/(.*[0-9]+)_(.*)_([0-9]+)/);
  if (R.isNil(parsedName)) throw Error('ContainerName parse error');

  return {
    prefix: parsedName[1],
    name: parsedName[2],
    scale: parseInt(parsedName[3], 10)
  };
};

export const parseEnvironment = json =>
  R.fromPairs(R.map(R.split('='))(R.pathOr([], ['Config', 'Env'], json)));

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
