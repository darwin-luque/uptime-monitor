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
const debug = require('util').debuglog('workers');

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
            debug(`Error reading the check ${check}`);
          }
        });
      });
    } else {
      debug('Error: Could not find any checks to process');
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
    typeof checkData.state === 'string' &&
    ['up', 'down'].indexOf(checkData.state) > -1
      ? checkData.state
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
    debug(
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
  let newCheckData = checkData;
  newCheckData.state = state;
  newCheckData.lastCheck = timeOfCheck;

  // Save the updates
  _data.update('checks', newCheckData.id, newCheckData, (err) => {
    if (!err) {
      if (alertWarranted) {
        workers.alertUserToStatusChange(newCheckData);
      } else {
        debug('No change occured! No need to alarm!')
      }
    } else {
      debug('Error: Could not update the check Data information');
    }
  });
};

workers.alertUserToStatusChange = (checkData) => {
  const { method, protocol, url, state, userPhone } = checkData;
  const msg = `Alert! Your chech for ${method.toUpperCase()} ${protocol}://${url} is currently ${state}.`;
  helpers.sendTwilioSms(userPhone, msg, (err) => {
    if (!err) {
      debug(
        'Message sent! User alerted to a status code change in ther check, via sms. ' +
          msg
      );
    } else {
      debug("Could not send sms alert to the user who's check changed!");
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
      debug("Logging to file succeded.");
    } else {
      debug('Error appending to the log file.')
    }
  })
}

// Timer to execute the worker-process one per minute
workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * 60);
};

// Timer to eecute the log-rotation process once per day
workers.logRotationLoop = () => {
  setInterval(() => {
    workers.rotateLogs();
  }, 1000 * 60 * 60 * 24);
}

// Rotate (Compress) the log files
workers.rotateLogs = () => {
  // List all the non-compressed log file
  _logs.list(false, (err, logs) => {
    if (!err && logs && logs.length > 0) {
      logs.forEach(logName => {
        // Compress the data to a different file
        const logId = logName.replace('.log', '');
        const newFileId = `${logId}-${Date.now()}`;
        _logs.compress(logId, newFileId, (err) => {
          if (!err) {
            // Truncate the log
            _logs.truncate(logId, (err) => {
              if (!err) {
                debug('Success truncating logFile');
              } else {
                debug('Error truncating log file');
              }
            });
          } else {
            debug('Error compressing on of the log files', err);
          }
        })
      })
    } else {
      debug('Error: Could not find any logs to rotate');
    }
  })
}

// Init Script
workers.init = () => {
  // Send to console with a color
  console.log('\x1b[34m%s\x1b[0m', 'Background workers are running');

  // Execute all the checks immediately
  workers.gatherAllChecks();

  // Call the loop so the checks will execute later on
  workers.loop();

  // Compress all the logs immediately
  workers.rotateLogs();

  // Call the compression loop so logs will be compressed later on
  workers.logRotationLoop();
};

// Export the module
module.exports = workers;
