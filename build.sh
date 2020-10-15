#!/bin/sh

rm -rf node_modules
docker build --no-cache -t robodomo/here-microservice .
