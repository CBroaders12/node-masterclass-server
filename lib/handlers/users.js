/**
 * Users handlers
 */

//Dependencies
const _data = require('../data');
const helpers = require('../helpers');
const _tokens = require('./tokens')._tokens;

// Users handler
let users = (data, callback) => {
    const acceptableMethods = ['post','get','put', 'delete'];
    if(acceptableMethods.indexOf(data.method) > -1) {
        _users[data.method](data, callback);
    } else {
        callback(405, {Error: 'Method not allowed'});
    }
};

// Container for the users submethods
let _users = {};

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
_users.post = (data, callback) => {
    //Check that all required fields are filled out
    let firstName = typeof(data.payload.firstName) === "string" && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    let lastName = typeof(data.payload.lastName) === "string" && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    let phone = typeof(data.payload.phone) === "string" && data.payload.phone.trim().length === 10  ? data.payload.phone.trim() : false;
    let password = typeof(data.payload.password) === "string" && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    let tosAgreement = typeof(data.payload.tosAgreement) === "boolean" && data.payload.tosAgreement === true ? true : false;

    if (firstName && lastName && phone && password && tosAgreement) {
        // Make sure that the user does not already exist
        _data.read('users', phone, (err, data) => {
            if(err) {
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
                    _data.create('users', phone, userObject, (err) => {
                        if(!err) {
                            callback(200);
                        } else {
                            console.log(err);
                            callback(500, {Error: 'Could not create the new user'})
                        }
                    })
                } else {
                    callback((500, {Error: 'Could not hash the user\'s password'}))
                }     
            } else {
                // User already exists
                callback(400, {Error: 'A user with that phone number already exists'});
            }
        });
    } else {
        callback(400, {Error: "Missing required fields"});
    }
};

// Users - get
// Required data: phone
// Optional data: none
_users.get = (data, callback) => {
    // Check that the phone number is valid
    let phone = typeof(data.queryStringObject.get('phone')) === "string" && data.queryStringObject.get('phone').trim().length === 10 ? data.queryStringObject.get('phone').trim() : false;
    if(phone) {
        
        // Get the token from the headers
        let token = typeof(data.headers.token) === "string" ? data.headers.token : false;
        // Verify that the given token is valid for the phone number
        _tokens.verifyToken(token, phone, tokenIsValid => {
            if(tokenIsValid) {  
                // Lookup the user
                _data.read('users', phone, (err, data) => {
                    if(!err && data) {
                        // Remove the hashedpassword from the user object before returning it
                        delete data.hashedPassword;
                        callback(200, data);
                    } else {
                        callback(404);
                    }
                });
            } else {
                callback(403, {Error: "Token is invalid or missing"})
            }
        }); 
    } else {
        callback(400, {Error: 'Missing required field'})
    }
};

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
_users.put = (data, callback) => {
    // Check for the required field
    let phone = typeof(data.payload.phone) === "string" && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;

    // Check for the optional fields 
    let firstName = typeof(data.payload.firstName) === "string" && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    let lastName = typeof(data.payload.lastName) === "string" && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    let password = typeof(data.payload.password) === "string" && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if(phone) {
        if(firstName || lastName || password) {

            // Get the token from the headers
            let token = typeof(data.headers.token) === "string" ? data.headers.token : false;
            // Verify that the given token is valid for the phone number
            _tokens.verifyToken(token, phone, tokenIsValid => {
                if(tokenIsValid) {
                    // Look up the user
                    _data.read('users', phone, (err, userData) => {
                        if(!err && userData) {
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
                            _data.update('users', phone, userData, err => {
                                if(!err) {
                                    callback(200);
                                } else {
                                    console.log(err)
                                    callback(500, {Error: 'Could not update the user'});
                                }
                            });
                        } else {
                            callback(400, {Error: "The specified user does not exist"})
                        }
                    });
                } else {
                    callback(403, {Error: "Token is invalid or missing"})
                }
            });     
        } else {
            callback(400, {Error: "Missing fields to update"})
        }
    } else {
        callback(400, {Error: "Missing required field"})
    }
};

// Users - delete
// Required Field: phone
// Optional Fields: none
// TODO: Cleanup (delete) any other data files associated with this user
_users.delete = (data, callback) => {
    // Check that the phone number is valid
    let phone = typeof(data.queryStringObject.get('phone')) === "string" && data.queryStringObject.get('phone').trim().length === 10 ? data.queryStringObject.get('phone').trim() : false;
    if(phone) {

        // Get the token from the headers
        let token = typeof(data.headers.token) === "string" ? data.headers.token : false;
        // Verify that the given token is valid for the phone number
        _tokens.verifyToken(token, phone, tokenIsValid => {
            if(tokenIsValid) {
                // Lookup the user
                _data.read('users', phone, (err, data) => {
                    if(!err && data) {
                        _data.delete('users', phone, err => {
                            if (!err) {
                                callback(200);
                            } else {
                                callback(500, {Error: "Could not delete the specified user"})
                            }
                        });
                    } else {
                        callback(400, {Error: "Could not find the specified user"});
                    }
                });
            } else {
                callback(403, {Error: "Token is invalid or missing"})
            }
        });
    } else {
        callback(400, {Error: 'Missing required field'})
    }
};

module.exports = {
    users,
    _users,
};