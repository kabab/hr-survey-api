var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ResponseSchema = new Schema({
  text: { type: String, required: true },
  weight: {type: Number, required: true}
});

var Answer = new Schema({
  question: {type: String, required: true },
  answer: ResponseSchema
});


var ResultSchema = new Schema({
  survey: {type: Schema.Types.ObjectId, ref: 'Survey', required: true},
  answers: [Answer],
  comment: String,
  employee: {type: Schema.Types.ObjectId, ref: 'User', required: true}
});


module.exports = mongoose.model('Result', ResultSchema);
