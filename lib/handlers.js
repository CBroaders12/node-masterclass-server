/**
 * Request Handlers
*/

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');

// Define handlers
let handlers = {};

// Users handler
handlers.users = (data, callback) => {
    const acceptableMethods = ['post','get','put', 'delete'];
    if(acceptableMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data, callback);
    } else {
        callback(405, {Error: 'Method not allowed'});
    }
}

// Container for the users submethods
handlers._users = {};

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = (data, callback) => {
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
handlers._users.get = (data, callback) => {
    // Check that the phone number is valid
    let phone = typeof(data.queryStringObject.get('phone')) === "string" && data.queryStringObject.get('phone').trim().length === 10 ? data.queryStringObject.get('phone').trim() : false;
    if(phone) {
        
        // Get the token from the headers
        let token = typeof(data.headers.token) === "string" ? data.headers.token : false;
        // Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token, phone, tokenIsValid => {
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
handlers._users.put = (data, callback) => {
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
            handlers._tokens.verifyToken(token, phone, tokenIsValid => {
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
handlers._users.delete = (data, callback) => {
    // Check that the phone number is valid
    let phone = typeof(data.queryStringObject.get('phone')) === "string" && data.queryStringObject.get('phone').trim().length === 10 ? data.queryStringObject.get('phone').trim() : false;
    if(phone) {

        // Get the token from the headers
        let token = typeof(data.headers.token) === "string" ? data.headers.token : false;
        // Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token, phone, tokenIsValid => {
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

// Tokens handler
handlers.tokens = (data, callback) => {
    const acceptableMethods = ['post','get','put', 'delete'];
    if(acceptableMethods.indexOf(data.method) > -1) {
        handlers._tokens[data.method](data, callback);
    } else {
        callback(405, {Error: 'Method not allowed'});
    }
}

// Container for token submethods
handlers._tokens = {};

// Tokens - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = (data, callback) => {
    let phone = typeof(data.payload.phone) === "string" && data.payload.phone.trim().length === 10  ? data.payload.phone.trim() : false;
    let password = typeof(data.payload.password) === "string" && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if (phone && password) {
        // Look up the user who matches that phone number
        _data.read('users', phone, (err, userData) => {
            if(!err && data) {
                // Hash the sent password and compare it to the password stored in the user object
                let hashedPassword = helpers.hash(password);

                if (hashedPassword === userData.hashedPassword) {
                    // If valid, create a new token with a random name. Set expiration date 1 hour in the future
                    let tokenId = helpers.createRandomString(20);
                    let expires = Date.now() + 1000 * 60 * 60;
                    let tokenObject = {
                        phone,
                        id: tokenId,
                        expires,
                    };

                    // Store the token
                    _data.create('tokens', tokenId, tokenObject, err => {
                        if(!err) {
                            callback(200, tokenObject);
                        } else {
                            callback(500, {Error: "Could not create the new token"});
                        }
                    })
                } else {
                    callback(400, {Error: "Password did not match the specified user's stored password"})
                }
            } else {
                callback(400, {Error: "Could not find the specified user"})
            }
        })

    } else {
        callback(400, {Error: "Missing required fields"})
    }
};

// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = (data, callback) => {
    // Check that the sent ID is valid
    let id = typeof(data.queryStringObject.get('id')) === "string" && data.queryStringObject.get('id').trim().length === 20 ? data.queryStringObject.get('id').trim() : false;
    if(id) {
        // Lookup the user
        _data.read('tokens', id, (err, tokenData) => {
            if(!err && tokenData) {
                callback(200, tokenData);
            } else {
                callback(404);
            }
        })
    } else {
        callback(400, {Error: 'Missing required field'})
    }
};

// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = (data, callback) => {
    let id = typeof(data.payload.id) === "string" && data.payload.id.trim().length === 20  ? data.payload.id.trim() : false;
    let extend = typeof(data.payload.extend) === "boolean" && data.payload.extend === true ? true : false;

    if (id && extend) {
        // Lookup the token
        _data.read('tokens', id, (err, tokenData) => {
            if(!err && tokenData) {
                // Check to make sure the token isn't already expired
                if (tokenData.expires > Date.now()) {
                    // Set the expiration to an hour from now
                    tokenData.expires = Date.now() + 1000 * 60 * 60;

                    // Store the new updates
                    _data.update('tokens', id, tokenData, (err) => {
                        if(!err) {
                            callback(200);
                        } else {
                            callback(500, {Error : "Could not update the token's expiration"});
                        }
                    })
                } else {
                    callback(400, {Error: "The token has already expired and cannot be extended"})
                }
            } else {
                callback(400, {Error: "Specified token does not exist"});
            }
        });
    } else {
        callback(400, {Error: "Missing required fields or fields are invalid"})
    }
};

// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = (data, callback) => {
    // Check that the id is valid
    let id = typeof(data.queryStringObject.get('id')) === "string" && data.queryStringObject.get('id').trim().length === 20 ? data.queryStringObject.get('id').trim() : false;
    if(id) {
        // Lookup the user
        _data.read('tokens', id, (err, data) => {
            if(!err && data) {
                _data.delete('tokens', id, err => {
                    if (!err) {
                        callback(200);
                    } else {
                        callback(500, {Error: "Could not delete the specified token"})
                    }
                });
                
            } else {
                callback(400, {Error: "Could not find the specified token"});
            }
        })
    } else {
        callback(400, {Error: 'Missing required field'})
    }
};

// Verify if a given id is currently valid for a given user
handlers._tokens.verifyToken = (id, phone, callback) => {
    // Lookup the token
    _data.read('tokens', id, (err, tokenData) => {
        if(!err && tokenData) {
            // Check that the token is for the given user and has not expired
            if (tokenData.phone === phone && tokenData.expires > Date.now()) {
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    })
}

// Ping handler
handlers.ping = (data, callback) => {
    callback(200);
}

// Not found handler
handlers.notFound = (data, callback) => {
    callback(404);
}

module.exports = handlers;