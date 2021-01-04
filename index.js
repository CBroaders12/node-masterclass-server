/**
 * Primary file for the API
 * 
 */

// Dependencies
const http = require('http');
const { StringDecoder } = require('string_decoder')

// The server should respond to all requests with a string
const server = http.createServer(function(req, res) {
    
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
    req.on('data', function(data) {
        buffer += decoder.write(data);
    });
    req.on('end', function() {
        buffer += decoder.end();

        // Send the response
        res.end('Hello World!\n');

        // Log the requested path
        console.log(`Request received with this payload:`, buffer);
    
    });
});

// Start the server, and have it listen on port 3000
server.listen(3000, function() {
    console.log("The server is listening on port 3000")
});