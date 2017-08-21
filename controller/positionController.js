var Position = require('../model/Position');
var User = require('../model/User');
var async = require('async');

PositionController = {};

PositionController.list = function(req, res) {
  Position.find({}, function(err, positions) {
    if (err)
      return res.json(err);
    return res.json(positions);
  });
}

PositionController.get = function(req, res) {
  var id = req.params.id;

  async.parallel({
    position: (cb) => Position.findById(id, cb),
    users: (cb) => User.find({position: id}, cb)
  }, function(err, results) {
    if (err)
      return res.json(err);
    var position = Object.assign({}, results.position._doc, {users: results.users});
    return res.json(position);
  })
}

PositionController.delete = function(req, res) {
  var id = req.params.id;

  async.series([
      (cb) => User.update({ position: id }, { $set: { position: null } }, { multi: true }, cb),
      (cb) => Position.remove({_id: id}, cb)
  ], function(err) {
    if (err)
      return res.json(err);
    return res.sendStatus(200);
  })
}

PositionController.create = function(req, res) {
  var position = new Position(req.body);
  position.save(function(err, position) {
    if (err)
      return res.json(err)
    return res.json(position)
  });
}

module.exports = PositionController;
