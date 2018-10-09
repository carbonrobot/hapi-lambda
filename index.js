/**
 * This module maps the Lambda proxy requests to the Hapijs router
 */
'use strict';

const Hapi = require('hapi');
const server = new Hapi.Server();
server.connection(); // no connection details for lambda

// flag so plugsin dont get reconfigured
let loaded = false;

/**
 * Configures the lambda proxy to host hapi.js plugins
 * @param plugins An array of plugins to register
 */
exports.configure = function(plugins){
    if(!plugins) throw 'Plugins must be configured as an array';

    server.makeReady = function(onServerReady){
        if(!loaded){
            server.register(plugins, onServerReady);
            loaded = true;
        }
        else{
            onServerReady(null);
        }
    };
}

const hapiRequestBuilder = (httpGatewayEvent, stripStageFromPath) => {
  const extractCurrentStage = () => {

    return httpGatewayEvent.requestContext ? httpGatewayEvent.requestContext.stage : null;

  };

  const extractEventPath = () => {

    const currentStage =  extractCurrentStage();

    const eventPath = httpGatewayEvent.path;
    if (!stripStageFromPath || !currentStage) {
      return eventPath;
    }

    const prefixToStrip = '/' + currentStage + '/';

    return eventPath.startsWith(prefixToStrip) ? eventPath.substr(prefixToStrip.length - 1) : eventPath;

  };

  const chainQueryParams = (pathWithoutParams) => {
    // lambda removes query string params from the url and places them into
    // and object in event. Hapi expects them on the url path

    if(!httpGatewayEvent.queryStringParameters) {
      return pathWithoutParams;
    }

    const qs = Object.keys(httpGatewayEvent.queryStringParameters).map(key => { return key + '=' + httpGatewayEvent.queryStringParameters[key]; });

    return qs.length === 0 ? pathWithoutParams : pathWithoutParams + '?' + qs.join('&');

  };

  const path = chainQueryParams(extractEventPath(httpGatewayEvent),httpGatewayEvent);

  // map lambda event to hapi request
  return {
    method: httpGatewayEvent.httpMethod,
    url: path,
    payload: httpGatewayEvent.body,
    headers: httpGatewayEvent.headers,
    validate: false
  };
};

const hapiResponseBuilder = (hapiReponse) => {
  // some headers are rejected by lambda
  // ref: http://stackoverflow.com/questions/37942119/rust-aws-api-gateway-service-proxy-to-s3-file-upload-using-raw-https-request/37950875#37950875
  // ref: https://github.com/awslabs/aws-serverless-express/issues/10
  delete hapiReponse.headers['content-encoding'];
  delete hapiReponse.headers['transfer-encoding'];

  // handle cors here b/c api gateway does half of it for us
  // these options must match the serverless.yaml options
  hapiReponse.headers['Access-Control-Allow-Origin'] = '*';
  hapiReponse.headers['Access-Control-Allow-Credentials'] = true;

  return {
    statusCode: hapiReponse.statusCode,
    headers: hapiReponse.headers,
    body: typeof hapiReponse.result === 'string' ? hapiReponse.result : JSON.stringify(hapiReponse.result)
  };
}


const handlerFactory = (hapiServer) => (callbackWaitsForEmptyEventLoop, stripStageFromPath) => (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = callbackWaitsForEmptyEventLoop;

  hapiServer.makeReady((err) => {

    if(err) throw err;

    const options = hapiRequestBuilder(event, stripStageFromPath);

    hapiServer.inject(options, function(res){
      callback(null, hapiResponseBuilder(res));
    });
  });
};

/**
 * Creates a handler to be used in a lambda that will forward the request to a configured hapi server
 *
 * @param callbackWaitsForEmptyEventLoop if true aws lambda will not kill the process until the event loop is empty
 * @param stripStageFromPath if true in case of the path of the event contains the stage it will be stripped (for custom domain mapping)
 */
const createHandler = handlerFactory(server);

exports.internalsForTest = { handlerFactory, hapiRequestBuilder , hapiResponseBuilder};

/* This should be used to customize the handler creation */
exports.createHandler = createHandler;

/* This is for retro compatibility */
exports.handler = handlerFactory(server)(true, false);
