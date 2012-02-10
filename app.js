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
    }
});

// clears current periodic checks
function clearExistingChecks(){
  for (var i in INTERVALS) {
    clearInterval(INTERVALS[i]);
  }
}

function checkGithubRepo(repoData, checkType, token){
  switch (checkType) {
    case "pull_requests":
      var path = '/repos/'+repoData.owner+'/'+repoData.repo_name+'/pulls';
      break;
  }
  if (token != null) {
    path += '?access_token='+token;
  }
  try {
    var req = https.request({
      host: 'api.github.com',
      port: 443,
      path: path,
      method: 'GET'
    }, function(res){
      res.on('data', function(data){
        //console.log('Data for ' + repoData.repo_name + ': ' + data.toString());
        try {
          var pull = JSON.parse(data.toString());
          // store in redis
          var pullKey = 'pullrequests:' + repoData.repo_name;
          for (var p in pull) {
            redis.smembers(pullKey, function(err, r){
              if (r.length == 0) {
                // set in redis and broadcast
                console.log('Notifying pull-request ' + pull[p].number + ' for ' + repoData.repo_name); 
                var pullData = { 
                  'repo': repoData.repo_name,
                  'pull-request': pull[p]
                }
                io.sockets.emit('events', JSON.stringify(pullData));
                redis.sadd(pullKey, pull[p].number, function(){});
              } else {
                // check for already notified pull request
                //console.log('Notification already sent for pull-request ' + pull[p].number + ' on ' + repoData.repo_name);
              }
            });
          }
        } catch(err) {
          console.log(err);
        }
      });
    }); 
    req.end();
  } catch(err) {
    console.log(err);
  }
}

function setupGithubChecks(){
  clearExistingChecks();
  redis.keys('repos:*', function(err, res){
    for (var k in res) {
      redis.get(res[k], function(err, res){
        var repo = JSON.parse(res);
        console.log('Setting up Github checks for ' + repo.repo_name);
        var interval = setInterval(function(){
          if (repo.hasOwnProperty('private')){
            var account = repo.private_account;
            redis.get('users:'+repo.private_account+':token', function(err, r){
              checkGithubRepo(repo, 'pull_requests', r.toString());
            });
          } else {
            checkGithubRepo(repo, 'pull_requests');
          }
        }, Math.floor(5000 + (1+10000-5000)*Math.random()));
        //}, 3000);
        INTERVALS[repo.repo_name] = interval;
      });
    }
  });
}

setupGithubChecks();
// start
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
    case '/static/bootstrap-alert.js':
      filename = 'static/bootstrap-alert.js';
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
          io.sockets.emit('events', JSON.stringify(post));
        });
      }   
      res.writeHead(200);
      return res.end('received');
      break;
    case '/oauth/grant': // starting point for github oauth -- redirects to github for login and authorization
      var url = 'https://github.com/login/oauth/authorize?client_id='+CONFIG.githubClientId+'&scope=repo';
      res.writeHead(302, {
        'Location': url
      });
      res.end();
      break;
    case '/authorize': // github responds with a code to this url which then is posted to github for the user auth token
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
                redis.set('users:'+userData.login+':token', token, function(err, res){
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
    case '/addrepo':
      if (req.method == 'POST') {
        var postData = ''; 
        req.addListener('data', function(chunk){
          postData += chunk.toString();
        }).addListener('end', function() {
          var post = qs.parse(postData);
          console.log(post);
          // add repo to datastore
          redis.set('repos:'+post.repo_name, JSON.stringify(post));
          // setup checks
          setupGithubChecks();
          res.writeHead(200);
        });
      }   
      return res.end(JSON.stringify({'status': 'success'}));
      break;
    case '/users/list':
      res.writeHead(200);
      var keys;
      var users = new Array();
      redis.keys('users:*', function(err, r){
        for (var k in r){
          users.push(r[k].split(':')[1]);
        }
        return res.end(JSON.stringify(users));
      });
      break;
    default:
      res.writeHead(404);
      return res.end('Unknown');
      break;
  }
  if (filename) {
    fs.readFile(__dirname + '/' + filename,
    function (err, data) {
      if (err) {
        res.writeHead(500);
        res.end('Error loading ' + filename);
      } else {
        res.writeHead(200);
        res.end(data);
      }
    });
  }
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
