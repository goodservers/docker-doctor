#!/bin/sh
# docker-compose build
docker-compose up -d
sleep 5

cd examples/nodejsapp
# docker build .

docker-compose -f docker-compose.yml --project-name=$(date +%s) up --scale test1=1 -d
# start 2 new instances -- check health and kill previous instances
docker-compose -f docker-compose.yml --project-name=$(date +%s) up --scale test1=2 -d
