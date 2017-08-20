var Team = require('../model/Team');
var User = require('../model/User');
var async = require('async');

TeamController = {};

TeamController.list = function(req, res) {
  Team.find({}, function(err, teams) {
    if (err)
      return res.json(err);
    return res.json(teams);
  });
}

TeamController.get = function(req, res) {
  var id = req.params.id;

  async.parallel({
    team: (cb) => Team.findById(id, cb),
    users: (cb) => User.find({team: id}, cb)
  }, function(err, results) {
    if (err)
      return res.json(err);
    var team = Object.assign({}, results.team._doc, {users: results.users});
    return res.json(team);
  })
}

TeamController.delete = function(req, res) {
  var id = req.params.id;

  async.series([
      (cb) => User.update({ team: id }, { $set: { team: null } }, { multi: true }, cb),
      (cb) => Team.remove({_id: id}, cb)
  ], function(err) {
    if (err)
      return res.json(err);
    return res.sendStatus(200);
  })

}

module.exports = TeamController;
