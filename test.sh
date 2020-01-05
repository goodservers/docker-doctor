#!/bin/sh
NUMBER_OF_TESTS=1

docker-compose up -d
sleep 5
echo "⏱Instance started"

echo "Start first app (test1) in one instance"
cd examples/nodejsapp
# docker build .

START_DATE_FIRST=$(date +%s)
docker-compose -f docker-compose.yml --project-name=$START_DATE_FIRST up --scale test1=1 -d &>/dev/null
echo "Started app ($START_DATE_FIRST) in one instance"
docker ps | grep $START_DATE_FIRST

START_DATE_SECOND=$(date +%s)
docker-compose -f docker-compose.yml --project-name=$START_DATE_SECOND up --scale test1=2 -d &>/dev/null
echo "Started app ($START_DATE_SECOND) in two instances (after health check, previous instances should be killed)"
docker ps | grep $START_DATE_SECOND

sleep 5
echo "Check if first instance exists"
docker ps | grep $START_DATE_FIRST

if [ `docker ps | grep $START_DATE_FIRST | wc -l` -eq 1 ]; then
    echo "❌ Test 1/$NUMBER_OF_TESTS failed - previous instance exists."
    exit 1
else
    echo "✅ Test 1/$NUMBER_OF_TESTS passed - instance doesn't exists."
fi
