import * as DockerEvents from 'docker-events';
import * as R from 'ramda';
import checkers from './checkers/';
import {
  docker,
  findContainers,
  getContainerNeighbours,
  parseContainerName,
  parseContainerNetwork,
  parseEnvironment,
  renameContainers,
  stopAndRemoveContainers
} from './docker';

const HEALTH_MAX_RETRY = 'HEALTH_MAX_RETRY';
const HEALTH_TIMEOUT = 'HEALTH_TIMEOUT';
const HEALTH_CHECKER = 'HEALTH_CHECKER';
const VIRTUAL_PORT = 'VIRTUAL_PORT';

const dateToTimestamp = date => {
  const started = new Date(date);
  return Math.round(started.getTime() / 1000);
};

const emitter = new DockerEvents({
  docker
});

const getStartTime = container =>
  dateToTimestamp(R.path(['State', 'StartedAt'], container));

emitter.on('start', async info => {
  try {
    const {
      scale: containerInstance,
      name: containerName,
      prefix: containerPrefix
    } = parseContainerName(R.path(['Actor', 'Attributes', 'name'], info));

    const currentContainer = await docker.getContainer(info.id).inspect();
    const env = parseEnvironment(currentContainer);
    const network = parseContainerNetwork(currentContainer);
    const startedTime = dateToTimestamp(currentContainer.State.StartedAt);

    // health checks only containers with specified HEALTH_CHECKER property
    // and nly first instance take care about stopping old containers
    if (R.isNil(env[HEALTH_CHECKER]) || containerInstance !== 1) return;

    console.log(
      'Health check:',
      containerName,
      env[HEALTH_CHECKER],
      startedTime
    );

    await checkers[env[HEALTH_CHECKER]]({
      ip: network.IPAddress,
      port: env[VIRTUAL_PORT],
      timeout: env[HEALTH_TIMEOUT],
      maxRetry: env[HEALTH_MAX_RETRY]
    });

    const containersWithSameName = await findContainers(containerName);
    const containers = await Promise.all(
      containersWithSameName.map(container =>
        docker.getContainer(container.Id).inspect()
      )
    );

    const containersToStop = R.uniqBy(
      container => container.Id,
      R.flatten(
        await Promise.all(
          containers
            .map((container: any) => {
              console.log(
                'container #',
                containerInstance,
                getStartTime(container),
                startedTime
              );
              return container;
            })
            .filter(container => getStartTime(container) < startedTime)
            .map(container => getContainerNeighbours(container.Id))
        )
      )
    )
      // dont stop scaled containers
      .filter(container => !container.Image.includes(containerPrefix));
    console.log(
      'container #',
      containerInstance,
      'toStop',
      containersToStop.length
    );
    containersToStop.map(container =>
      console.log('container #', containerInstance, container.Names)
    );
    await Promise.all(stopAndRemoveContainers(containersToStop));

    // Find sibling containers (started from docker-compose) to rename
    const containersToRename = R.flatten(
      await Promise.all(
        containers
          .filter(container => getStartTime(container) >= startedTime)
          .map((container: any) => getContainerNeighbours(container.Id))
      )
    );

    await Promise.all(renameContainers(containersToRename));
  } catch (error) {
    console.log(error.message);
  }
});

emitter.start();
