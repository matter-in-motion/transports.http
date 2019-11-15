# Matter In Motion

[![NPM Version](https://img.shields.io/npm/v/@matter-in-motion/transports.http.svg?style=flat-square)](https://www.npmjs.com/package/@matter-in-motion/transports.http)
[![NPM Downloads](https://img.shields.io/npm/dt/@matter-in-motion/transports.http.svg?style=flat-square)](https://www.npmjs.com/package/@matter-in-motion/transports.http)

**Node.js framework for building applications (cli, server, etc...).**

## HTTP Transport

Matter In Motion transport extension for HTTP/S protocol.

### Installation

- `npm i @matter-in-motion/trasnport`
- `npm i @matter-in-motion/trasnports.http`

### Usage

1. Add it to your extensions in the settings.
2. Add settings

### Message

Message is simple object that get passed through app. By coming out of this transport it has this properties:

- **url** - instance of the URL class
- **decodeBy** - mime, `Content-Type` header
- **encodeBy** - mime, `Accept` header
- **requestHeaders** - http request headers with parsed cookies if avaliable
- **requestMethod** - http request method
- **request** - body of the request
- **connection** – http response

### Response

To sent response you can set following properties and use `transport.send` method.

- **response** – `undefined`, `null`, `string`, `Buffer`, or `stream`
- responseStatusCode – http response status code
- responseHeaders - response headers

### Settings

- **http/https** - make just one
  - server – `http.createServer` settings
  - **listen** – `http.listen` settings
  - static -
    - url – static url
    - root – static root directory
    - setHeaders – function to set custom headers on response. Alterations to the headers need to occur synchronously.
    - options – [send](https://www.npmjs.com/package/send#options) module options

Minimal settings:

```
settings.http = {
  listen: {
    host: '0.0.0.0',
    port: 3000
  }
}
```

License: MIT.
