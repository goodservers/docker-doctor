# Docker doctor - health checker and zero downtime for one container app
The docker container checker which waits until the new container is fully prepared and then removes the old one. Basically it checks the docker events sent from others containers when starts. If have set `HEALTH_CHECKER` environment property then doctor waits until their health is ok and then old container is stopped and removed.

## Example
You have some application defined in docker (see `examples/nodejsapp`). When your CI runs the deployment phase it starts the new container and removes old one. But it takes some time to boot up application to healthy state. And if you have only one container it causes downtime. So you can setup the checker which waits until the new container is fully prepared and then removes the old one.

## Setup
```
docker-compose up
```

## Environment props
| env | values | default | meaning |
|-----|--------|---------|---------|
| HEALTH_CHECKER | http, https | - | active script used to check health  |
| HEALTH_MAX_RETRY | number | 30 | maximum number of attempts to check health |
| HEALTH_TIMEOUT | number | 1000 | number of ms to check in one attempt |
| | | | |

## Requirements
* [Good VPS or dedicated server](https://goodservers.io)
* Docker, docker compose
* [nginx-proxy](https://github.com/jwilder/nginx-proxy) as a gateway for your deployed containers - they are automatically proxied - so your service is balanced between two containers.
* Each app e.g. NodeJS app has own container in Docker with two services, check `docker-compose.yml` file.
