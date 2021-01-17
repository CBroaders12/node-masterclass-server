/**
 * Users handlers
 */

//Dependencies
const _data = require('../data');
const _dataP = require('../dataPromise');
const helpers = require('../helpers');
const _tokens = require('./tokens')._tokens;

// Users handler
let users = (data) => {
    const acceptableMethods = ['post','get','put', 'delete'];
    return new Promise((resolve) => {
        if (acceptableMethods.includes(data.method)) {
            resolve(_users[data.method](data));
        } else {
            resolve({ statusCode: 405, payload: "Method not allowed" });
        }
    });
};

// Container for the users submethods
let _users = {};

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
_users.post = async (data) => {
    //Check that all required fields are filled out
    let firstName = typeof(data.payload.firstName) === "string" && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    let lastName = typeof(data.payload.lastName) === "string" && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    let phone = typeof(data.payload.phone) === "string" && data.payload.phone.trim().length === 10  ? data.payload.phone.trim() : false;
    let password = typeof(data.payload.password) === "string" && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    let tosAgreement = typeof(data.payload.tosAgreement) === "boolean" && data.payload.tosAgreement === true ? true : false;

    if (firstName && lastName && phone && password && tosAgreement) {
        try {
            // Hash the password
            let hashedPassword = helpers.hash(password);

            if (hashedPassword) {
                // Create the user object
                let userObject = {
                    firstName,
                    lastName,
                    phone,
                    hashedPassword,
                    tosAgreement
                };

                // Store the user
                await _dataP.create('users', phone, userObject);
                return { statusCode: 200 };
            
            } else {
                return { statusCode: 500, payload: { Error: "Could not hash the user's password" } };
            }     
        } catch (error) {
            if (error.code === "EEXIST") {
                // User already exists
                return { statusCode: 400, payload: { Error: 'A user with that phone number already exists' } };
            } else {
                console.log(error);
                return { statusCode: 500, payload: {Error: "Could not create user" } };
            }
        }
    } else {
        return { statusCode: 400, payload: {Error: "Missing required fields" } };
    }
};

// Users - get
// Required data: phone
// Optional data: none
_users.get = async (data) => {
    // Check that the phone number is valid
    let phone = typeof(data.queryStringObject.get('phone')) === "string" && data.queryStringObject.get('phone').trim().length === 10 ? data.queryStringObject.get('phone').trim() : false;
    
    if(phone) {
        
        // Get the token from the headers
        let token = typeof(data.headers.token) === "string" ? data.headers.token : false;
        
        try {
        // Verify that the given token is valid for the phone number
        await _tokens.verifyToken(token, phone);
          
        // Lookup the user
        let userData = await _dataP.read('users', phone);
        
        // Remove the hashedpassword from the user object before returning it
        delete userData.hashedPassword;
        return { statusCode: 200, payload: userData };

        } catch (error) {
            if(error.code === "ENOENT") {
                console.log(error)
                return {statusCode: 404, payload: { Error: "Unable to locate specified user" } };
            } else if (error.message = "Token is invalid or missing") {
                return { statusCode: 403, payload: { Error: error.message } };
            } else {
                return { statusCode: 500 };
            }
        }       
    } else {
        return {statusCode: 400, payload: { Error: 'Missing required field' } };
    }
};

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
_users.put = async (data) => {
    // Check for the required field
    let phone = typeof(data.payload.phone) === "string" && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;

    // Check for the optional fields 
    let firstName = typeof(data.payload.firstName) === "string" && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    let lastName = typeof(data.payload.lastName) === "string" && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    let password = typeof(data.payload.password) === "string" && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if(phone) {
        if(firstName || lastName || password) {

            try {
                // Get the token from the headers
                let token = typeof(data.headers.token) === "string" ? data.headers.token : false;

                // Verify that the given token is valid for the phone number
                await _tokens.verifyToken(token, phone);

                // Look up the user
                let userData = await _dataP.read('users', phone)
                
                // Update the fields necessary
                if(firstName) {
                    userData.firstName = firstName;
                }
                if(lastName) {
                    userData.lastName = lastName;
                }
                if(password) {
                    userData.hashedPassword = helpers.hash(password);
                }

                //Store the new updates
                await _dataP.update('users', phone, userData)
                return { statusCode: 200 };
            
            } catch (error) {
                if(error.message === "Token is invalid or missing") {
                    return { statusCode: 403, payload: { Error: error.message } };
                } else if (error.code === "ENOENT") {
                    return { statusCode: 400, payload: { Error: "The specified user does not exist" } };
                } else {
                    return { statusCode: 500, payload: { Error: "Could not update the user" } };
                }
            }        
        } else {
            return { statusCode: 400, payload: { Error: "Missing fields to update" } };
        }
    } else {
        return { statusCode: 400, payload: { Error: "Missing required field" } };
    }
};

// Users - delete
// Required Field: phone
// Optional Fields: none
_users.delete = async (data) => {
    // Check that the phone number is valid
    let phone = typeof(data.queryStringObject.get('phone')) === "string" && data.queryStringObject.get('phone').trim().length === 10 ? data.queryStringObject.get('phone').trim() : false;
    if(phone) {

        // Get the token from the headers
        let token = typeof(data.headers.token) === "string" ? data.headers.token : false;
        
        try {
            // Verify that the given token is valid for the phone number
            await _tokens.verifyToken(token, phone);
            
            // Lookup the user
            let userData = await _dataP.read('users', phone);
            
            await _dataP.delete('users', phone)

            // Delete each of the checks associated with the user
            let userChecks = typeof(userData.checks) === "object" && userData.checks instanceof Array ? userData.checks : [];
            let checksToDelete = userChecks.length;

            if(checksToDelete >= 0) {
                let checksDeleted = 0;
                let deletionErrors = false;

                // Loop through the checks
                userChecks.forEach( async (checkId) => {
                    try {
                        await _dataP.delete('checks', checkId);
                        checksDeleted++;
                    } catch (error) {
                        deletionErrors = true;
                        checksDeleted++;
                    }
                });
                
                if (checksDeleted === checksToDelete) {
                    if(!deletionErrors) {
                        return { statusCode: 200 };
                    } else {
                        return { statusCode: 500, payload: { Error: "Errors encountered while attempting to delete user's checks. All checks may not have been deleted successfully" } };
                    }
                }
            } else {
                return { statusCode: 500, payload: { Error: "Could not delete the specified user" } };
            }
        } catch (error) {
            if(error.message === "Token is invalid or missing") {
                return { statusCode: 403, payload: { Error: error.message } };
            } else if (error.code === "ENOENT") {
                return { statusCode: 400, payload: { Error: "Could not find the specified user" } };
            } else {
                return { statusCode: 500, payload: { Error: "Could not delete the specified user" } };
            }
        }
    } else {
        return { statusCode: 400, payload: { Error: 'Missing required field' } };
    }
};

module.exports = {
    users,
    _users,
};