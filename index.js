/**
 * This module maps the Lambda proxy requests to the Hapijs router
 */
'use strict';

const Hapi = require('hapi');
const server = new Hapi.Server();
server.connection(); // no connection details for lambda

const qs = require('qs');

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

exports.handler = (event, context, callback) => {

    server.makeReady((err) => {

        if(err) throw err;

        // lambda removes query string params from the url and places them into
        // and object in event. Hapi expects them on the url path
        let path = event.path;
        if (event.queryStringParameters) {
            // Use qs library to encode URL parameters correctly
            path += '?' + qs.stringify(event.queryStringParameters);
        }

        // map lambda event to hapi request
        const options = {
            method: event.httpMethod,
            url: path,
            payload: event.body,
            headers: event.headers,
            validate: false
        };

        server.inject(options, function(res){

            // some headers are rejected by lambda
            // ref: http://stackoverflow.com/questions/37942119/rust-aws-api-gateway-service-proxy-to-s3-file-upload-using-raw-https-request/37950875#37950875
            // ref: https://github.com/awslabs/aws-serverless-express/issues/10
            delete res.headers['content-encoding'];
            delete res.headers['transfer-encoding'];

            // handle cors here b/c api gateway does half of it for us
            // these options must match the serverless.yaml options
            res.headers['Access-Control-Allow-Origin'] = '*';
            res.headers['Access-Control-Allow-Credentials'] = true;

            const response = {
                statusCode: res.statusCode,
                headers: res.headers,
                body: typeof res.result === 'string' ? res.result : JSON.stringify(res.result)
            };

            callback(null, response);
        });

    });

};
