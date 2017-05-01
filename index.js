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

exports.handler = (event, context, callback) => {

    server.makeReady((err) => {
        
        if(err) throw err;

        // map lambda event to hapi request
        const options = {
            method: event.httpMethod,
            url: event.path,
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
                body: JSON.stringify(res.result)
            };

            console.log('response', response);

            callback(null, response);
        });

    });

};