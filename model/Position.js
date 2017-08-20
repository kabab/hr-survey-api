var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PositionSchema = new Schema({
  title: {
    type: String,
    min: [1, 'Title is short, min is 1'],
    max: [30, 'Title is so long, max is 30'],
    required: true
  }
  // users: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

PositionSchema.pre('save', function(next) {
  this.title = this.title.toLowerCase();
  next();
});

module.exports = mongoose.model('Position', PositionSchema);
