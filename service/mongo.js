var config = require('../config/config');
var mongoose = require('mongoose');

mongoose.Promise = global.Promise;
var promise = mongoose.connect(config.db);

// promise.then(function(d) {
//   console.log(`Connecting to ${config.db}`);
// }, function(err) {
//   console.log(`Error : ${err}`)
// });
