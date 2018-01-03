FROM mhart/alpine-node:latest
MAINTAINER Tom Wagner <tomas.wagner@gmail.com>

# set workdir
WORKDIR .

# Copy the code
ADD . .

RUN yarn install

# entrypoint
ENTRYPOINT yarn start
