FROM mhart/alpine-node:latest
MAINTAINER Tom Wagner <tomas.wagner@gmail.com>

# create workdir
RUN mkdir -p /app

# set workdir
WORKDIR /app

# Copy the code
ADD . .

RUN yarn install

# entrypoint
ENTRYPOINT yarn start
