'use strict';
const http = require('http');
const https = require('https');
const { pipeline } = require('stream');
const cookie = require('cookie');
const flatstr = require('flatstr');
const serveStatic = require('./static');

class HTTP {
  StatusCodes = http.STATUS_CODES;

  init({ settings, app, 'views?': views }) {
    this.app = app;
    if (settings.https) {
      this.tls = true;
      this.settings = settings.https;
      this.createHttpsServer();
    } else if (settings.http) {
      this.settings = settings.http;
      this.createHttpServer();
    } else {
      throw new Error('No settings were provided for HTTP/HTTPS transport');
    }

    this.server.on('clientError', (...args) => this.handleClientError(...args));

    this.views = views;
    if (this.settings.static) {
      this.addStatic(this.settings.static);
    }
  }

  createHttpServer() {
    this.server = http.createServer(this.settings.server, (req, res) =>
      this.request(req, res)
    );
  }

  createHttpsServer() {
    this.server = https.createServer(this.settings.server, (req, res) =>
      this.request(req, res)
    );
  }

  handleClientError(error, socket) {
    const body = JSON.stringify({
      error: http.STATUS_CODES['400'],
      message: 'Client Error',
      statusCode: 400
    });
    this.error(error);
    socket.end(
      `HTTP/1.1 400 Bad Request\r\nContent-Length: ${body.length}\r\nContent-Type: application/json\r\n\r\n${body}`
    );
  }

  request(req, res) {
    if (req.headers.cookie) {
      req.headers.cookies = this.parseCookies(req.headers.cookie);
    }

    const requestMethod = req.method.toLowerCase();

    const message = {
      url: new URL(req.url, this.address),
      transport: 'http',
      decodeBy: req.headers['content-type'],
      encodeBy: req.headers.accept,
      requestHeaders: req.headers,
      requestMethod,
      request: req,
      connection: res
    };

    this.emit(`${requestMethod}${message.url.pathname}`, message);
  }

  parseCookies(str = '') {
    return cookie.parse(str);
  }

  serializeCookie(name, value, options) {
    return cookie.serialize(name, value, options);
  }

  addStatic(settings) {
    const url = settings.url || '/';
    settings.url = url[url.length - 1] === '/' ? url : `${url}/`;
    this.app.on(
      ['transport/http/head', 'transport/http/get'],
      `${settings.url}*`,
      serveStatic(settings)
    );
  }

  addViews(views) {
    for (const path in views) {
      this.addView(path, views[path]);
    }
  }

  addView(path, viewUnit) {
    if (!this.views) {
      throw Error('Views are not defined');
    }

    const view = this.views.require(viewUnit);
    this.app.on(`transport/http/get${path}`, (...args) => view.get(...args));
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(this.settings.listen, () => {
        this.server.off('error', reject);
        this.address = this.getAddress();
        resolve(this.address);
      });
    });
  }

  getAddress() {
    const address = this.server.address();
    // address can be null which is an "object"
    if (address && typeof address === 'object') {
      // IP socket
      const host =
        address.family === 'IPv6' ? `[${address.address}]` : address.address;
      const port = address.port;
      return `http${this.tls ? 's' : ''}://${host}:${port}`;
    }

    // UNIX socket
    return address;
  }

  stop() {
    if (!this.server.listening) {
      return Promise.resolve();
    }

    return new Promise(resolve => this.server.close(resolve));
  }

  send(message) {
    return new Promise((resolve, reject) => {
      const {
        connection,
        encodeBy,
        response,
        responseStatusCode = 200,
        responseHeaders
      } = message;
      if (connection.headersSent) {
        return reject(new Error('Response headers are already send.'));
      }

      const done = () => resolve(message);

      if (response === undefined || response === null) {
        return this.sendEmpty(message, done);
      }

      if (encodeBy && !connection.hasHeader('Content-Type')) {
        connection.setHeader('Content-Type', encodeBy);
      }

      if (typeof response.pipe === 'function') {
        return this.sendStream(message, done, reject);
      }

      if (!(typeof response === 'string' || Buffer.isBuffer(response))) {
        return reject(new Error(`Invalid response type ${typeof response}`));
      }

      const flatResponse = flatstr(response);
      connection.writeHead(responseStatusCode, {
        ...responseHeaders,
        'Content-Length': String(Buffer.byteLength(flatResponse))
      });
      connection.end(flatResponse, null, done);
    });
  }

  sendEmpty({ connection, responseStatusCode, responseHeaders }, done) {
    // according to https://tools.ietf.org/html/rfc7230#section-3.3.2
    // we cannot send a content-length for 304 and 204, and all status code
    // < 200.
    if (
      responseStatusCode >= 200 &&
      responseStatusCode !== 204 &&
      responseStatusCode !== 304
    ) {
      connection.setHeader('Content-Length', '0');
    }
    connection.writeHead(responseStatusCode, responseHeaders);
    // avoid ArgumentsAdaptorTrampoline from V8
    connection.end(null, null, done);
  }

  sendStream(
    { connection, responseStatusCode, responseHeaders, response },
    done,
    reject
  ) {
    connection.writeHead(responseStatusCode, responseHeaders);
    pipeline(response, connection, err => {
      if (err) {
        return reject(err);
      }

      done();
    });
  }
}

module.exports = HTTP;
