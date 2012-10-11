var express = require('express'),
    http = require('http'),
    path = require('path'),
    app = express(),
    server = http.createServer(app),
    io = require('socket.io').listen(server),

    redis = require('redis'),

    // Third Party
    hbs = require('hbs'),
    request = require('request');

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
// Redis
////////////////////////////////////////////////
var redis_client = redis.createClient(9917, 'drum.redistogo.com');
redis_client.auth('83559114fe933019cf60c2e6d7e85972', function (err) {
  if (err) { throw err; }
  console.log("Connected to Redis");
});

redis_client.on("error", function (err) {
    console.log("Error " + err);
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
      client_id: "ece9571300f54b3a90e8b46b8a7ca882",
      client_secret: "eeb25b35adf84786866c6ae7bfae43bb"
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
      client_id: "ece9571300f54b3a90e8b46b8a7ca882",
      client_secret: "eeb25b35adf84786866c6ae7bfae43bb",
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
      client_id: "ece9571300f54b3a90e8b46b8a7ca882",
      client_secret: "eeb25b35adf84786866c6ae7bfae43bb",
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
  res.send("ACK");
  processPayload(req.body);
});


////////////////////////////////////////////////
// Function
////////////////////////////////////////////////

function processPayload(payload) {
  var minID;

  for (var i = 0; i < payload.length; i++) {
    var args,
        endpoint,
        object = payload[i]['object'],
        object_id = payload[i]['object_id'];

    if (object === "geography") {
      endpoint = "https://api.instagram.com/v1/geographies/" + object_id + "/media/recent";
      if (!!minID) {
        console.log("minID: " + minID);
        endpoint += "?&min_id=" + minID;
      } else {
        endpoint += "?&count=1";
      }

    } else if (object === "tag") {
      endpoint = "https://api.instagram.com/v1/tags/" + object_id + "/media/recent";
    }

    console.log("Endpoint: " + endpoint);

    args = {
      method: "GET",
      url: endpoint,
      qs: {
        client_id: "ece9571300f54b3a90e8b46b8a7ca882",
        client_secret: "eeb25b35adf84786866c6ae7bfae43bb"
      }
    };

    request(args, function (e, r, body) {
      var envelope = JSON.parse(body);
      var data = envelope.data;

      var payloadArray = [];

      var sorted = data.sort(function(a, b){
        return parseInt(b.id) - parseInt(a.id);
      });

      try {
        minID = parseInt(sorted[0].id);
        redis_client.set('min-id', minID);
      } catch (e) {
        console.log('Error parsing min ID');
        console.log(sorted);
      }

      for (var i = 0; i < data.length; i++) {
        console.log(data[i]);
        // data[i].images.thumbnail.url
        // data[i].images.standard_resolution.url
        var obj = {
          url: data[i].images.low_resolution.url,
          link: data[i].link
        };

        if (!redis_client.hexists('media:exist', data[i].images.low_resolution.url)) {
          redis_client.hset('media:exist', data[i].images.low_resolution.url, "OK");
          redis_client.lpushx('media', JSON.stringify(obj));
          payloadArray.push({ url: data[i].images.low_resolution.url });
          io.sockets.emit('image', payloadArray);
        }
      }
    });
  }
}

////////////////////////////////////////////////
// socket.io
////////////////////////////////////////////////
io.sockets.on('connection', function (socket) {
  // recent image in redis queue
  redis_client.lrange('media', 0, 9, function(error, media) {
    console.log(media);
    var payloadArray = [];
    for (var i = 0; i < media.length; i++) {
      if (media[i]) {
        payloadArray.push(JSON.parse(media[i]));
      }
    };
    socket.emit('image', payloadArray);
  });
});


////////////////////////////////////////////////
// HTTP Server
////////////////////////////////////////////////
server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
