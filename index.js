/*
* Primary file for the API
*/

// Dependecies
const http = require('http');
const url = require('url');

// The server should respond to all requests with a string
const server = http.createServer(function(req, res) {
    // Get the url and parse it
    const parsedUrl = url.parse(req.url, true);

    // Get the path
    const path = parsedUrl.pathname
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // Get the HTTP Method
    const method = req.method.toLowerCase();

    // Send the reponse
    res.end('Hello World\n');

    // Log the request path
    console.log(`Request received on this path: ${trimmedPath}. The method was: ${method}`);
});

// Start the server, and have it listen on port 5050
const port = 5050;
server.listen(port, function() {
    console.log(`The servers is listening on port ${port}.`)
})