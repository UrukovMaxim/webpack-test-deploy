var express = require('express'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    fs = require('fs'),
    mime = require('mime'),
    https = require('https'),
    webpack = require('webpack'),
    expressProxy = require('express-http-proxy'),
    webpackDashboardPlugin = require('webpack-dashboard/plugin'),
    webpackHotMiddleware = require('webpack-hot-middleware'),
    webpackDevMiddleware = require('webpack-dev-middleware'),
    rootPath = path.join(__dirname, '..'),
    webpackConfig = require('./webpack.config'),
    PORT = '3004',
    HOST = '0.0.0.0';

var app = express();
var compiler = webpack(webpackConfig);
// compiler.apply(new webpackDashboardPlugin());

var webpackDevMiddlewareInstance = webpackDevMiddleware(compiler, {
  publicPath: '/',
});

var devFS = webpackDevMiddlewareInstance.fileSystem;
app.use(webpackDevMiddlewareInstance);

/**
 * Express Server
 * */
// compiler.apply(new DashboardPlugin());
//
// var DevMiddle = require('webpack-dev-middleware');
// var devMiddle = DevMiddle(compiler, {
//   noInfo: true,
//   stats: {
//     assets: false,
//     chunks: false
//   },
//   publicPath: devConfig.output.publicPath
// });
//
// var HotMiddle = require('webpack-hot-middleware');
// var hotMiddle = HotMiddle(compiler);
//
// var devFS = devMiddle.fileSystem;
//
// app.use(devMiddle);
// app.use(hotMiddle);

app.get('/_spa/:project/:dir?/:file.:ext', function(req, res, next) {
  var file = req.params.file;
  var dir = req.params.dir;
  var ext = req.params.ext;

  var filename = path.join(options.pathMap.prod, (dir ? dir : '') + '/' + file + '.' + ext);
  var content = fs.readFileSync(filename);

  res.setHeader('Access-Control-Allow-Origin', '*'); // To support XHR, etc.
  res.setHeader('Content-Type', mime.lookup(filename));
  res.setHeader('Content-Length', content.length);
  res.end(content);
});

app.get('/_bundles/*', expressProxy('https://www.onetwotrip.com', {
  filter: function (req, res) {
    return req.method === 'GET';
  },
  forwardPath: function (req, res) {
    return require('url').parse(req.url).path;
  }
}));

app.post('/_bundles/*', expressProxy('https://www.onetwotrip.com', {
  filter: function (req, res) {
    return req.method === 'POST';
  },
  forwardPath: function (req, res) {
    return require('url').parse(req.url).path;
  }
}));

app.get('/_api/*', expressProxy('https://www.onetwotrip.com', {
  filter: function (req, res) {
    return req.method === 'GET';
  },
  decorateRequest: function(req) {
    return req;
  },
  forwardPath: function (req, res) {
    return require('url').parse(req.url).path;
  }
}));

//todo For test
// app.post('/_api/process/hotelpolicyrequest', expressProxy('https://www.onetwotrip.com', {
//   intercept: function(proxyRes, proxyResData, userReq, userRes, cb) {
//     try {
//         var data = JSON.parse(proxyResData.toString('utf8'));
//
//         data.testMax = true;
//         data = JSON.stringify(data);
//
//         cb(null, data);
//
//     } catch(error) {
//       console.log(error);
//     }
//   },
//   reqAsBuffer: true,
//   reqBodyEncoding: null
//   })
// );

app.post('/_api/*', expressProxy('https://www.onetwotrip.com', {
  filter: function (req, res) {
    return req.method === 'POST';
  },
  decorateRequest: function(req) {
    //todo For test
    // req.headers.cookie = req.headers.cookie.replace(/ENVID=.+?[\b;]/g, 'ENVID=beta-01;');

    return req;
  },
  forwardPath: function (req, res) {
    //res.cookie('ENVID', 'do-rzd|VuwYl', {expires: new Date(Date.now() + 900000)});
    return require('url').parse(req.url).path;
  }
}));

app.get('/_hotels/*', expressProxy('https://www.onetwotrip.com', {
  filter: function (req, res) {
    return req.method === 'GET';
  },
  decorateRequest: function(req) {
    return req;
  },
  forwardPath: function (req, res) {
    return require('url').parse(req.url).path;
  }
}));

app.post('/_hotels/*', expressProxy('https://www.onetwotrip.com', {
  filter: function (req, res) {
    return req.method === 'POST';
  },
  decorateRequest: function(req) {
    return req;
  },
  forwardPath: function (req, res) {
    //res.cookie('ENVID', 'do-rzd|VuwYl', {expires: new Date(Date.now() + 900000)});
    return require('url').parse(req.url).path;
  }
}));

app.get('/img|fonts|images|l10n|js/*', function (req, res, next) {

  var filename = webpackDevMiddlewareInstance.getFilenameFromUrl(req.url);

  var content = fs.readFileSync(filename);

  res.setHeader('Access-Control-Allow-Origin', '*'); // To support XHR, etc.
  res.setHeader('Content-Type', mime.lookup(filename));
  res.setHeader('Content-Length', content.length);

  res.end(content);
});


app.get('/:lang/*', function (req, res, next) {
  var lang = req.params.lang;
  if (options.langList.indexOf(lang) < 0) return next();
  var filename = webpackDevMiddlewareInstance.getFilenameFromUrl('/' + lang + '.html');
  var content = devFS.readFileSync(filename);

  res.setHeader('Content-Type', mime.lookup(filename));
  res.setHeader('Content-Length', content.length);


  res.end(content);
});

app.get('/*', function (req, res, next) {
  var filename = webpackDevMiddlewareInstance.getFilenameFromUrl('/ru.html');
  console.log(filename);
  var content = devFS.readFileSync(filename);

  console.log(content);

  res.setHeader('Content-Type', mime.lookup(filename));
  res.setHeader('Content-Length', content.length);

  res.end(content);
});

var privateKey = fs.readFileSync(path.join(__dirname, 'ssl/local.onetwotrip.com.key'), 'utf8'),
    certificate = fs.readFileSync(path.join(__dirname, 'ssl/local.onetwotrip.com.crt'), 'utf8'),
    credentials = {
      key: privateKey,
      cert: certificate,
      passphrase: 'qwedsa3214321'
    };

var server = https.createServer(credentials, app);
server.listen(PORT, HOST, function (err) {
  if (err) {
    console.log(err);
    return;
  }

  console.log('Listening at ' + HOST + ':' + PORT);
});
