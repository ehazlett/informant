var http = require('http');
var https = require('https');
var url = require('url');
var qs = require('querystring');
var rds = require('redis');
var redis = rds.createClient();
var APP_PORT = 3000;

var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')

var CONFIG;
var INTERVALS = {};

// load config
fs.readFile(__dirname + '/config.json',
  function (err, data) {
    if (err) {
      console.log("Unable to load config.json: " + err);
    } else {
      CONFIG = JSON.parse(data.toString());
      if (CONFIG.hasOwnProperty('repos')){
        setupGithubChecks();
      }
    }
});

function setupGithubChecks(){
  for (var i in CONFIG.repos) {
    var repo = CONFIG.repos[i];
    console.log('Setting up Github checks for ' + repo.name);
    var interval = setInterval(function(){
      var headers = null;
      if (repo.hasOwnProperty('authUser')){
        console.log('Using auth for ' + repo.name);
        headers = {
          'Authorization': 'Basic ' + new Buffer(repo.authUser + ':' + repo.authPass).toString('base64')
        }
      }
      var req = https.request({
        host: 'api.github.com',
        port: 443,
        path: '/repos/'+repo.owner+'/'+repo.name+'/pulls',
        //path: '/users/'+repo.owner+'/repos',
        method: 'GET',
        headers: headers
      }, function(res){
        res.on('data', function(data){
          console.log(data.toString());
        });
      }); 
      req.end();
      //console.log(req);
    }, 5000);
    INTERVALS[repo.name] = interval;
  }
}

app.listen(APP_PORT);

function handler (req, res) {
  var urlParts = url.parse(req.url, true);
  route(req, urlParts, res);
}

function route(req, parts, res){
  var filename = null;
  switch(parts.pathname) {
    case '/':
      filename = 'templates/index.html';
      break;
    // TODO: make static file lookup dynamic
    case '/static/favicon.ico':
      filename = 'static/favicon.ico';
      break;
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
    case '/static/bootstrap-modal.js':
      filename = 'static/bootstrap-modal.js';
      break;
    case '/static/bootstrap-dropdown.js':
      filename = 'static/bootstrap-dropdown.js';
      break;
    case '/static/bootstrap-tooltip.js':
      filename = 'static/bootstrap-tooltip.js';
      break;
    case '/static/bootstrap-popover.js':
      filename = 'static/bootstrap-popover.js';
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
    case '/oauth/grant':
      var url = 'https://github.com/login/oauth/authorize?client_id='+CONFIG.githubClientId+'&scope=repo';
      res.writeHead(302, {
        'Location': url
      });
      res.end();
      break;
    case '/authorize':
      var postData = ''; 
      req.addListener('data', function(chunk){
        postData += chunk.toString();
      }).addListener('end', function(data) {
        var post = qs.stringify({
          'client_id': CONFIG.githubClientId,
          'client_secret': CONFIG.githubSecret,
          'code': parts.query.code,
        });
        var req = https.request({
          host: 'github.com',
          port: 443,
          path: '/login/oauth/access_token',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': post.length
          }
        }, function(res){
          res.on('data', function(res){
            var token = qs.parse(res.toString()).access_token;
            var req = https.request({
              host: 'api.github.com',
              port: 443,
              path: '/user',
              headers: {
                'Authorization': 'token ' + token
              }
            }, function(res){
              res.on('data', function(data){
                var userData = JSON.parse(data.toString());
                console.log('Auth token for ' + userData.login + ': ' + token);
                // store in redis
                redis.set('user:'+userData.login+':token', token, function(err, res){
                  if (err){
                    console.log(err);
                  }
                });
              });
            });
            req.end();
          })
        });
        req.end(post);
      });
      res.writeHead(302, {
        'Location': '/'
      });
      return res.end();
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
