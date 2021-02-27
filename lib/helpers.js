/*
 * Helepers for various tasks
 */

// Dependencies
const crypto = require('crypto');
const config = require('./config');

// Container for all the helpers
helpers = {};

// Create a SHA256 hash
helpers.hash = (pass) => {
  if (typeof pass === 'string' && pass.length > 0) {
    return crypto
      .createHmac('sha256', config.hashingSecret)
      .update(pass)
      .digest('hex');
  } else {
    return false;
  }
};

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = (str) => {
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
};

// Create a string of random alphanumeric characters
helpers.createRandomToken = (keyLength) => {
  if (typeof keyLength !== 'number') return false;
  const keys = 'abcdefghiklmnopqrstuvwxyz1234567890';
  let res = '';
  for (let i=0; i < keyLength; i++) {
    res += keys[Math.floor(Math.random() * keys.length)];
  }
  return res;
}

// Export the module
module.exports = helpers;
