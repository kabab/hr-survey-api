var User = require('../model/User');
var jwt = require('jsonwebtoken');
var config = require('../config/config');
var parse = require('csv-parse');
var fs = require('fs')
var Position = require('../model/Position');
var Team = require('../model/Team');
var async = require('async');
var mongoose = require('mongoose');

var userController = {}



var ROLE_ADMIN = 'admin';
var ROLE_EMPLOYEE = 'employee';

userController.create = function(req, res) {
  var user = new User(req.body);
  user.role = [ROLE_ADMIN];
  user.save(function(err, user) {
    if (err)
      res.json(err);
    user.password = null;
    res.json(user);
  });
}

userController.login = function(req, res) {
  User.findOne({email: req.body.email}, function(err, user) {
    if (err)
      return res.json(err);

    if (!user)
      return res.json({error: true, message: 'Authentication failed. Wrong password.'})

    user.comparePassword(req.body.password, function(err, isMatch) {
      if (isMatch) {
        var tokenData = {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          id: user._id,
          role: user.role
        }
        return res.json({token: jwt.sign(tokenData, config.secret)});
      } else {
        return res.json({ error: true, message: "Email or password are invalid"});
      }
    })

  })
}


var createOrGet = (user, field, value, Model, cb) => {
  // console.log();
  if (value && value.length > 0) {
    if (mongoose.Types.ObjectId.isValid(value)) {
      user[field] = value;
      cb(null, user);
    } else {
      Model.findOne({ title: value.toLowerCase() }, function(err, document) {
        console.log(err);
        if (err && cb) cb(err, null);
        if (!document) {
          var model = new Model({ title: value});
          model.save(function(err, d) {
            if (d) user[field] = d._id;
            else console.log(err);
            if(cb) cb (null, user);
          });
        } else {
          user[field] = document._id;
          if(cb) cb (null, user);
        }
      });
    }
  }
}

userController.uploadCSV = function(req, res) {
  /**
   * CSV parser
   */
  var parser = parse({delimiter: ','}, function(err, data) {
    if (data && data.length > 0) {
      data[0] = data[0].map( (field) => field.trim() );
      // TODO: Move this to configuration
      fields = ['firstName', 'lastName', 'email', 'position', 'team'];
      orders = fields
        // .map((field) => field.toLowerCase())
        .reduce((a, b) => {
          a[b] =  data[0].indexOf(b);
          return a;
        }, {});

      if (orders.email < 0) {
        return res.json({
          error: true,
          message: `Email doesn't exist in the file`
        });
      }

      data.shift();

      // Save users
      data.forEach(function(line) {
        var user = new User();
        line = line.map( (field) => field.trim().toLowerCase() );

        fields.filter((field) => ['position', 'team'].indexOf(field) == -1)
        .forEach((field) => {
          user[field] =
            orders[field] >= 0 && line[orders[field]].length > 0 ?
            line[orders[field]]:null
        });

        user.role = [ROLE_EMPLOYEE];
        async.series([
          (cb) => createOrGet(user, 'position', line[orders.position], Position, cb),
          (cb) => createOrGet(user, 'team', line[orders.team], Team, cb)
        ], function() {
          console.log('Importing user from csv');
          user.save(function(err) {
            if (err) console.log(err)
          });
        })
      })
      res.sendStatus(200);
    } else {
      res.json({error: true, message: "There's something wrong in the csv"});
    }
  });

  if (req.file) {
    fs.createReadStream(req.file.path).pipe(parser);
  } else {
    res.json({error: true, message: "CSV file invalid"});
  }
}

// userController.getCSV = function(req, res) {
//   res.statusSend(200);
// }
//

userController.getEmployees = function(req, res) {
  User.find({role: ROLE_EMPLOYEE})
    .populate("team position")
    .exec(function(err, users) {
      res.json(users);
    });
}

userController.createEmployee = function(req, res) {
  var user = new User({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    role: [ROLE_EMPLOYEE]
  });

  async.series([
    (cb) => createOrGet(user, 'position', req.body.position, Position, cb),
    (cb) => createOrGet(user, 'team', req.body.team, Team, cb)
  ], function() {
    user.save(function(err, user) {
      if (err) res.json(err);
      else res.json(user);
    });
  });
}

userController.updateEmployee = function(req, res) {
  var id = req.params.id;

  User.findById(id, function(err, employee) {
    if (err) {
      return res.json(err);
    }

    if (!employee) {
      return res.json({error: true, message: "Employee not found"});
    }

    employee.firstName = req.body.firstName || employee.firstName;
    employee.lastName = req.body.lastName || employee.lastName;
    employee.email = req.body.email || employee.email;

    async.parallel([
        (cb) => req.body.position ?
        createOrGet(employee, 'position', req.body.position, Position, cb):
        cb(null, employee),

        (cb) => req.body.team ?
        createOrGet(employee, 'team', req.body.team, Team, cb):
        cb(null, employee),
    ], function(err, results) {
      employee.save(function(err, employee) {
        if (err)
          return res.json(err);
        return res.json(employee);
      });
    });

  });
}

userController.deleteEmployee = function(req, res) {
  var id = req.params.id;

  User.remove({_id: id}, function(err) {
    if (err)
      res.json(err);
    else
      res.sendStatus(200);
  });
}

module.exports = userController;
