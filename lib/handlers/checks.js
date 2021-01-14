/**
 * Checks handlers
*/

// Dependencies
const _data = require('../data');
const helpers = require('../helpers');
const config = require('../config');

// Checks handler
let checks = (data, callback) => {
    const acceptableMethods = ['post','get','put', 'delete'];
    if(acceptableMethods.indexOf(data.method) > -1) {
        _checks[data.method](data, callback);
    } else {
        callback(405, {Error: 'Method not allowed'});
    }
};

// Container for Checks submethods
let _checks = {};

// Checks - post
// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none
_checks.post = (data, callback) => {
    // Validate inputs
    let protocol = typeof(data.payload.protocol) === "string" && ['http', 'https'].includes(data.payload.protocol) ? data.payload.protocol : false;
    let url = typeof(data.payload.url) === "string" && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    let method = typeof(data.payload.method) === "string" && ['post', 'get', 'put', 'delete'].includes(data.payload.method) ? data.payload.method : false;
    let successCodes = typeof(data.payload.successCodes) === "object" && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    let timeoutSeconds = typeof(data.payload.timeoutSeconds) === "number" && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 && data.payload.timeoutSeconds % 1 === 0 ? data.payload.timeoutSeconds : false;

    if (protocol && url && method && successCodes && timeoutSeconds) {
        // Get the token from the headers
        let token = typeof(data.headers.token) === "string" ? data.headers.token : false;

        // Look up the user by reading the token
        _data.read('tokens', token, (err, tokenData) => {
            if(!err && tokenData) {
                let userPhone = tokenData.phone;

                // Look up the user data
                _data.read('users', userPhone, (err, userData) => {
                    if(!err && userData) {
                        let userChecks = typeof(userData.checks) === "object" && userData.checks instanceof Array ? userData.checks : [];

                        // Verify that the user has less than the number of max checks per user
                        if(userChecks.length < config.maxChecks) {
                            // Create a random id for the check
                            let checkId = helpers.createRandomString(20);

                            // Create the check object and include the user's phone
                            let checkObject = {
                                id: checkId,
                                userPhone,
                                protocol,
                                url,
                                method,
                                successCodes,
                                timeoutSeconds,
                            };

                            // Save the object
                            _data.create('checks', checkId, checkObject, err => {
                                if(!err) {
                                    // Add the checkId to the user's object
                                    userData.checks = userChecks;
                                    userData.checks.push(checkId);

                                    // Save the new user data
                                    _data.update('users', userPhone, userData, err => {
                                        if (!err) {
                                            // Return the data about the new check to the requester
                                            callback(200, checkObject);
                                        } else {
                                            callback(500, {Error: "Could not update the user with the new check"});
                                        }
                                    })
                                } else {
                                    callback(500, {Error: "Could not create the new check"})
                                }
                            })
                        } else {
                            callback(400, {Error: `The user already has the maximum number of checks (${config.maxChecks})`});
                        }
                    } else {
                        callback(403);
                    }
                })
            } else {
                callback(403);
            }
        })
    } else {
        callback(400, {Error: "Missing required inputs or inputs are invalid"})
    }
}

// Checks - get


// Checks - put


// Checks - delete




module.exports = {
    checks,
    _checks,
}