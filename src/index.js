import {
  docker,
  findContainers,
  findContainerWithId,
  getContainerNeighbours,
  parseContainerName,
  parseContainerNetwork,
  parseEnvironment,
  renameContainers,
  stopAndRemoveContainers
} from './docker';
import * as R from 'ramda';
import Dockerode from 'dockerode';
import DockerEvents from 'docker-events';
import checkers from './checkers/';

const HEALTH_MAX_RETRY = 'HEALTH_MAX_RETRY';
const HEALTH_TIMEOUT = 'HEALTH_TIMEOUT';
const HEALTH_CHECKER = 'HEALTH_CHECKER';
const VIRTUAL_PORT = 'VIRTUAL_PORT';
const TIME_CORRECTION = 5; // five second correction

const emitter = new DockerEvents({
  docker
});

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
        const env = parseEnvironment(json);
        const network = parseContainerNetwork(json);

        // health checks only containers with specified HEALTH_CHECKER property
        if (!R.isNil(env[HEALTH_CHECKER])) {
          console.log('Health check:', name, env[HEALTH_CHECKER], startedTime);
          return checkers[env[HEALTH_CHECKER]]({
            ip: network.IPAddress,
            port: env[VIRTUAL_PORT],
            timeout: env[HEALTH_TIMEOUT],
            maxRetry: env[HEALTH_MAX_RETRY]
          }).then(async done => {
            const containers = await findContainers(name);
            // get old containers by time < startedTime and stop them
            // Find sibling containers (started from docker-compose)
            const containersToStop = R.flatten(
              await Promise.all(
                containers
                  .filter(container => container.Created < startedTime)
                  .map(container => getContainerNeighbours(container.Id))
              )
            );

            await Promise.all(stopAndRemoveContainers(containersToStop));

            // Find sibling containers (started from docker-compose) to rename
            const containersToRename = R.flatten(
              await Promise.all(
                containers
                  .filter(container => container.Created >= startedTime)
                  .map(container => getContainerNeighbours(container.Id))
              )
            );

            await Promise.all(renameContainers(containersToRename));
          });
        }
      });
  } catch (err) {
    console.log('err', err.message);
  }
});

emitter.start();
