var Team = require('../model/Team');
var User = require('../model/User');
var async = require('async');

TeamController = {};

TeamController.list = function(req, res) {
  async.parallel({
    users: (cb) => User.find({}, cb),
    teams: (cb) => Team.find({}, cb)
  }, function(err, results) {
    if (err)
      return res.json(err);
    var teams = results.teams;
    var users = results.users;
    var teams = teams.map((team) => 
      Object.assign({}, team._doc, {
        users: users.filter( u => u.team == team._id.toString())
      })
    );
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

TeamController.create = function(req, res) {
  var team = new Team(req.body);
  team.save(function(err, team) {
    if (err)
      return res.json(err)
    return res.json(team)
  });
}

module.exports = TeamController;
