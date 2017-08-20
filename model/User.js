var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require("bcrypt");
var Position = require('../model/Position');
var Team = require('../model/Team');
var SALT_WORK_FACTOR = 10;

var UserSchema = new Schema({
  firstName: String,
  lastName: String,
  email: {type: String, index: { unique: true }},
  password: String,
  role: [String],
  position : { type: Schema.Types.ObjectId, ref: 'Position' },
  team: { type: Schema.Types.ObjectId, ref: 'Team' }
});


UserSchema.pre("save", function(next) {
  var user = this;

  // only hash the password if it has been modified (or is new)
  if (!user.isModified('password')) return next();

  // generate a salt
  bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
      if (err) return next(err);

      // hash the password using our new salt
      bcrypt.hash(user.password, salt, function(err, hash) {
          if (err) return next(err);
          // override the cleartext password with the hashed one
          user.password = hash;

          next();
      });
  });

});

UserSchema.methods.comparePassword = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};


var User = mongoose.model('User', UserSchema);
module.exports = User;
