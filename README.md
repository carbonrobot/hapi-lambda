hapi-lambda
-------------

[![npm version](https://badge.fury.io/js/hapi-lambda.svg)](https://badge.fury.io/js/hapi-lambda)

This module will allow you to host your Hapijs (17+) application on Amazon Lambda. If using API Gateway, you should set the Gateway to "proxy" mode.

CAUTION: There are significant breaking changes between this version and the pre-1.0 versions of this module.

## Usage

```
// api.js

const Hapi = require('@hapi/hapi');

module.exports = {
  init: async () => {
    const server = new Hapi.server({
      port: process.env.port || 3000,
      routes: { cors: true }
    });

    const plugins = []; // your plugins here
    await server.register(plugins);

    // return the server for Lambda support
    return server;
  },
};
```

Your index.js file that you expose to Lambda should look like the following:

```
// index.js

const api = require('./api');
const { transformRequest, transformResponse } = require('hapi-lambda');

// cache the server for better peformance
let server;

exports.handler = async event => {
  if (!server) {
    server = await api.init();
  }

  const request = transformRequest(event);

  // handle cors here if needed
  request.headers['Access-Control-Allow-Origin'] = '*';
  request.headers['Access-Control-Allow-Credentials'] = true;

  const response = await server.inject(request);

  return transformResponse(response);
};
```

## Deployment

Deployment is a much larger topic and not covered by this module, however I highly recommend deploying your Lambda application with [Serverless](https://serverless.com/)

### Usage with Serverless

Here is an example serverless configuration.

```
service: hapi-lambda-demo
provider:
  name: aws
  runtime: nodejs8.10

stage: dev
region: us-east-1

functions:
  api:
    handler: index.handler
    events:
      - http:
          path: "{proxy+}"
          method: any
          cors: true

plugins:
  - serverless-offline
```

## Demo

A working repository and example is provided at https://www.carbonatethis.com/hosting-a-serverless-hapi-17-api-with-aws-lambda/