#!/usr/bin/env bash

docker run \
    -d \
    --rm \
    --name="here-microservice" \
    -e WEATHER_LOCATIONS=$WEATHER_LOCATIONS \
    -e WEATHER_APP_ID=$WEATHER_APP_ID  \
    -e WEATHER_APP_CODE=$WEATHER_APP_CODE  \
    robodomo/here-microservice
