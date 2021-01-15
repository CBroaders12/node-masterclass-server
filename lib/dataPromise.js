/**
 * Library for storing and editing data
 * Refactored version of data.js to use Promises instead of callbacks
*/

// Dependencies
const path = require('path');
const fs = require('fs/promises');
const helpers = require('./helpers');

// Container for the module (to be exported)
let lib = {};

// Base directory of the data folder
lib.baseDir = path.join(__dirname, '/../.data/');

// Write data to a file
lib.create = async (dir, file, data) => {
    try {
        // Open the file for writing
        let fileHandle = await fs.open(`${lib.baseDir}${dir}/${file}.json`, 'wx');

        // Convert data to a string
        let stringData = JSON.stringify(data);

        // Write and close the file
        await fs.writeFile(fileHandle, stringData);
        fileHandle.close();

    } catch (error) {
        throw error;
    }
};

// Read data from a file
lib.read = async (dir, file) => {
    try {
        let fileContent = await fs.readFile(`${lib.baseDir}${dir}/${file}.json`, 'utf-8');
        let parsedContent = helpers.parseJsonToObject(fileContent);
        console.log(parsedContent);
        return parsedContent;
    } catch (error) {
        console.log(error);
        return false;
    }
}

// Update data inside an existing file
lib.update = async (dir, file, data) => {
    try {
        //Open the file for writing
        let fileHandle = await fs.open(`${lib.baseDir}${dir}/${file}.json`, 'r+');

        // Convert data to a string
        let stringData = JSON.stringify(data);

        // Write to the file and close it
        await fs.writeFile(fileHandle, stringData);
        fileHandle.close();
    } catch (error) {
        console.log(error)
    }
};

lib.delete = async (dir, file) => {
    try {
        // Unlink the file
        await fs.unlink(`${lib.baseDir}${dir}/${file}.json`);
    } catch (error) {
        console.log(error)
    }
}

// Export the module
module.exports = lib;