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

var ResponseSchema = new Schema({
  text: { type: String, required: true },
  weight: {type: Number, required: true}
});

var QuestionSchema = new Schema({
  name: { type: String,  required: true },
  responses: [ResponseSchema]
});

var TopicSchema = new Schema({
  name: String,
  questions: [QuestionSchema]
});

var SurveySchema = new Schema({
  type: { type: String, required: true, enum: ['motivation', '360'] },
  title: { type: String, required: true },
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
  rules: [RuleSchema],
  topics: [TopicSchema],
});

module.exports = mongoose.model('Survey', SurveySchema);
