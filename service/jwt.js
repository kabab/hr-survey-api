var jwt = require('jsonwebtoken');
var config = require('../config/config');

module.exports = function(req, res, next) {
  var authorization = req.get('Authorization');
  if (!authorization) {
    return res.sendStatus(401);
  }

  var token = authorization.replace(/Bearer /g, '');
  jwt.verify(token, config.secret, function(err, decoded) {
    if (err) {
      return res.sendStatus(401);
    }
    req.user = decoded;
    next();
  });
}
