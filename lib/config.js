/*
 * Create and export configuration vairables
 */

//Container for all the environments
const environments = {};

// Staging {default} environment
environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: 'staging',
  hashingSecret: 'thisIsASecret',
  maxChecks: 5,
  twilio: {
    accountSid : 'ACb32d411ad7fe886aac54c665d25e5c5d',
    authToken : '9455e3eb3109edc12e3d8c92768f7a67',
    fromPhone : '+50433251869',
  }
};

// Production environment
environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: 'production',
  hashingSecret: 'thisIsAlsoASecret',
  maxChecks: 5,
  twilio: {
    accountSid : 'ACb32d411ad7fe886aac54c665d25e5c5d',
    authToken : '9455e3eb3109edc12e3d8c92768f7a67',
    fromPhone : '+50433251869',
  }
};

// Determine which environment was passed as a command-line argument
const currentEnvironment =
  typeof process.env.NODE_ENV === 'string'
    ? process.env.NODE_ENV.toLowerCase()
    : '';

// Check that the current environment is one of the enironments above, if not, default staging
const environmentToExport =
  typeof environments[currentEnvironment] === 'object'
    ? environments[currentEnvironment]
    : environments.staging;

// Export the module
module.exports = environmentToExport;
