/**
 * Checks handlers
*/

// Dependencies
const _data = require('../data');
const helpers = require('../helpers');
const config = require('../config');
const _tokens = require('./tokens')._tokens;

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
// Required data: id
// Optional data: none
_checks.get = (data, callback) => {
    // Check that the id is valid
    let id = typeof(data.queryStringObject.get('id')) === "string" && data.queryStringObject.get('id').trim().length === 20 ? data.queryStringObject.get('id').trim() : false;
    
    if(id) {
        
        // Lookup the check
        _data.read('checks', id, (err, checkData) => {
            if(!err && checkData) {

                // Get the token from the headers
                let token = typeof(data.headers.token) === "string" ? data.headers.token : false;

                // Verify that the given token is valid and belongs to the user who created the check
                _tokens.verifyToken(token, checkData.userPhone, tokenIsValid => {
                    if(tokenIsValid) {  
                        // Return the check info
                        callback(200, checkData)
                    } else {
                        callback(403);
                    }
                });
            } else {
                callback(404);
            }
        });
        
    } else {
        callback(400, {Error: 'Missing required field'})
    }
}

// Checks - put
// Required data: id
// Optional data: protocol, url, method, successCodes, timeoutSeconds (one must be sent)
_checks.put = (data, callback) => {
    // Check for the required field
    let id = typeof(data.payload.id) === "string" && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false;

    // Check for the optional fields 
    let protocol = typeof(data.payload.protocol) === "string" && ['http', 'https'].includes(data.payload.protocol) ? data.payload.protocol : false;
    let url = typeof(data.payload.url) === "string" && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    let method = typeof(data.payload.method) === "string" && ['post', 'get', 'put', 'delete'].includes(data.payload.method) ? data.payload.method : false;
    let successCodes = typeof(data.payload.successCodes) === "object" && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    let timeoutSeconds = typeof(data.payload.timeoutSeconds) === "number" && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 && data.payload.timeoutSeconds % 1 === 0 ? data.payload.timeoutSeconds : false;

    // Check to make sure id is valid
    if(id) {
        // Check to make sure one or more of the required fields has been sent
        if(protocol || url || method || successCodes || timeoutSeconds) {
            // Look up the check
            _data.read('checks', id, (err, checkData) => {
                if(!err && checkData) {
                    // Get the token from the headers
                    let token = typeof(data.headers.token) === "string" ? data.headers.token : false;

                    // Verify that the given token is valid and belongs to the user who created the check
                    _tokens.verifyToken(token, checkData.userPhone, tokenIsValid => {
                        if(tokenIsValid) {  
                            // Update the check where necessary
                            if(protocol) {
                                checkData.protocol = protocol;
                            }
                            if(url) {
                                checkData.url = url;
                            }
                            if(method) {
                                checkData.method = method;
                            }
                            if(successCodes) {
                                checkData.successCodes = successCodes;
                            }
                            if(timeoutSeconds) {
                                checkData.timeoutSeconds = timeoutSeconds;
                            }

                            //Store the new updates
                            _data.update('checks', id, checkData, err => {
                                if(!err) {
                                    callback(200, checkData);
                                } else {
                                    callback(500, {Error: "Could not update the checks"});
                                }
                            })
                            
                            callback(200, checkData)
                        } else {
                            callback(403);
                        }
                    });
                } else {
                    callback(400, {Error: "Check ID does not exist"})
                }
            })
        } else {
            callback(400, {Error: "Missing fields to update"})
        }
    } else {
        callback(400, {Error: "Missing required field"});
    }
}

// Checks - delete




module.exports = {
    checks,
    _checks,
}