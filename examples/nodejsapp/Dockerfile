FROM mhart/alpine-node:latest
MAINTAINER Tom Wagner <tomas.wagner@gmail.com>

# set workdir
WORKDIR /

# Copy the code
ADD . .

# set entrypoint executable
RUN yarn

# port for API
EXPOSE 8000

# entrypoint
ENTRYPOINT yarn start
