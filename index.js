const transformUrlPath = (event, options) => {
  let url = event.path;

  // extract the stage from the url
  if (options.stripStage) {
    const currentStage = event.requestContext ? event.requestContext.stage : null;
    if (currentStage) {
      url = url.replace(`${currentStage}/`, '');
    }
  }

  // append qs params
  const params = event.queryStringParameters;
  if (params) {
    const qs = Object.keys(params).map(key => `${key}=${params[key]}`);
    if (qs.length > 0) {
      url += `?${qs.join('&')}`;
    }
  }

  return url;
};

const transformRequest = (event, options) => {
  const opt = {
    path: {
      stripStage: false,
    },
    ...options,
  };

  return {
    method: event.httpMethod,
    url: transformUrlPath(event, opt.path),
    payload: event.body,
    headers: event.headers,
    validate: false
  };
};

const transformResponse = response => {
  const { statusCode } = response;

  const headers = {
    ...response.headers,
  };

  // some headers are rejected by lambda
  // ref: http://stackoverflow.com/questions/37942119/rust-aws-api-gateway-service-proxy-to-s3-file-upload-using-raw-https-request/37950875#37950875
  // ref: https://github.com/awslabs/aws-serverless-express/issues/10
  delete headers['content-encoding'];
  delete headers['transfer-encoding'];

  let body = response.result;
  if (typeof response.result !== 'string') {
    body = JSON.stringify(body);
  }

  return {
    statusCode,
    headers,
    body
  };
};

module.exports = {
  transformRequest,
  transformResponse
};