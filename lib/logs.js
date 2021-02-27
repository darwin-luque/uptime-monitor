/*
 * Library for storing and rotating logs
 */

// Dependencies
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Container for the module
const lib = {};

lib.baseDir = path.join(__dirname, '../.logs/');

// Append a string to a file. Create the if it does not exist.
lib.append = (file, str, callback) => {
  // Open the file for appending
  fs.open(lib.baseDir + file + '.log', 'a', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      // Apend to the file
      fs.appendFile(fileDescriptor, str + '\n', (err) => {
        if (!err) {
          fs.close(fileDescriptor, (err) => {
            if (!err) {
              callback(false);
            } else {
              callback('Error closing the log file');
            }
          });
        } else {
          callback('Error appending the data to the file');
        }
      });
    } else {
      callback('Could not open file for appending');
    }
  });
};

// Export the module
module.exports = lib;
