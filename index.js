/**
 * Primary file for the API
 * 
 */

// Dependencies
const http = require('http');
const { StringDecoder } = require('string_decoder');
const config = require('./config');

// The server should respond to all requests with a string
const server = http.createServer((req, res) => {
    
    // Get the URL and parse it
    let parsedURL = new URL(req.url, `http://${req.headers.host}`);

    // Get the path from URL
    let path = parsedURL.pathname;
    let trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // Get the query string as an object
    let queryStringObject = parsedURL.searchParams;

    // Get the HTTP Method
    let method = req.method.toUpperCase();

    // Get the headers as an object
    let headers = req.headers;

    // Get the payload, if any
    let decoder = new StringDecoder('utf-8');
    buffer = "";
    req.on('data', data => {
        buffer += decoder.write(data);
    });
    req.on('end', () => {
        buffer += decoder.end();

        // Choose the handler this request should go to, if one is not found, use the not found handler
        let chosenHandler = router[trimmedPath] ? router[trimmedPath] : handlers.notFound;

        //Construct the data object to send to the handler
        let data = {
            trimmedPath,
            queryStringObject,
            method,
            headers,
            payload: buffer,
        }

        //Route the request to the handler specified in the router
        chosenHandler(data, (statusCode, payload) => {
            // Use the status code called back by the handler, or default to 200
            statusCode = typeof(statusCode) === "number" ? statusCode : 200;

            // Use the payload called back by the handler, or default to an empty object
            payload = typeof(payload) === "object" ? payload : {};

            // Convert the payload to a string
            let payloadString = JSON.stringify(payload)

            // Return the response
            // res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode, {'Content-Type': 'application/json'});
            res.end(payloadString);

             // Log the requested path
            console.log(`Returning this response:`, statusCode, payloadString);
        })
    
    });
});

// Start the server, and have it listen on port 3000
server.listen(3000, () => {
    console.log("The server is listening on port 3000")
});

// Define handlers
let handlers = {};

// Sample Handler
handlers.sample = (data, callback) => {
    // Callback an HTTP status code, and a payload object
    callback(418, {'name' : 'sample handler'})
};

// Not found handler
handlers.notFound = (data, callback) => {
    callback(404);
}

// Define a request router
let router = {
    'sample' : handlers.sample
}