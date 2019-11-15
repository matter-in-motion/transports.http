const assert = require('assert');
const { resolve } = require('path');
const send = require('send');

function serveStatic({ url: rootUrl = '/', root, setHeaders, options }) {
  assert(
    typeof root === 'string',
    'root path is required and must be a string'
  );

  const opts = {
    maxage: 0,
    ...options,
    root: resolve(root)
  };

  return function serveStatic({ url, request, connection }) {
    const path = `/${url.pathname.split(rootUrl)[1]}`;
    const stream = send(request, path, opts);

    if (setHeaders) {
      stream.on('headers', setHeaders);
    }

    stream.pipe(connection);
  };
}

module.exports = serveStatic;
