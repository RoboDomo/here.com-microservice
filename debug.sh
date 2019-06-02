#!/usr/bin/env bash

# run container without making it a daemon - useful to see logging output
docker run \
    --rm \
    --name="here-microservice" \
    -e WEATHER_LOCATIONS=$WEATHER_LOCATIONS \
    -e WEATHER_APP_ID=$WEATHER_APP_ID  \
    -e WEATHER_APP_CODE=$WEATHER_APP_CODE  \
    here-microservice
