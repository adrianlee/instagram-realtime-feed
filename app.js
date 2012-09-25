var express = require('express'),
    http = require('http'),
    path = require('path'),

    // Third Party
    hbs = require('hbs'),
    request = require('request');

var app = express();

////////////////////////////////////////////////
// Express Configuration
////////////////////////////////////////////////
app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'html');
  app.engine('html', require('hbs').__express);
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

////////////////////////////////////////////////
// Handlebars
////////////////////////////////////////////////
var blocks = {};

hbs.registerHelper('extend', function(name, context) {
    var block = blocks[name];
    if (!block) {
        block = blocks[name] = [];
    }

    block.push(context(this));
});

hbs.registerHelper('block', function(name) {
    var val = (blocks[name] || []).join('\n');

    // clear the block
    blocks[name] = [];
    return val;
});

////////////////////////////////////////////////
// Router
////////////////////////////////////////////////
app.get('/', function (req, res) {
  res.locals.title = "Realtime Instagram";
  res.render('index');
});

app.get('/subscriptions', function (req, res) {
  var args = {
    method: "GET",
    url: "https://api.instagram.com/v1/subscriptions",
    qs: {
      client_id: process.env["instagram-id"],
      client_secret: process.env["instagram-secret"]
    }
  };

  request(args, function (e, r, body) {
    console.log(body);
    res.send(body);
  });
});

app.get('/subscribe/:object/:objectid', function(req, res) {
  var args = {
    method: "POST",
    url: "https://api.instagram.com/v1/subscriptions/",
    form: {
      client_id: process.env["instagram-id"],
      client_secret: process.env["instagram-secret"],
      object: req.params["object"],
      aspect: "media",
      object_id: req.params["objectid"],
      callback_url: "http://jumjum.jit.su/callback/"
    }
  };

  request(args, function (e, r, body) {
    console.log(body);
    res.send(body);
  });
});

app.get('/delete/:id', function(req, res) {
  var args = {
    method: "DELETE",
    url: "https://api.instagram.com/v1/subscriptions",
    qs: {
      client_id: process.env["instagram-id"],
      client_secret: process.env["instagram-secret"],
      id: req.params["id"]
    }
  };

  request(args, function (e, r, body) {
    console.log(body);
    res.send(body);
  });
});

app.get('/callback', function (req, res) {
  console.log(req.query);
  res.send(req.query["hub.challenge"]);
});

app.post('/callback', function (req, res) {
  console.log(req.body);
  processPayload(req.body);
});


////////////////////////////////////////////////
// Function
////////////////////////////////////////////////

function processPayload(payload) {
  var i;

  console.log(payload);

  for (obj in payload) {
    console.log(obj);
    var args,
        endpoint,
        object = obj.object,
        object_id = obj.object_id;

    if (object === "geography") {
      endpoint = "https://api.instagram.com/v1/geographies/" + object_id + "/media/recent";
    } else if (object === "tag") {
      endpoint = "https://api.instagram.com/v1/tags/" + object_id + "/media/recent";
    }

    console.log(endpoint);

    args = {
      method: "GET",
      uri: endpoint,
      qs: {
        client_id: process.env["instagram-id"],
        client_secret: process.env["instagram-secret"]
      }
    };

    request(args, function (e, r, body) {
      console.log("Process Payload");
      console.log(body);
    });
  }
}

////////////////////////////////////////////////
// HTTP Server
////////////////////////////////////////////////
http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});