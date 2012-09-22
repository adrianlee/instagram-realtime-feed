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
app.get('/', function(req, res) {
  res.locals.title = "Realtime Instagram";
  res.render('index');
});


app.get('/subscribe', function(req, res) {
  var args = {
    method: "POST",
    url: "https://api.instagram.com/v1/subscriptions/",
    form: {
      client_id: "ece9571300f54b3a90e8b46b8a7ca882",
      client_secret: "eeb25b35adf84786866c6ae7bfae43bb",
      object: "location",
      aspect: "media",
      object_id: "1257285",
      callback_url: "http://jumjum.jit.su/callback/"
    }
  };

  request(args, function (e, r, body) {
    console.log("post response");
    console.log(body);
    res.send(body);
  });

  // var r = request.post('https://api.instagram.com/v1/subscriptions/');
  // var form = r.form();
  // form.append('client_id', 'ece9571300f54b3a90e8b46b8a7ca882');
  // form.append('client_secret', 'eeb25b35adf84786866c6ae7bfae43bb');
  // form.append('object', 'location');
  // form.append('aspect', 'media');
  // form.append('object_id', '1257285');
  // form.append('callback_url', 'http://jumjum.jit.su/callback/');

});

app.get('/callback', function(req, res) {
  console.log("callback");
  console.log(req.query);
  res.send(req.query["hub.challenge"]);
});

app.post('/callback', function(req, res) {
  console.log("OMG HOW DID THIS HAPPEND?");
  console.log(req.body);
});

////////////////////////////////////////////////
// HTTP Server
////////////////////////////////////////////////
http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
