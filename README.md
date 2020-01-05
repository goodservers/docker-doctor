# Docker doctor - health checker container for achieving zero downtime when using one container for app

[![CircleCI](https://circleci.com/gh/goodservers/docker-doctor/tree/master.svg?style=svg)](https://circleci.com/gh/goodservers/docker-doctor/tree/master)

The docker container checker waits until the new container is fully prepared and then removes the old one. Basically it checks the docker event sent from staring container. If have set `HEALTH_CHECKER` environment property then waits until their health is ok and afterwards old container is stopped and removed.

## Example

You have some application defined in docker (see `examples/nodejsapp`). When your CI runs the deployment phase it starts the new container and removes old one. But it takes some time to boot up application to healthy state. And if you have only one container it causes downtime. So you can setup the checker which waits until the new container is fully prepared and then removes the old one.

## Setup on server

```
docker-compose up
```

or see the example of usage with nginx, nginx-proxy, letsencrypt as a server [docker-gateway](https://github.com/goodservers/docker-gateway)

## Setup for example app `examples/nodejsapp`

```
docker-compose -f docker-compose.yml --project-name=$(date +%s) up --scale nodejs_app=1 -d
```

## Environment props

| env              | values      | default | meaning                                                   |
| ---------------- | ----------- | ------- | --------------------------------------------------------- |
| VIRTUAL_PORT     | number      | -       | application listening port (same name as for nginx-proxy) |
| HEALTH_CHECKER   | http, https | -       | active script used to check health                        |
| HEALTH_MAX_RETRY | number      | 30      | (optional) maximum number of attempts to check health     |
| HEALTH_TIMEOUT   | number      | 1000    | (optional) number of ms to check in one attempt           |

## Requirements

- [Good VPS or dedicated server](https://goodservers.io)
- Installed docker and docker-compose
- [nginx-proxy](https://github.com/goodservers/docker-gateway) as a gateway for your deployed containers - they are automatically proxied - so your service is balanced between two containers.
