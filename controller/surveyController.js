var Survey = require('../model/Survey');
var User = require('../model/User');
var Evaluation = require('../model/Evaluation');
var validator = require('validator');
var moment = require('moment');
var async = require('async');

var surveyController = {};


var SURVEY_STATE_ACTIVATED = 'activated';
var SURVEY_STATE_STOPPED = 'stopped';
var SURVEY_STATE_ENDED = 'ended';
var SURVEY_STATE_SCHEDULED = 'scheduled';

surveyController.create = function(req, res) {
  var startAt = validator.toDate(req.body.startAt),
    endAt = validator.toDate(req.body.endAt);

  if (!startAt || !endAt || moment(endAt).isSameOrBefore(startAt)) {
    return res.json({
      error: true,
      message: 'Star date and/or end date are invalid'
    })
  }

  var state = SURVEY_STATE_SCHEDULED;

  if (moment().isAfter(startAt)) {
    state = SURVEY_STATE_ACTIVATED;
  }

  if (moment().isAfter(endAt)) {
    state = SURVEY_STATE_ENDED;
  }

  var survey = new Survey({
    title: req.body.title,
    startAt: startAt,
    endAt: endAt,
    description: req.body.description,
    state: state,
    createdBy: req.user.id,
    rules: req.body.rules
  });

  survey.save(function(err, survey) {
    if (err)
      return res.json(err);
    res.json(survey);
  })
}

surveyController.list = function(req, res) {
  Survey.find({})
        .populate({
          path: 'createdBy',
          select: '-password'
        })
        .exec(function(err, surveys) {
          if (err)
            return res.json(err);
          res.json(surveys);
  });
}

surveyController.stop = function(req, res) {
  var survey_id = req.params.id;
  Survey.findById(survey_id, function(err, survey) {
    if (err || survey.state != SURVEY_STATE_ENDED) {
      return res.json({'error': true, 'message': 'Action not possible'});
    }

    survey.state = SURVEY_STATE_STOPPED;

    survey.save(function(err, survey) {
      if (err) {
        return res.json({'error': true, 'message': 'Action not possible'});
      }
      return res.json(survey);
    });
  });
}

surveyController.get = function(req, res) {
  var survey_id = req.params.id;
  Survey.findById(survey_id)
        .populate({
          path: 'createdBy',
          select: '-password'
        })
        .exec(function(err, survey) {

    return res.json(survey);
  });
}


function checkRule(rule, users, employee) {
  var rule_type = rule.who.indexOf("team") == 0 ? "team" :
    (rule.who.indexOf("position") == 0 ? "position" : "all");
  var rule_value = rule.who.replace(rule_type + "-", "");
  console.log(rule_type);
  console.log(employee.position.title, rule.whom)
  if (rule_type == "all" ||
      (rule_type == "team" && rule_value == employee.team.title) ||
      (rule_type == "position" && rule_value == employee.position.title))
  {
    console.log(employee.position.title, rule.whom);
    switch (rule.whom) {
      case "his-team":
        return users.filter((u) => u.team.title == employee.team.title);
      case "his-position":
        return users.filter((u) => u.position.title == employee.position.title);
      case "all":
        return users;
      default:
        var rule_type = rule.whom.indexOf("team") == 0 ? "team" :
          (rule.whom.indexOf("position") ? "position" : "all");
        var rule_value = rule.who.replace(rule_type + "-", "");
        return users.filter((u) => u[rule_type].title == rule_value);
    }

  } else {
    return [];
  }
}


surveyController.users = function(req, res) {
  var survey_id = req.params.id;
  var user_id = req.user.id;

  async.parallel({
      user: (cb) => User.findById(user_id).populate('team position').exec(cb),
      survey: (cb) => Survey.findById(survey_id, cb),
      users: (cb) => User.find({_id: { $ne: user_id}}).populate('team position').exec(cb)
  }, function(err, results) {
    var employees = [];
    var employee = results.user._doc;
    results.survey.rules.forEach(function(rule) {
      employees = employees.concat(checkRule(rule, results.users, employee));
    });
    console.log(employee);
    console.log(results.survey.rules);
    res.json(employees);
  })
}


surveyController.addRule = function(req, res) {
  var survey_id = req.params.id;

  Survey.findById(survey_id, function(err, survey) {
    if (err)
      return res.json(err);
    survey.rules.push(req.body);
    survey.save(function(err, survey) {
      if (err)
        return res.json(err);
      return res.json(survey);
    });
  });
}

surveyController.deleteRule = function(req, res) {
  var survey_id = req.params.id;
  var rule_id = req.params.rule_id;
  Survey.findById(survey_id, function(err, survey) {
    if (err)
      return res.json(err);
    survey.rules.id(rule_id).remove();
    survey.save();
    return res.json(survey);
  });
}

surveyController.rateUser = function(req, res) {
  var survey_id = req.params.id;
  var user_id = req.user.id;

  async.waterfall([
      function(cb) {
        Survey.findById(survey_id, function(err, survey) { // Get Survey
          if (survey)
            return cb(null, survey);
          return cb(err, null);
        })
      }, function(survey, cb) { // Check if the survey contains the evaluation
        Evaluation.findOne({ employee: user_id }, function(err, evaluation) {
          if (evaluation) {
            if (survey.evaluations.indexOf(evaluation._id))
              return cb(null, evaluation);
            else
              return cb(null, null);
          }
          return cb(err, null);
        })
      }, function(evaluation, cb) { // Update or create the evaluation
        // TODO: I need to check if the employee can rate the subject employee
        if (!evaluation) {
          evaluation = new Evaluation({ employee: user_id});
          evaluation.save(cb)
        } else {
          cb(null, evaluation)
        }
      }, function(evaluation, cb) {
        var rate = evaluation.ratings.filter( (r) => r.employee == req.body.employee
                                              && r.rateCategory == req.body.rateCategory);
        console.log(evaluation);
        if (rate.length == 1) {
          evaluation.ratings.id(rate[0]._id).rate = req.body.rate;
        } else {
          evaluation.ratings.push(req.body);
        }
        evaluation.save(cb);
      }
  ], function(err, results) {
    if (err)
      return res.json(err);
    return res.json(results);
  })
}

module.exports = surveyController;
