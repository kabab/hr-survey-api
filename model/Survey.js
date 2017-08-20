var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/*
 * state: ('activated'|'stopped'|'ended'|'scheduled')
 *
 */

 var RuleSchema = new Schema({
   who: {type: String, required: true},
   whom: {type: String, required: true},
 });

var SurveySchema = new Schema({
  title: String,
  createAt: {type: Date, default: Date.now},
  startAt: {type: Date},
  endAt: {type: Date},
  description: String,
  state: {
    type: String,
    default: 'scheduled',
    enum: ['activated', 'stopped', 'ended', 'scheduled']
  },
  evaluations: [{ type: Schema.Types.ObjectId, ref: 'Evaluation' }],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  rules: [RuleSchema]
});

module.exports = mongoose.model('Survey', SurveySchema);
