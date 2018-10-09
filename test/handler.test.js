var assert = require('assert');

const hapiLambda = require('../index');
const {internalsForTest } = hapiLambda;

const { hapiRequestBuilder, handlerFactory } = internalsForTest;
const { sampleProxyHttpGatewayEvent, sampleProxyHttpGatewayEventFromCustomDomainWithCustomMapping } = require('./useCases').default;

const fakeHapiServer = {
  makeReady : function () {

  }
};

describe("Main module tests", function() {

  describe('Hapi request is created', function() {
    it('Hapi request is created chaining the query params', function () {
      let request = hapiRequestBuilder(sampleProxyHttpGatewayEvent,false);

      assert.equal(request.url,'/test/hello?multiParam=2&singleParam=1');
      assert.equal(request.method,'GET');
      assert.equal(request.validate,false);
      assert.equal(request.headers,sampleProxyHttpGatewayEvent.headers);
      assert.equal(request.payload,sampleProxyHttpGatewayEvent.body);
    });

    it('Hapi request is created stripping the stage from the url', function () {
      let request = hapiRequestBuilder(sampleProxyHttpGatewayEventFromCustomDomainWithCustomMapping,true);

      assert.equal(request.url,'/test/hello?multiParam=2&singleParam=1');
    });

    it('Hapi request is created without stripping the stage from the url even if present', function () {
      let request = hapiRequestBuilder(sampleProxyHttpGatewayEventFromCustomDomainWithCustomMapping,false);

      assert.equal(request.url,'/dev/test/hello?multiParam=2&singleParam=1');
    });


  });

  describe('handler creation via handlerFactory', function() {
    const testEventLoop = (waitForEmptyLoop,expectedValue) => () => {
      const createdHandler = handlerFactory(fakeHapiServer)(waitForEmptyLoop)
      const context = {};
      createdHandler({}, context);

      assert.equal(context.callbackWaitsForEmptyEventLoop, expectedValue);
    };

    it('handlerFactory can configure the handler for not waiting to an empty event loop', testEventLoop(false,false));

    it('handlerFactory can configure the handler for waiting to an empty event loop', testEventLoop(true,true));
  });

});
