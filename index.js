/**
 * Primary file for the API
 */

 // Dependecies
 const http = require('http');

// The server should respond to all requests with a string
const server = http.createServer(function(req, res) {
    res.end('Hello World\n');
});

// Start the server, and have it listen on port 5050
const port = 5050;
server.listen(port, function() {
    console.log(`The servers is listening on port ${port}.`)
})