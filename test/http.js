'use strict';
const fs = require('fs');
const test = require('ava');
const got = require('got');
const App = require('@matter-in-motion/app');
const extension = require('../index');

function createApp(logLevel = 'silent') {
  return new App({
    extensions: ['loggers.pino', 'transport', extension],

    pino: {
      options: {
        level: logLevel,
        prettyPrint: true
      }
    },

    defaults: {
      logger: 'loggers.pino'
    },

    http: {
      listen: {
        host: '0.0.0.0',
        port: 3000
      }
    }
  });
}

const app = createApp('debug');
// const app = createApp();
test.before(() => app.start());
test.after.always(() => app.stop());

test('checks that transport inited properly', t => {
  const transport = app.require('transport');
  const http = app.require('transports.http');
  t.is(transport.get('http'), http);
});

test('replies with a string', async t => {
  const transport = app.require('transport');

  app.on('transport/http/get/string', message => {
    t.is(typeof message.url, 'object');
    t.is(message.url.searchParams.get('foo'), 'bar');
    t.is(typeof message.request.pipe, 'function');
    t.is(message.requestMethod, 'get');
    t.is(typeof message.requestHeaders, 'object');
    transport.send({
      ...message,
      responseStatusCode: 200,
      response: 'RESPONSE'
    });
  });

  const response = await got('http://localhost:3000/string?foo=bar');
  t.is(response.statusCode, 200);
  t.is(response.body, 'RESPONSE');
});

test('replies with a stream', async t => {
  const transport = app.require('transport');

  app.on('transport/http/get/stream', message => {
    t.is(message.encodeBy, 'application/json');
    t.is(message.transport, 'http');

    transport.send({
      ...message,
      response: fs.createReadStream('./package.json'),
      responseStatusCode: 200,
      responseHeaders: {
        'Content-Type': message.encodeBy
      }
    });
  });

  const response = await got('http://localhost:3000/stream', { json: true });
  t.is(response.statusCode, 200);
  t.is(typeof response.body, 'object');
  t.is(response.body.name, '@matter-in-motion/transports.http');
});

test('emtpy reply', async t => {
  const transport = app.require('transport');

  app.on('transport/http/get/empty', message => {
    transport.send({
      ...message,
      responseStatusCode: 200
    });
  });

  const response = await got('http://localhost:3000/empty');
  t.is(response.statusCode, 200);
  t.is(response.body, '');
});

test('fails to reply with a number', async t => {
  const transport = app.require('transport');

  app.on('transport/http/get/number', message => {
    transport
      .send({
        ...message,
        response: 1234,
        responseStatusCode: 200
      })
      .catch(e => {
        t.is(e.message, 'Invalid response type number');
        message.connection.end();
      });
  });

  await got('http://localhost:3000/number');
});

test('serialize and parse cookies', t => {
  const http = app.require('transports.http');
  const cookie = http.serializeCookie('test', 'value');
  t.is(cookie, 'test=value');
  const cookies = http.parseCookies(cookie);
  t.is(cookies.test, 'value');
});

test('adds static server', async t => {
  const http = app.require('transports.http');
  http.addStatic({
    url: '/static',
    root: './'
  });

  const response = await got('http://localhost:3000/static/package.json', {
    json: true
  });
  t.is(response.body.name, '@matter-in-motion/transports.http');
});
