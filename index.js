'use strict';
const Http = require('./http');

module.exports = () => ({
  transports: { http: new Http() }
})
