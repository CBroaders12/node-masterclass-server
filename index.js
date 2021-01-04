/**
 * Primary file for the API
 * 
 */

// Dependencies
const http = require('http');
const url = require('url');

// The server should respond to all requests with a string
const server = http.createServer(function(req, res) {
    
    // Get the URL and parse it
    let parsedURL = new URL(req.url, `http://${req.headers.host}`);

    // Get the path from URL
    let path = parsedURL.pathname;
    let trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // Send the response
    res.end('Hello World!\n');

    // Log the requested path
    console.log('Request received on path: ' + trimmedPath);

});


// Start the server, and have it listen on port 3000
server.listen(3000, function() {
    console.log("The server is listening on port 3000")
});