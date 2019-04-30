const { assert } = require('chai');

const { transformRequest, transformResponse } = require('../index');

describe('transformRequest', () => {

  it('should return the url path', () => {
    const event = {
      path: '/api/something',
    };

    const { url } = transformRequest(event);
    assert.equal(url, '/api/something');
  });

  it('should return the correct http method', () => {
    const event = {
      path: '/api/something',
      httpMethod: 'GET'
    };

    const { method } = transformRequest(event);
    assert.equal(method, 'GET');
  });

  it('should return the body as payload', () => {
    const event = {
      path: '/api/something',
      body: '{}'
    };

    const { payload } = transformRequest(event);
    assert.equal(payload, '{}');
  });

  it('should append a single query param to the path', () => {
    const event = {
      path: '/api/something',
      queryStringParameters: {
        user: '1'
      },
    };

    const { url } = transformRequest(event);
    assert.equal(url, '/api/something?user=1');
  });

  it('should append query params to the path', () => {
    const event = {
      path: '/api/something',
      queryStringParameters: {
        company: '2',
        user: '1'
      },
    };

    const { url } = transformRequest(event);
    assert.equal(url, '/api/something?company=2&user=1');
  });

  it('should strip the stage from the path', () => {
    const event = {
      path: '/prod/api/something',
      queryStringParameters: {
        company: '2',
        user: '1'
      },
      requestContext: {
        stage: 'prod',
      }
    };

    const { url } = transformRequest(event, { path: { stripStage: true } });
    assert.equal(url, '/api/something?company=2&user=1');
  });

});

describe('transformResponse', () => {

  it('should stringify the body of a json response', () => {
    const response = {
      statusCode: 200,
      headers: {},
      result: { status: 'OK' }
    };

    const { body } = transformResponse(response);
    assert.equal(body, JSON.stringify({ status: 'OK' }));
  });

  it('should return a string response without encoding', () => {
    const response = {
      statusCode: 200,
      headers: {},
      result: '<html></html>',
    };

    const { body } = transformResponse(response);
    assert.equal(body, '<html></html>');
  });

  it('should preserve the headers', () => {
    const response = {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      result: { status: 'OK' }
    };

    const { headers } = transformResponse(response);
    assert.deepEqual(headers, { 'Content-Type': 'application/json' });
  });

  it('should strip restricted headers', () => {
    const response = {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'content-encoding': 'something',
        'transfer-encoding': 'something else',
      },
      result: { status: 'OK' }
    };

    const { headers } = transformResponse(response);
    assert.deepEqual(headers, { 'Content-Type': 'application/json' });
  });

});
