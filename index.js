/*
 * Primary file for the API
 */

// Dependecies
const http = require('http');
const url = require('url');
const { StringDecoder } = require('string_decoder');

// The server should respond to all requests with a string
const server = http.createServer((req, res) => {
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

    //
    // Send the reponse
    res.end('Hello World\n');

    // Log the request path
    console.log(
      `Request received on this path: ${trimmedPath}. The method was: ${method}. Querys string parameters:`
    );
    console.log(queryStringObject);
    console.log('The headers are: ');
    console.log(headers);
    console.log('Request received with this payload: ' + buffer);
  });
});

// Start the server, and have it listen on port 5050
const port = 5050;
server.listen(port, function () {
  console.log(`The servers is listening on port ${port}.`);
});
