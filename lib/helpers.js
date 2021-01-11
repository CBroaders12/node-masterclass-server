/**
 * Helpers for various tasks
 * 
*/

// Dependencies
const crypto = require('crypto');
const config = require('./config');

// Container for all the helpers
let helpers = {};

// Create a SHA256 hash
helpers.hash = (str) => {
    if(typeof(str) === "string" && str.length > 0) {
        let hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
        return hash;
    } else {
        return false;
    }
};

// Parse a JSON string to an object in all cases without throwing
helpers.parseJsonToObject = (str) => {
    try {
        let object = JSON.parse(str);
        return object;
    } catch (error) {
        console.log(error);
        return {};
    }
}

// Create a string of random alphanumeric characters of a given length
helpers.createRandomString = strLength => {
    strLength = typeof(strLength) === "number" && strLength > 0 ? strLength : false;
    if(strLength) {
        // Define all the possible characters that could go into the string
        let possibleCharacters = 'abcdefghijklmnopqrstuvwxyz1234567890';

        // Start the final string
        let str = '';

        for(let i = 1; i <= strLength; i++) {
            // Get a random character from the possibleCharacters string
            let randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
            // Append this character to the final string
            str +=  randomCharacter;
        }

        // Return the final string
        return str;
    } else {
        return false;
    }
}














module.exports = helpers;