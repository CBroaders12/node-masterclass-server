/**
 * Checks handlers
*/

// Dependencies
const _data = require('../data');
const helpers = require('../helpers');
const config = require('../config');
const _tokens = require('./tokens')._tokens;

// Checks handler
let checks = (data) => {
    const acceptableMethods = ['post','get','put', 'delete'];
    return new Promise(resolve => {
        if(acceptableMethods.includes(data.method)) {
            resolve(_checks[data.method](data));
        } else {
            resolve( { statusCode: 405, payload: { Error: 'Method not allowed' } } );
        }
    });
};

// Container for Checks submethods
let _checks = {};

// Checks - post
// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none
_checks.post = async (data) => {
    // Validate inputs
    let protocol = typeof(data.payload.protocol) === "string" && ['http', 'https'].includes(data.payload.protocol) ? data.payload.protocol : false;
    let url = typeof(data.payload.url) === "string" && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    let method = typeof(data.payload.method) === "string" && ['post', 'get', 'put', 'delete'].includes(data.payload.method) ? data.payload.method : false;
    let successCodes = typeof(data.payload.successCodes) === "object" && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    let timeoutSeconds = typeof(data.payload.timeoutSeconds) === "number" && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 && data.payload.timeoutSeconds % 1 === 0 ? data.payload.timeoutSeconds : false;

    if (protocol && url && method && successCodes && timeoutSeconds) {
        // Get the token from the headers
        let token = typeof(data.headers.token) === "string" ? data.headers.token : false;

        try {
            // Look up the user by reading the token
            let tokenData = await _dataP.read('tokens', token);

            let userPhone = tokenData.phone;

            try {
                // Look up the user data
                let userData = await _dataP.read('users', userPhone);
                
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

                    try {
                        // Save the object
                        await _dataP.create('checks', checkId, checkObject);
                        
                        // Add the checkId to the user's object
                        userData.checks = userChecks;
                        userData.checks.push(checkId);

                        try {
                            // Save the new user data
                            await _dataP.update('users', userPhone, userData);
                            
                            // Return the data about the new check to the requester
                            return { statusCode: 200, payload: checkObject };

                        } catch (error) {
                            return { statusCode: 500, payload: { Error: "Could not update the user with the new check" } };
                        }
                    } catch (error) {
                        return { statusCode: 500, payload: { Error: "Could not create the new check" } };
                    }
                } else {
                    return { statusCode: 400, payload: { Error: `The user already has the maximum number of checks (${config.maxChecks})` } };
                }
            } catch (error) {
                return { statusCode: 500, payload: { Error: "Unable to locate user"} };
            }
        } catch (error) {
            return { statusCode: 403, payload: {Error: "Token is invalid or missing" } };
        }
    } else {
        return { statusCode: 400, payload: { Error: "Missing required inputs or inputs are invalid" } };
    }
}

// Checks - get
// Required data: id
// Optional data: none
_checks.get = async (data) => {
    // Check that the id is valid
    let id = typeof(data.queryStringObject.get('id')) === "string" && data.queryStringObject.get('id').trim().length === 20 ? data.queryStringObject.get('id').trim() : false;
    
    if(id) {
        
        try {
            // Lookup the check
            let checkData = await _dataP.read('checks', id);
            
            // Get the token from the headers
            let token = typeof(data.headers.token) === "string" ? data.headers.token : false;

            // Verify that the given token is valid and belongs to the user who created the check
            await _tokens.verifyToken(token, checkData.userPhone);
            
            // Return the check info
            return { statusCode: 200, payload: checkData };
            
        } catch (error) {
            if (error.code === "ENOENT") {
                return { statusCode: 404, payload: { Error: "Could not find specified check" } };
            } else if(error.message === "Token is invalid or missing") {
                return { statusCode: 403, payload: { Error: error.message } };
            } else {
                return { statusCode: 500, payload: { Error: "Unable to read check info" } };
            }
        }    
    } else {
        return { statusCode: 400, payload: { Error: 'Missing required field' } };
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

            try {
                // Look up the check
                let checkData = _dataP.read('checks', id);

                // Get the token from the headers
                let token = typeof(data.headers.token) === "string" ? data.headers.token : false;

                // Verify that the given token is valid and belongs to the user who created the check
                await _tokens.verifyToken(token, checkData.userPhone);
                
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
                await _dataP.update('checks', id, checkData);
                
                return{ statusCode: 200, payload: checkData };

            } catch (error) {
                if (error.message === "Token is invalid or missing") {
                    return { statusCode: 403, payload: { Error: error.message } };
                } else if(error.code === "ENOENT") {
                    return { statusCode: 400, payload: { Error: "Check ID does not exist" } };
                } else {
                    return { statusCode: 500, payload: { Error: "Could not update the check" } };
                }
            }
        } else {
            return { statusCode: 400, payload: { Error: "Missing fields to update" } };
        }
    } else {
        return { statusCode: 400, payload: { Error: "Missing required field" } };
    }
};

// Checks - delete
// Required data: id
// Optional data: none
_checks.delete = (data, callback) => {
    // Check for the required field
    let id = typeof(data.queryStringObject.get('id')) === "string" && data.queryStringObject.get('id').trim().length === 20 ? data.queryStringObject.get('id').trim() : false;

    if(id) {
        try {
            // Lookup the check
            let checkData = _dataP.read('checks', id);
            
            // Get the token from the headers
            let token = typeof(data.headers.token) === "string" ? data.headers.token : false;

            // Verify that the given token is valid for the phone number
            await _tokens.verifyToken(token, checkData.userPhone);
                    
            // Delete the check data
            await _dataP.delete('checks', id);
            
            try {
                // Lookup the user
                let userData = await _dataP.read('users', checkData.userPhone);

                let userChecks = typeof(userData.checks) === "object" && userData.checks instanceof Array ? userData.checks : [];

                // Remove the deleted check from their list of checks
                let checkPosition = userChecks.indexOf(id);
                if(checkPosition > -1) {
                    userChecks.splice(checkPosition, 1);

                    // Re-save the users data
                     await _dataP.update('users', checkData.userPhone, userData);
                    
                     return { statusCode: 200 };
                            
                } else {
                    return { statusCode: 500, payload: { Error: "Could not find the check on the user's object" } };
                }
            } catch (error) {
                return { statusCode: 500, payload: { Error: "Could not delete the check from the specified user, or user not found" } };
            }
        } catch (error) {
            if (error.message === "Token is invalid or missing") {
                return { statusCode: 403, payload: { Error: error.message } };
            } else if(error.code === "ENOENT") {
                return { statusCode: 400, payload: { Error: " The specified Check ID does not exist" } };
            } else {
                return { statusCode: 500, payload: { Error: "Could not delete the check data" } };
            }
        }
    } else {
        return { statusCode: 400, payload: { Error: 'Missing required field' } };
    }
};




module.exports = {
    checks,
    _checks,
}