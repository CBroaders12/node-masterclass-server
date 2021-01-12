/**
 * Checks handlers
*/

// Dependencies
const _data = require('../data');
const helpers = require('../helpers');

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












module.exports = {
    checks,
    _checks,
}