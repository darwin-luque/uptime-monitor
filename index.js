/*
 * Primary file for the API
 */

// Dependecies
const server = require('./lib/server');
const workers = require('./lib/workers');

// Declare the app
const app = {};

// Init function
app.init = () => {
  // Start the server
  server.init();

  // Start the workers
  workers.init();
};

// Execute init function
app.init();

module.exports = app;
