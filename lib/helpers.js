/*
 * Helepers for various tasks
 */

// Dependencies
const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring')
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
  for (let i = 0; i < keyLength; i++) {
    res += keys[Math.floor(Math.random() * keys.length)];
  }
  return res;
};

// Send an SMS message via Twilio
helpers.sendTwilioSms = (phone, msg, callback) => {
  // Validate parameters
  phone = typeof phone === 'string' && phone.length === 8 ? phone : false;
  msg =
    typeof msg === 'string' &&
    msg.trim().length > 0 &&
    msg.trim().length <= 1600
      ? msg.trim()
      : false;
  
  // Check if params are valid
  if(msg && phone) {
    // Configure the request payload
    const payload = {
      From: config.twilio.fromPhone,
      To: '+504' + phone,
      Body: msg,
    }

    // Stringify the payload
    const stringPayload = querystring.stringify(payload);

    // Congigure the request details
    const requestDetails = {
      protocol: 'https:',
      hostname: 'api.twilio.com',
      method: 'POST',
      path: `/2020-04-01/Accounts/${config.twilio.accountSid}/Message.json`,
      auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload),
      },
    };

    // Instantite the request object
    const req = https.request(requestDetails, (res) => {
      // Grab the status of the sent request
      const { statusCode } = res;

      // Callback succesfully if the request went through
      if (statusCode === 200 || statusCode === 201) {
        callback(false);
      } else {
        callback('Status code return by twilio was ' + statusCode);
      }
    });

    // Bind to the error event so it doesn't get thrown
    req.on('error', (err) => {
      callback(err);
    });

    // Add the payload
    req.write(stringPayload);

    // End the request
    req.end();

  } else {
    callback('Given parameters were missing or invalid');
  }
};

// Export the module
module.exports = helpers;
