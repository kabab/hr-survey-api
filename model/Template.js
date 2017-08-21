var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ChoiceSchema = new Schema({

});

var QuestionSchema = new Schema({
  question: { type: String, required: true }
  choices: [ChoiceSchema]
});


var TemplateSchema = new Schema({
  title: { type: String, required: true },
  questions: [QuestionSchema]
});

TeamSchema.pre('save', function(next) {
  this.title = this.title.toLowerCase();
  next();
});

module.exports = mongoose.model('Team', TeamSchema);
