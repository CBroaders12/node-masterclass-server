/**
 * Tokens handlers
*/

// Dependencies
const _data = require('../data');
const helpers = require('../helpers');
const _dataP = require('../dataPromise');
const { SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION } = require('constants');

// Tokens handler
let tokens = (data) => {
    const acceptableMethods = ['post','get','put', 'delete'];
    return new Promise(resolve => {
        if(acceptableMethods.includes(data.method)) {
            resolve(_tokens[data.method](data));
        } else {
            resolve({ statusCode: 405, Error: 'Method not allowed' });
        }
    });
}

// Container for token submethods
let _tokens = {};

// Tokens - post
// Required data: phone, password
// Optional data: none
_tokens.post = async (data) => {
    let phone = typeof(data.payload.phone) === "string" && data.payload.phone.trim().length === 10  ? data.payload.phone.trim() : false;
    let password = typeof(data.payload.password) === "string" && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if (phone && password) {
        try {
            // Look up the user who matches that phone number
            let userData = await _dataP.read('users', phone);
            
            if(userData) {
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

                    try {
                        // Store the token
                        await _dataP.create('tokens', tokenId, tokenObject);
                        return { statusCode: 200, payload: tokenObject };
                    } catch (error) {
                        return { statusCode: 500, payload: { Error: "Could not create the new token" } };
                    }
                    
                } else {
                    return { statusCode: 400, payload: { Error: "Password did not match the specified user's stored password" } };
                }
            } else {
                return { statusCode: 400, payload: { Error: "Could not find the specified user" } };
            }
        } catch (error) {
            return { statusCode: 500, payload: { Error: "Could not create token" } };
        }
    } else {
        return { statusCode: 400, payload: { Error: "Missing required fields" } };
    }
};

// Tokens - get
// Required data: id
// Optional data: none
_tokens.get = async (data) => {
    // Check that the sent ID is valid
    let id = typeof(data.queryStringObject.get('id')) === "string" && data.queryStringObject.get('id').trim().length === 20 ? data.queryStringObject.get('id').trim() : false;
    
    if(id) {
        try {
            let tokenData = await _dataP.read('tokens', id);

            if (tokenData) {
                return { statusCode: 200, payload: tokenData};
            } else {
                return { statusCode: 404 };
            }
        } catch (error) {
            return { statusCode: 500, payload: { Error: "Problem reading files"}}
        }
    } else {
        return { statusCode: 400, payload: { Error: 'Missing required field' } };
    }
};

// Tokens - put
// Required data: id, extend
// Optional data: none
_tokens.put = async (data) => {
    let id = typeof(data.payload.id) === "string" && data.payload.id.trim().length === 20  ? data.payload.id.trim() : false;
    let extend = typeof(data.payload.extend) === "boolean" && data.payload.extend === true ? true : false;

    if (id && extend) {
        try {
            // Lookup the token
            let tokenData = await _dataP.read('tokens', id);

            if(tokenData) {
                // Check to make sure the token isn't already expired
                if(tokenData.expires > Date.now()) {
                    // Set the expiration to an hour from now
                    tokenData.expires = Date.now() + 1000 * 60 * 60;

                    try {
                        // Store the new updates
                        await _dataP.update('tokens', id, tokenData);
                        return { statusCode: 200 };
                    } catch (error) {
                        return { statusCode : 500, payload: { Error: "Failed to update token" } };
                    }
                } else {
                    return { statusCode: 400, payload: { Error: "The token has already expired and cannot be extended" } };
                }
            } else {
                return { statusCode: 400, payload: { Error: "Specified token does not exist" } };
            }
        } catch (error) {
            return { statusCode: 500, payload: { Error: "Could not read files" } };
        }
    } else {
        return { statusCode: 400, payload: { Error: "Missing required fields or fields are invalid" } };
    }
};

// Tokens - delete
// Required data: id
// Optional data: none
_tokens.delete = async (data) => {
    // Check that the id is valid
    let id = typeof(data.queryStringObject.get('id')) === "string" && data.queryStringObject.get('id').trim().length === 20 ? data.queryStringObject.get('id').trim() : false;

    if(id) {
        try {
            // Lookup the token
            let tokenData = await _dataP.read('tokens', id);

            if(tokenData) {
                try {
                    // Delete the token
                    await _dataP.delete('tokens', id);
                    return { statusCode: 200 };
                } catch (error) {
                    return { statusCode: 500, payload: { Error: "Could not delete the specified token" } };
                }
            } else {
                return { statusCode: 400, payload: { Error: "Could not find the specified token" } };
            }
        } catch (error) {
            return { statusCode: 500, payload: { Error: "Could not read files" } };
        }
    } else {
        return { statusCode: 400, payload: { Error: 'Missing required field' } };
    }
};

// Verify if a given id is currently valid for a given user
_tokens.verifyToken = async (id, phone) => {
    try {
        // Lookup the token
        let tokenData = await _dataP.read('tokens', id);

        return tokenData.phone === phone && tokenData.expires > Date.now();

    } catch (error) {
        return false;
    }
};

module.exports = {
    tokens,
    _tokens,
}