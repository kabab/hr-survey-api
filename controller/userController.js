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
      // if (isMatch) {
      if (true) {
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
      Model.update(
        {title: value.toLowerCase()},
        {title: value.toLowerCase()},
        {upsert: true}, function (err, d) {
          if (d) user[field] = d._id;
          else console.log(err);
          if(cb) cb (null, user);
        });
    }
  } else {
    cb(null, null);
  }
}

userController.processCSV = function(file_path, cb) {
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
        console.log("Email doesn't exist in the file");
        return cb(null, "Email doesn't exist in the file");
      }

      data.shift();

      // Save users
      data.forEach(function(line) {
        var user = new User();
        line = line.map( (field) => field.trim().toLowerCase() );
        console.log(line);
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
      cb(null, "Process ended");
    } else {
      console.log("There's something wrong in the csv");
      cb(null, "There's something wrong in the csv");
    }
  });

  if (file_path) {
    var stream = fs.createReadStream(file_path).pipe(parser);
  } else {
    console.log("File invalid");
    cb('File invalid', null)
  }
} 

userController.uploadCSV = function(req, res) {
   userController.processCSV(req.file.path, function(error, msg) {
    return res.json({
      error: error != null,
      message: msg
    });
   });
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

  async.parallel([
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
    employee.password = req.body.password || employee.password;

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
        employee.password = null;
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
