/**
 * Tokens handlers
*/

// Dependencies
const _data = require('../data');
const helpers = require('../helpers');

// Tokens handler
let tokens = (data, callback) => {
    const acceptableMethods = ['post','get','put', 'delete'];
    if(acceptableMethods.indexOf(data.method) > -1) {
        _tokens[data.method](data, callback);
    } else {
        callback(405, {Error: 'Method not allowed'});
    }
}

// Container for token submethods
let _tokens = {};

// Tokens - post
// Required data: phone, password
// Optional data: none
_tokens.post = (data, callback) => {
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
_tokens.get = (data, callback) => {
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
_tokens.put = (data, callback) => {
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
_tokens.delete = (data, callback) => {
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
_tokens.verifyToken = (id, phone, callback) => {
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
};

module.exports = {
    tokens,
    _tokens,
}