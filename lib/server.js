/*
 * Server file for the API
 */

// Dependecies
const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { StringDecoder } = require('string_decoder');
const config = require('./config');
const handlers = require('./handlers');
const helpers = require('./helpers');
const debug = require('util').debuglog('workers');

// Instantiate the server module object
const server = {};

// Instantiate HTTP server
server.httpServer = http.createServer((req, res) => {
  server.unifiedServer(req, res);
});

// Instantiate the HTTPS server
server.httpsServerOption = {
  key: fs.readFileSync(path.join(__dirname, '../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../https/cert.pem')),
};
server.httpsServer = https.createServer(server.httpsServerOption, (req, res) => {
  server.unifiedServer(req, res);
});

// All the server logic for both the http and https server
server.unifiedServer = (req, res) => {
  // Get the url and parse it
  const parsedUrl = url.parse(req.url, true);

  // Get the path
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');

  //Get the query string as an object
  const queryStringObject = parsedUrl.query;

  // Get the HTTP Method
  const method = req.method.toLowerCase();

  // Get the headers as an object
  const headers = req.headers;

  // Get the payload, if any
  const decoder = new StringDecoder('utf-8');
  let buffer = '';
  req.on('data', (data) => {
    buffer += decoder.write(data);
  });

  req.on('end', () => {
    buffer += decoder.end();

    // Choose the handler this request should go to
    // If not found any, use the notFound handler
    const choseHandler =
      typeof server.router[trimmedPath] !== 'undefined'
        ? server.router[trimmedPath]
        : handlers.notFound;

    // Construct the data object to send to the handler
    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: helpers.parseJsonToObject(buffer),
    };

    // Route the request to the handler specified in the router
    choseHandler(data, (statusCode, payload) => {
      // Use the status code called back by the handler, or default to 200
      statusCode = typeof statusCode === 'number' ? statusCode : 200;

      // Use the payload called back by the handler, or use an empty object
      payload = typeof payload === 'object' ? payload : {};

      // Convert the payload to a string_decoder
      const payloadString = JSON.stringify(payload);

      // Return the response
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(statusCode);
      res.end(payloadString);

      // If the response is 200, otherwise print red
      let color = '\x1b[31m%s\x1b[0m';
      if(statusCode == 200 || statusCode === 201) color = '\x1b[32m%s\x1b[0m'
      
      // Print out the response
      debug(color, `${method.toUpperCase()} /${trimmedPath} ${statusCode}`)
    });
  });
};

// Define a request router
server.router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks,
};

// Init script
server.init = () => {
  // Start the http server
  server.httpServer.listen(config.httpPort, () => {
    console.log('\x1b[36m%s\x1b[0m', `The http server is listening on port ${config.httpPort}`);
  });

  // Start the HTTPS server
  server.httpsServer.listen(config.httpsPort, () => {
    console.log('\x1b[35m%s\x1b[0m', `The https server is listening on port ${config.httpsPort}`);
  });
}

module.exports = server;
