hapi-lambda
-------------

[![npm version](https://badge.fury.io/js/hapi-lambda.svg)](https://badge.fury.io/js/hapi-lambda)

This module will allow you to host your Hapi.js application on Amazon Lambda.

## Usage

Your application should already be configured as [plugins](https://hapijs.com/tutorials/plugins?lang=en_US):

```
// api.js

exports.register = function (server, options, next) {
    const plugins = [];

    server.register(plugins, () => {
        server.route({
            method: 'GET',
            path: '/',
            handler: function(request, reply){ reply('OK'); }
        });
        return next();
    });
};

exports.register.attributes = { pkg: { name: 'api', version: '1.0.0' } };
```

Your index.js file that you push to Lambda should look like the following:

```
// index.js

const hapiLambda = require('hapi-lambda');
const api = require('./api');

hapiLambda.configure([api]);
exports.handler = hapiLambda.handler;
```

## Deployment

Deployment is a much larger topic and not covered by this module, however I highly recommend deploying your Lambda application with [Serverless](https://serverless.com/).
