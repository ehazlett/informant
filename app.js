var http = require('http');
var url = require('url');
var qs = require('querystring');
var APP_PORT = 3000;

var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')

io.configure('development', function(){
  io.set('transports', ['websocket']);
});


app.listen(APP_PORT);

function handler (req, res) {
  var urlParts = url.parse(req.url, true);
  route(req, urlParts, res);
}

function route(req, parts, res){
  var filename = null;
  switch(parts.path) {
    case '/':
      filename = 'templates/index.html';
      break;
    // TODO: make static file search dynamic
    case '/static/glyphicons-halflings.png':
      filename = 'static/glyphicons-halflings.png';
      break;
    case '/static/glyphicons-halflings-white.png':
      filename = 'static/glyphicons-halflings-white.png';
      break;
    case '/static/style.css':
      filename = 'static/style.css';
      break;
    case '/static/common.js':
      filename = 'static/common.js';
      break;
    case '/static/bootstrap.min.css':
      filename = 'static/bootstrap.min.css';
      break;
    case '/static/bootstrap-responsive.min.css':
      filename = 'static/bootstrap-responsive.min.css';
      break;
    case '/receive':
      if (req.method == 'POST') {
        var postData = ''; 
        req.addListener('data', function(chunk){
          postData += chunk.toString();
        }).addListener('end', function() {
          var post = qs.parse(postData);
          io.sockets.emit('events', post);
        });
      }   
      res.writeHead(200);
      return res.end('received');
      break;
    default:
      res.writeHead(404);
      res.write('Unknown');
      break;
  }
  fs.readFile(__dirname + '/' + filename,
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading ' + filename);
    }   
    res.writeHead(200);
    res.end(data);
  });
}

try {
  io.sockets.on('connection', function (socket) {
    socket.on('client', function(data){
      console.log(data);
    });
  });
} catch(err) {
  console.log(err);
}
console.log('Informant running on port ' + APP_PORT + '...');
