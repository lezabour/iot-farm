// Load the page
// NB: This needs to be the last route added
exports.serveIndex = function (app, staticFolder) {
  app.get('/', function (req, res) {
    res.sendFile('index.html', { root: staticFolder });
  });
  app.get('video-streaming.html', function (req, res) {
    res.sendFile('video-streaming.html', { root: staticFolder });
  });
  app.get('control-robot.html', function (req, res) {
    res.sendFile('control-robot.html', { root: staticFolder });
  });
};

