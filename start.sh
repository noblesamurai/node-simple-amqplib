#!/bin/sh
while ! nc -z rabbitmq 5672; do sleep 3; done
npm test
