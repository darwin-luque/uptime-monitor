/*
 * Workers-related tasks
 */

// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const _data = require('./data');
const helpers = require('./helpers');
const _logs = require('./logs');

// Instantiate the worker object
const workers = {};

// Look up all the checks, get their data, send to a validator
workers.gatherAllChecks = () => {
  // Get all the checks
  _data.list('checks', (err, checks) => {
    if (!err && checks && checks.length > 0) {
      checks.forEach((check) => {
        // Read in the check data
        _data.read('checks', check, (err, originalCheckData) => {
          if (!err && originalCheckData) {
            // Pass it to the check validator, and let that dunction continue or log errors as needed
            workers.validateCheckData(originalCheckData);
          } else {
            console.log(`Error reading the check ${check}`);
          }
        });
      });
    } else {
      console.log('Error: Could not find any checks to process');
    }
  });
};

// Sanity checking the Check data
workers.validateCheckData = (checkData) => {
  checkData =
    typeof checkData === 'object' && checkData !== null ? checkData : {};
  checkData.id =
    typeof checkData.id === 'string' && checkData.id.trim().length === 20
      ? checkData.id.trim()
      : false;
  checkData.userPhone =
    typeof checkData.userPhone === 'string' &&
    checkData.userPhone.trim().length === 8
      ? checkData.userPhone.trim()
      : false;
  checkData.protocol =
    typeof checkData.protocol === 'string' &&
    ['http', 'https'].indexOf(checkData.protocol) > -1
      ? checkData.protocol
      : false;
  checkData.url =
    typeof checkData.url === 'string' && checkData.url.trim().length > 0
      ? checkData.url.trim()
      : false;
  checkData.method =
    typeof checkData.method === 'string' &&
    ['get', 'post', 'put', 'delete'].indexOf(checkData.method) > -1
      ? checkData.method
      : false;
  checkData.successCodes =
    typeof checkData.successCodes === 'object' &&
    checkData.successCodes instanceof Array &&
    checkData.successCodes.length > 0
      ? checkData.successCodes
      : false;
  checkData.timeoutSeconds =
    typeof checkData.timeoutSeconds === 'number' &&
    checkData.timeoutSeconds % 1 === 0 &&
    checkData.timeoutSeconds > 0 &&
    checkData.timeoutSeconds < 6
      ? checkData.timeoutSeconds
      : false;

  // Set the keys that may not be set (if the workers have never seen this check before)
  checkData.state =
    typeof checkData.protocol === 'string' &&
    ['up', 'down'].indexOf(checkData.protocol) > -1
      ? checkData.protocol
      : 'down';
  checkData.lastCheck =
    typeof checkData.lastCheck === 'number' &&
    checkData.lastCheck % 1 === 0 &&
    checkData.lastCheck > 0
      ? checkData.lastCheck
      : false;

  // If all the checks pass, pass the data along to the nex step in process
  let flag = true;
  for (key in checkData) {
    if (key === 'lastCheck') continue;
    flag = flag && checkData[key];
  }

  if (flag) {
    workers.performCheck(checkData);
  } else {
    console.log(
      'Error: One of the checks is not properly formatted. Skipping it.'
    );
  }
};

// Perform the check, send the checkData and the outcome of the check process, to the next step in the process
workers.performCheck = (checkData) => {
  // Prepare the initial check outcome
  const checkOutcome = {
    error: false,
    responseCode: false,
  };

  // Mark that the outcome has not been sent yet
  let outcomeSent = false;

  // Parse the hostname and the path out of the original check data
  const parsedUrl = url.parse(`${checkData.protocol}://${checkData.url}`, true);
  const { path, hostname } = parsedUrl; // Using path and not "pathname" because we want the query string

  // Construct the request
  const { protocol, method, timeoutSeconds } = checkData;
  const requestDetails = {
    protocol: `${protocol}:`,
    hostname,
    method: method.toUpperCase(),
    path,
    timeout: timeoutSeconds * 1000,
  };

  // Instantiate the request object (using either the http or https module)
  const _moduleToUse = protocol === 'https' ? https : http;

  const req = _moduleToUse.request(requestDetails, (res) => {
    // Grab the status of the sent request
    const { statusCode } = res;

    // Update the checkOutcome and pass the data along
    checkOutcome.responseCode = statusCode;
    if (!outcomeSent) {
      workers.processCheckOutcome(checkData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the error event so it doesn't get thrown
  req.on('error', (e) => {
    // Update the checkOutcome and pass the data along
    checkOutcome.error = {
      error: true,
      value: e,
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(checkData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the error event so it doesn't get thrown
  req.on('timeout', (e) => {
    // Update the checkOutcome and pass the data along
    checkOutcome.error = {
      error: true,
      value: 'timeout',
    };

    if (!outcomeSent) {
      workers.processCheckOutcome(checkData, checkOutcome);
      outcomeSent = true;
    }
  });

  // End the request
  req.end();
};

// Process the check outcome, update the check data as needed, and trigger an alert to the user if changed
// Special logic for accomodating a check that has never been tested before
workers.processCheckOutcome = (checkData, checkOutcome) => {
  // Decide if the check is considered up or down
  const state =
    !checkOutcome.error &&
    checkOutcome.responseCode &&
    checkData.successCodes.indexOf(checkOutcome.responseCode) > -1
      ? 'up'
      : 'down';

  // Decide if an alert is wanted
  const alertWarranted =
    checkData.lastCheck && checkData.state !== state ? true : false;

  
  // Log the outcome
  const timeOfCheck = Date.now();
  workers.log(checkData, checkOutcome, state, alertWarranted, timeOfCheck);

  // Update the check data
  const newCheckData = checkData;
  newCheckData.state = state;
  newCheckData.lastCheck = timeOfCheck;

  // Save the updates
  _data.update('checks', newCheckData.id, newCheckData, (err) => {
    if (!err) {
      if (alertWarranted) {
        workers.alertUserToStatusChange(newCheckData);
      } else {
        console.log('No change occured! No need to alarm!')
      }
    } else {
      console.log('Error: Could not update the check Data information');
    }
  });
};

workers.alertUserToStatusChange = (checkData) => {
  const { method, protocol, url, state, userPhone } = checkData;
  const msg = `Alert! Your chech for ${method.toUpperCase()} ${protocol}://${url} is currently ${state}.`;
  helpers.sendTwilioSms(userPhone, msg, (err) => {
    if (!err) {
      console.log(
        'Message sent! User alerted to a status code change in ther check, via sms. ' +
          msg
      );
    } else {
      console.log("Could not send sms alert to the user who's check changed!");
    }
  });
};

// Create a log file
workers.log = (checkData, checkOutcome, state, alertWarranted, timeOfCheck) => {
  // Form the log data
  var logData = {
    check: checkData,
    outcome: checkOutcome,
    state,
    alert: alertWarranted,
    time: timeOfCheck,
  };

  // Convert data to a string
  const logString = JSON.stringify(logData);

  // Determine the name of the log file
  const logFileName = checkData.id;

  // Append the log string to the file
  _logs.append(logFileName, logString, (err) => {
    if (!err) {
      console.log("Logging to file succeded.");
    } else {
      console.log('Error appending to the log file.')
    }
  })
}

// Timer to execute the worker-process one per minute
workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 *5);
};

// Init Script
workers.init = () => {
  // Execute all the checks immediately
  workers.gatherAllChecks();

  // Call the loop so the checks will execute later on
  workers.loop();
};

// Export the module
module.exports = workers;
