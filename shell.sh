#!/usr/bin/env bash

docker run \
  -it \
  --rm \
  -e WEATHER_LOCATIONS=$WEATHER_LOCATIONS \
  -e WEATHER_APP_ID=$WEATHER_APP_ID  \
  -e WEATHER_APP_CODE=$WEATHER_APP_CODE  \
  --name here-microservice here-microservice /bin/bash
