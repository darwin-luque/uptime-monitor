/*
 * Request handlers
 */

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');

// Define the handlers
const handlers = {};

// Sample handler
handlers.ping = (data, callback) => {
  callback(200);
};

// Not found handler
handlers.notFound = (data, callback) => {
  callback(404);
};

// Users
handlers.users = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for the users submethods
handlers._users = {};

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = (data, callback) => {
  // Check that all required fields are filled out
  const { payload } = data;
  const firstName =
    typeof payload.firstName === 'string' && payload.firstName.trim().length > 0
      ? payload.firstName.trim()
      : false;
  const lastName =
    typeof payload.lastName === 'string' && payload.lastName.trim().length > 0
      ? payload.lastName.trim()
      : false;
  const phone =
    typeof payload.phone === 'string' && payload.phone.trim().length === 10
      ? payload.phone.trim()
      : false;
  const password =
    typeof payload.password === 'string' && payload.password.trim().length > 10
      ? payload.password.trim()
      : false;
  const tosAgreement =
    typeof payload.tosAgreement === 'boolean' && payload.tosAgreement
      ? true
      : false;

  if (firstName && lastName && phone && password && tosAgreement) {
    // Make sure that the user doesn't already exist
    _data.read('user', phone, (err, data) => {
      if (err) {
        // Hash the password
        const hashedPassword = helpers.hash(password);

        if (hashedPassword) {
          // Create the user object
          const userObject = {
            firstName,
            lastName,
            phone,
            hashedPassword,
            tosAgreement,
          };

          // Store the user
          _data.create('users', phone, userObject, (err) => {
            if (!err) {
              callback(200);
            } else {
              callback(500, { Error: 'Could not create this new user' });
            }
          });
        } else {
          callback(500, { Error: 'Error hashing the password' });
        }
      } else {
        callback(400, {
          Error: 'A user with that phone number already exist.',
        });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field(s)' });
  }
};

// Users - get
// Required data: phone
// Optional data: none
handlers._users.get = (data, callback) => {
  // Check that the phone number is valid
  const { queryStringObject, headers } = data;
  const phone =
    typeof queryStringObject.phone === 'string' &&
    queryStringObject.phone.trim().length === 10
      ? queryStringObject.phone.trim()
      : false;
  if (phone) {
    // Get a token from the headers
    const token = typeof headers.token === 'string' ? headers.token : false;
    handlers._tokens.verifyToken(token, phone, (isTokenValid) => {
      if (isTokenValid) {
        // Lookup the user
        _data.read('users', phone, (err, data) => {
          if (!err && data) {
            // Remove the hashed password befor returning in it to the requester
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404, { Error: 'User not found' });
          }
        });
      } else {
        callback(403, {
          Error:
            'Missing required token in header, token is invalid, or token already expired',
        });
      }
    });
  } else {
    callback(400, { Error: 'Missing required fields' });
  }
};

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
handlers._users.put = (data, callback) => {
  // Check for the required field
  const { payload } = data;
  const phone =
    typeof payload.phone === 'string' && payload.phone.trim().length === 10
      ? payload.phone.trim()
      : false;

  // Check for the optional fields
  const firstName =
    typeof payload.firstName === 'string' && payload.firstName.trim().length > 0
      ? payload.firstName.trim()
      : false;
  const lastName =
    typeof payload.lastName === 'string' && payload.lastName.trim().length > 0
      ? payload.lastName.trim()
      : false;
  const password =
    typeof payload.password === 'string' && payload.password.trim().length > 10
      ? payload.password.trim()
      : false;

  if (phone) {
    if (firstName || lastName || password) {
      // Get a token from the headers
      const token = typeof headers.token === 'string' ? header.token : false;

      // Check if the token is valid
      handlers._tokens.verifyToken(token, phone, (isTokenValid) => {
        if (isTokenValid) {
          // Look up the user
          _data.read('users', phone, (err, userData) => {
            if (!err && userData) {
              // Update the fields necessary
              if (firstName) {
                userData.firstName = firstName;
              }
              if (lastName) {
                userData.lastName = lastName;
              }
              if (password) {
                userData.hashedPassword = helpers.hash(password);
              }

              // Store the new updates
              _data.update('users', phone, userData, (err) => {
                if (!err) {
                  callback(200);
                } else {
                  callback(500, { Error: 'Could not update the user' });
                }
              });
            } else {
              callback(400, { Error: 'The specified user does not exist' });
            }
          });
        } else {
          callback(403, {
            Error:
              'Missing required token in header, token is invalid, or token already expired',
          });
        }
      });
    } else {
      callback(400, { Error: 'One of the optional should be past in' });
    }
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

// Users - delete
// Required field: phone
// Optional fields: none
handlers._users.delete = (data, callback) => {
  // Check that the phone number is valid
  const { queryStringObject, headers } = data;
  const phone =
    typeof queryStringObject.phone === 'string' &&
    queryStringObject.phone.trim().length === 10
      ? queryStringObject.phone.trim()
      : false;
  if (phone) {
    // Get a token from the headers
    const token = typeof headers.token === 'string' ? headers.token : false;
    handlers._tokens.verifyToken(token, phone, (isTokenValid) => {
      if (isTokenValid) {
        _data.read('users', phone, (err, userData) => {
          if (!err && userData) {
            _data.delete('users', phone, (err) => {
              if (!err) {
                // Delete each of the checks associated with the user
                const userChecks =
                  typeof userData.checks === 'object' &&
                  userData.checks instanceof Array
                    ? userData.checks
                    : [];
                if (userChecks.length > 0) {
                  let checksDeleted = 0;
                  let deletionError = false;
                  userChecks.forEach((checkId, _, allChecks) => {
                    _data.delete('checks', checkId, (err) => {
                      if (err) {
                        deletionError = true;
                      } else {
                        console.log(`${checkId} file deleted`);
                      }
                    });
                    checksDeleted++;
                    if (checksDeleted === allChecks.length) {
                      if (!deletionError) {
                        callback(200);
                      } else {
                        callback(500, {
                          Error:
                            'Error deleting the associated files to the user. Some files may have not been deleted succesfully',
                        });
                      }
                    }
                  });
                } else {
                  callback(200);
                }
              } else {
                callback(500, { Error: 'Could not delete the specified user' });
              }
            });
          } else {
            callback(400, { Error: 'User not found' });
          }
        });
      } else {
        callback(403, {
          Error:
            'Missing token in headers, token is invalid, or token already expired',
        });
      }
    });
  } else {
    callback(400, { Error: 'Missing required fields' });
  }
};

// Tokens
handlers.tokens = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Continer for all the tokens methods
handlers._tokens = {};

// Tokens - POST
// Required data: phone, password
// Optional data: none
handlers._tokens.post = (data, callback) => {
  const { payload } = data;
  const phone =
    typeof payload.phone === 'string' && payload.phone.trim().length === 10
      ? payload.phone.trim()
      : false;
  const password =
    typeof payload.password === 'string' && payload.password.trim().length > 10
      ? payload.password.trim()
      : false;
  if (phone && password) {
    _data.read('users', phone, (err, userData) => {
      if (!err && userData) {
        // Hash the sent password, and compare it to the password stored in the user object
        if (helpers.hash(password) === userData.hashedPassword) {
          const tokenID = helpers.createRandomToken(20);
          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObject = {
            phone,
            expires,
            tokenID,
          };

          // Store the token
          _data.create('tokens', tokenID, tokenObject, (err) => {
            if (!err) {
              callback(200, tokenObject);
            } else {
              callback(500, { Error: 'Could not create the new token' });
            }
          });
        } else {
          callback(400, {
            Error: "Password did not match the specified user's password",
          });
        }
      } else {
        callback(400, { Error: 'Could not find the specified user' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field(s)' });
  }
};

// Tokens - GET
// Required data: id
// Optional data: none
handlers._tokens.get = (data, callback) => {
  // Check that the id is valid
  const { queryStringObject } = data;
  const id =
    typeof queryStringObject.id === 'string' &&
    queryStringObject.id.trim().length === 20
      ? queryStringObject.id.trim()
      : false;
  if (id) {
    _data.read('tokens', id, (err, tokenData) => {
      if (!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404, { Error: 'Token not found' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

// Tokens - PUT
// Required data: id, extend
// Optional data: none
handlers._tokens.put = (data, callback) => {
  const { payload } = data;
  const id =
    typeof payload.id === 'string' && payload.id.trim().length === 20
      ? payload.id.trim()
      : false;
  const extend =
    typeof payload.extend === 'boolean' && payload.extend ? true : false;

  if (id && extend) {
    // Check to make sure the token isn't already expired
    _data.read('tokens', id, (err, tokenData) => {
      if (!err) {
        // Check the token hasn't expired
        if (tokenData.expires > Date.now()) {
          // Extend the expiration 1 more hour
          tokenData.expires = Date.now() * 1000 * 60 * 60;

          // Store the update
          _data.update('tokens', id, tokenData, (err) => {
            if (!err) {
              callback(200, {
                message: 'Token expiration time extended 1 hour from now',
              });
            } else {
              callback(500, { Error: 'Could not update the token' });
            }
          });
        } else {
          callback(400, { Error: 'Token has already expired' });
        }
      } else {
        callback(400, { Error: 'Could not find the specified token' });
      }
    });
  } else {
    callback(400, {
      Error: 'Missing required field(s) or field(s) are invalid',
    });
  }
};

// Tokens - DELETE
// Required data: id
// Optional data: none
handlers._tokens.delete = (data, callback) => {
  // Check that the id is valid
  const { queryStringObject } = data;
  const id =
    typeof queryStringObject.id === 'string' &&
    queryStringObject.id.trim().length === 20
      ? queryStringObject.id.trim()
      : false;
  if (id) {
    _data.read('tokens', id, (err, data) => {
      if (!err && data) {
        _data.delete('tokens', id, (err) => {
          if (!err) {
            callback(200);
          } else {
            callback(500, { Error: 'Could not delete the specified token' });
          }
        });
      } else {
        callback(400, { Error: 'Token not found' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required fields' });
  }
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = (id, phone, callback) => {
  // Lookup the token
  _data.read('tokens', id, (err, tokenData) => {
    if (!err && tokenData) {
      // Check that the token is for the given user and has not expired
      if (tokenData.phone === phone && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

// Checks
handlers.checks = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for all the checks method
handlers._checks = {};

// Checks - POST
// Required data: protocol, url, method, successCodes,timeoutSeconds
// Optional data: none
handlers._checks.post = (data, callback) => {
  const { payload, headers } = data;
  const protocol =
    typeof payload.protocol === 'string' &&
    ['http', 'https'].indexOf(payload.protocol.trim()) > -1
      ? payload.protocol.trim()
      : false;
  const url =
    typeof payload.url === 'string' && payload.url.trim().length > 0
      ? payload.url.trim()
      : false;
  const method =
    typeof payload.method === 'string' &&
    ['get', 'post', 'put', 'delete'].indexOf(payload.method) > -1
      ? payload.method
      : false;
  const successCodes =
    typeof payload.successCodes === 'object' &&
    payload.successCodes instanceof Array &&
    payload.successCodes.length > 0
      ? payload.successCodes
      : false;
  const timeoutSeconds =
    typeof payload.timeoutSeconds === 'number' &&
    payload.timeoutSeconds % 1 === 0 &&
    payload.timeoutSeconds >= 1 &&
    payload.timeoutSeconds <= 5
      ? payload.timeoutSeconds
      : false;

  if (protocol && url && method && successCodes && timeoutSeconds) {
    // Get the token from the header
    const token = typeof headers.token === 'string' ? headers.token : false;
    if (token) {
      // Lookup for the user given the past in token
      _data.read('tokens', token, (err, tokenData) => {
        if (!err && tokenData) {
          const userPhone = tokenData.phone;
          handlers._tokens.verifyToken(token, userPhone, (isTokenValid) => {
            if (isTokenValid) {
              // Look up the user data
              _data.read('users', userPhone, (err, userData) => {
                if (!err && userData) {
                  const userChecks =
                    typeof userData.checks === 'object' &&
                    userData.checks instanceof Array
                      ? userData.checks
                      : [];

                  // Verify that the user has less than the valid amount of checks
                  if (userChecks.length < config.maxChecks) {
                    // Create a random id for the check
                    const checkID = helpers.createRandomToken(20);

                    // Create the check object, and include the user's phone
                    const checkObject = {
                      userPhone,
                      protocol,
                      url,
                      method,
                      successCodes,
                      timeoutSeconds,
                      id: checkID,
                    };

                    // Save the object
                    _data.create('checks', checkID, checkObject, (err) => {
                      if (!err) {
                        userData.checks = userChecks;
                        userData.checks.push(checkID);

                        // Save the new user data
                        _data.update('users', userPhone, userData, (err) => {
                          if (!err) {
                            // Return the data about the new check
                            callback(200, checkObject);
                          } else {
                            callback(500, {
                              Error:
                                'Could not update the user with the new check',
                            });
                          }
                        });
                      } else {
                        callback(500, {
                          Error: 'Could not create the new check',
                        });
                      }
                    });
                  } else {
                    callback(400, {
                      Error: `The user alraedy used the maximum number of checks allowed. Number of checks is ${config.maxChecks}`,
                    });
                  }
                } else {
                  callback(403, { Error: 'User not found' });
                }
              });
            } else {
              callback(403, { Error: 'Token already expired' });
            }
          });
        } else {
          callback(403, { Error: 'Token not found' });
        }
      });
    } else {
      callback(403, { Error: 'Token not past in headers' });
    }
  } else {
    callback(403, {
      Error: 'Missing required filed(s) or invalid values in field(s)',
    });
  }
};

// Checks - GET
// Required data: id
// Optional data: none
handlers._checks.get = (data, callback) => {
  // Check that the id is valid
  const { queryStringObject, headers } = data;
  const id =
    typeof queryStringObject.id === 'string' &&
    queryStringObject.id.trim().length === 20
      ? queryStringObject.id.trim()
      : false;
  if (id) {
    // Lookup the check
    _data.read('checks', id, (err, checkData) => {
      if (!err && checkData) {
        // Get a token from the headers
        const token = typeof headers.token === 'string' ? headers.token : false;

        // Verify that the give token is valid and belongs to the person doing the get request
        handlers._tokens.verifyToken(
          token,
          checkData.userPhone,
          (isTokenValid) => {
            if (isTokenValid) {
              // Lookup the user
              callback(200, checkData);
            } else {
              callback(403, {
                Error:
                  'Missing required token in header, token is invalid, or token already expired',
              });
            }
          }
        );
      } else {
        callback(404, { Error: 'Check not found' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required fields' });
  }
};

// Checks - PUT
// Required data: id
// Optional data: protocol, url, method, successCodes timeoutSecond (At least one should be past in)
handlers._checks.put = (data, callback) => {
  const { payload, headers } = data;

  // Check the optional fields
  const id =
    typeof payload.id === 'string' && payload.id.trim().length === 20
      ? payload.id.trim()
      : false;

  // Check for the required field
  const protocol =
    typeof payload.protocol === 'string' &&
    ['http', 'https'].indexOf(payload.protocol.trim()) > -1
      ? payload.protocol.trim()
      : false;
  const url =
    typeof payload.url === 'string' && payload.url.trim().length > 0
      ? payload.url.trim()
      : false;
  const method =
    typeof payload.method === 'string' &&
    ['get', 'post', 'put', 'delete'].indexOf(payload.method) > -1
      ? payload.method
      : false;
  const successCodes =
    typeof payload.successCodes === 'object' &&
    payload.successCodes instanceof Array &&
    payload.successCodes.length > 0
      ? payload.successCodes
      : false;
  const timeoutSeconds =
    typeof payload.timeoutSeconds === 'number' &&
    payload.timeoutSeconds % 1 === 0 &&
    payload.timeoutSeconds >= 1 &&
    payload.timeoutSeconds <= 5
      ? payload.timeoutSeconds
      : false;

  // Check if the required field was past in
  if (id) {
    // Check if one of the optional fields were past in
    if (url || method || successCodes || timeoutSeconds) {
      // Lookup the check
      _data.read('checks', id, (err, checkData) => {
        if (!err && checkData) {
          const token =
            typeof headers.token === 'string' ? headers.token : false;
          handlers._tokens.verifyToken(
            token,
            checkData.userPhone,
            (isTokenValid) => {
              if (isTokenValid) {
                // Update the check were necesarry
                if (protocol) checkData.protocol = protocol;
                if (url) checkData.url = url;
                if (method) checkData.method = method;
                if (successCodes) checkData.successCodes = successCodes;
                if (timeoutSeconds) checkData.timeoutSeconds = timeoutSeconds;

                // Store the updates
                _data.update('checks', id, checkData, (err) => {
                  if (!err) {
                    callback(200);
                  } else {
                    callback(500, { Error: 'Could not update the check' });
                  }
                });
              } else {
                callback(403, {
                  Error: 'Invalid token for the required check',
                });
              }
            }
          );
        } else {
          callback(400, { Error: "Check id doesn't exist" });
        }
      });
    } else {
      callback(400, { Error: 'One of the optional should be past in' });
    }
  } else {
    callback(400, { Error: 'Missing required field' });
  }
};

// Checks - DELETE
// Required data: id
// Optional data: none
handlers._checks.delete = (data, callback) => {
  // Check that the id is valid
  const { queryStringObject, headers } = data;
  const id =
    typeof queryStringObject.id === 'string' &&
    queryStringObject.id.trim().length === 20
      ? queryStringObject.id.trim()
      : false;
  if (id) {
    // Lookup the check
    _data.read('checks', id, (err, checkData) => {
      if (!err && checkData) {
        // Get a token from the headers
        const token = typeof headers.token === 'string' ? headers.token : false;
        handlers._tokens.verifyToken(
          token,
          checkData.userPhone,
          (isTokenValid) => {
            if (isTokenValid) {
              // Delete the check data
              _data.delete('checks', id, (err) => {
                if (!err) {
                  _data.read('users', checkData.userPhone, (err, userData) => {
                    if (!err && userData) {
                      const userChecks =
                        typeof userData.checks === 'object' &&
                        userData.checks instanceof Array
                          ? userData.checks
                          : [];

                      // Remove the delete check from their list of checks
                      const checkPosition = userChecks.indexOf(id);
                      if (checkPosition > -1) {
                        userChecks.splice(checkPosition, 1);

                        userData.checks = userChecks;
                        // Resave the user data
                        _data.update(
                          'users',
                          checkData.userPhone,
                          userData,
                          (err) => {
                            if (!err) {
                              callback(200);
                            } else {
                              callback(500, {
                                Error:
                                  'Could update the user object after removing the deleted check',
                              });
                            }
                          }
                        );
                      } else {
                        callback(500, {
                          Error: 'Could not find the check on the user object',
                        });
                      }
                    } else {
                      callback(500, {
                        Error:
                          "Could not find the user, so couldn't delete the check",
                      });
                    }
                  });
                } else {
                  callback(500, { Error: 'Could not delete the check data' });
                }
              });
            } else {
              callback(403, {
                Error:
                  'Missing token in headers, token is invalid, or token already expired',
              });
            }
          }
        );
      } else {
        callback(400, { Error: 'The scpecified check ID does not exist' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required fields' });
  }
};

module.exports = handlers;
