import {
  getFirst,
  docker,
  findContainers,
  findContainerWithId
} from './docker';
import * as R from 'ramda';
import Dockerode from 'dockerode';
import DockerEvents from 'docker-events';
import checkers from './checkers/';

const emitter = new DockerEvents({
  docker
});

const stopAndRemoveContainers = containers =>
  containers.map(container => {
    if (container.State === 'exited') {
      docker
        .getContainer(container.Id)
        .remove()
        .catch(console.log);
    } else {
      docker
        .getContainer(container.Id)
        .stop()
        .then(container => container.remove())
        .catch(console.log);
    }
  });

const parseContainerName = name => {
  const parsedName = name.match(/(.*[0-9]+)_(.*)_([0-9]*)/);
  if (R.isNil(parsedName)) throw Error('ContainerName parse error');

  return {
    prefix: parsedName[1],
    name: parsedName[2],
    scale: parseInt(parsedName[3], 10)
  };
};

const getEnvironment = json =>
  R.fromPairs(R.map(R.split('='))(R.pathOr([], ['Config', 'Env'], json)));

const HEALTH_MAX_RETRY = 'HEALTH_MAX_RETRY';
const HEALTH_TIMEOUT = 'HEALTH_TIMEOUT';
const HEALTH_CHECKER = 'HEALTH_CHECKER';
const VIRTUAL_HOST = 'VIRTUAL_HOST';
const VIRTUAL_PORT = 'VIRTUAL_PORT';
const TIME_CORRECTION = 5; // five second correction

export const getContainerNetwork = json => {
  const networks = Object.keys(json.NetworkSettings.Networks);
  return json.NetworkSettings.Networks[getFirst(networks)];
};

emitter.on('start', json => {
  try {
    const { name } = parseContainerName(
      R.pathOr('', ['Actor', 'Attributes', 'name'], json)
    );
    const startedTime = json.time - TIME_CORRECTION;

    docker
      .getContainer(json.id)
      .inspect()
      .then(json => {
        const env = getEnvironment(json);
        const network = getContainerNetwork(json);

        // health checks only containers with specified HEALTH_CHECKER property
        if (!R.isEmpty(env[HEALTH_CHECKER])) {
          console.log('Health check:', name, env[HEALTH_CHECKER], startedTime);
          return checkers[env[HEALTH_CHECKER]]({
            ip: network.IPAddress,
            port: env[VIRTUAL_PORT],
            timeout: env[HEALTH_TIMEOUT],
            maxRetry: env[HEALTH_MAX_RETRY]
          }).then(async done => {
            const containers = await findContainers(name);
            // get old containers by time < startedTime and stop them
            const containersToStop = containers.filter(
              container => container.Created < startedTime
            );
            // console.log('Stopping', containersToStop);
            stopAndRemoveContainers(containersToStop);
          });
        }
      });
  } catch (err) {
    console.log('err', err);
  }
});

emitter.start();
