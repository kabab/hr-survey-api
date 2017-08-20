var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var RateSchema = new Schema({
  rate: {
    type: Number,
    min: [0, 'Minimum rating is 0'],
    max: [10, 'Maximum rating is 10']
  },
  rateCategory: String,
  employee: {type: Schema.Types.ObjectId, ref: 'User'}
});

var EvaluationSchema = new Schema({
  createdAt: {type: Date, default: Date.now},
  ratings: [RateSchema],
  employee: {type: Schema.Types.ObjectId, ref: 'User'}
});

module.exports = mongoose.model('Evaluation', EvaluationSchema);
