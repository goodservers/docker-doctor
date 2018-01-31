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

const dateToTimestamp = date => {
  const started = new Date(date);
  return Math.round(started.getTime() / 1000, 2);
};

const emitter = new DockerEvents({
  docker
});

emitter.on('start', async info => {
  try {
    const { scale: containerInstance, name: containerName, prefix: containerPrefix } = parseContainerName(
      R.pathOr('', ['Actor', 'Attributes', 'name'], info)
    );

    const currentContainer = await docker.getContainer(info.id).inspect();
    const env = parseEnvironment(currentContainer);
    const network = parseContainerNetwork(currentContainer);
    const startedTime = dateToTimestamp(currentContainer.State.StartedAt);

    // health checks only containers with specified HEALTH_CHECKER property
    if (R.isNil(env[HEALTH_CHECKER])) return;

    console.log('Health check:', containerName, env[HEALTH_CHECKER], startedTime);
    const done = await checkers[env[HEALTH_CHECKER]]({
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

    // Only first instance take care about stopping old containers
    if (containerInstance === 1) {
      const containersToStop = R.uniqBy((container) => container.Id, R.flatten(
        await Promise.all(
          containers
            .map(container => {
              const containerStarted = dateToTimestamp(
                R.pathOr(currentContainer.State.StartedAt, ['State', 'StartedAt'], container)
              );
              console.log(containerStarted, startedTime);
              return container;
            })
            .filter(
              container =>
                dateToTimestamp(
                  R.pathOr(
                    currentContainer.State.StartedAt,
                    ['State', 'StartedAt'],
                    container
                  )
                ) < startedTime
            )
            .map(container => getContainerNeighbours(container.Id))
        )
      ))
      // dont stop scaled containers
      .filter(container => !container.Image.includes(containerPrefix));
      containersToStop.map(container => console.log(container.Names));
      console.log('containersToStop', containersToStop.length);
      await Promise.all(stopAndRemoveContainers(containersToStop));
    }

    // Find sibling containers (started from docker-compose) to rename
    const containersToRename = R.flatten(
      await Promise.all(
        containers
          .filter(
            container =>
            dateToTimestamp(
              R.pathOr(
                currentContainer.State.StartedAt,
                ['State', 'StartedAt'],
                container
              )
            ) >= startedTime
          )
          .map(container => getContainerNeighbours(container.Id))
      )
    );

    await Promise.all(renameContainers(containersToRename));
  } catch (err) {
    console.log('err', err.message);
  }
});

emitter.start();
