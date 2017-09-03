var Survey = require('../model/Survey');
var User = require('../model/User');
var Evaluation = require('../model/Evaluation');
var validator = require('validator');
var moment = require('moment');
var async = require('async');
var url = require('url');
var Result = require('../model/Result');

var mongoose = require('mongoose');

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
    type: req.body.type.toLowerCase(),
    title: req.body.title,
    startAt: startAt,
    endAt: endAt,
    description: req.body.description,
    state: state,
    createdBy: req.user.id
  });

  if (survey.type == '360') {
    survey.rules = req.body.rules;
  } else {
    survey.topics = req.body.topics;
  }

  survey.save(function(err, survey) {
    if (err)
      return res.json(err);
    res.json(survey);
  })
}

function isUserSurvey(survey, user) {
  var rules = survey.rules;
  for(var i = 0; i < rules.length; i++) {
    if (rules[i].who == 'all')
      return true;
    if (user.position && rules[i].who == "position-" + user.position.title) return true;
    if (user.team && rules[i].who == "team-" + user.team.title) return true;
  }
  return false;
}

surveyController.list = function(req, res) {
  var url_parts = url.parse(req.url, true);
  var query = url_parts.query;

  var user = req.user;
  console.log(user);
  var filter = {};
  if (query.type && /(motivation|360)/i.test(query.type)) {
    filter = { type: query.type.toLowerCase() }
  }

  Survey.find(filter)
    .populate({
      path: 'createdBy',
      select: '-password'
    })
    .exec(function(err, surveys) {
      if (err)
        return res.json(err);

      if ((filter.hasOwnProperty("type")
        && filter["type"] == 'motivation')
        || user.role.indexOf('admin') >= 0) {
        return res.json(surveys);
      }

      User.findById(user.id).populate('team position').exec(function(err, user) {
        if (err) return res.json(err);
        console.log(user);
        surveys = surveys.filter((s) => isUserSurvey(s, user) || s.type == 'motivation')
        return res.json(surveys)
      });
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
  if (rule_type == "all" ||
      (rule_type == "team" && rule_value == employee.team.title) ||
      (rule_type == "position" && rule_value == employee.position.title))
  {
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
    var survey = results.survey;
    if (survey.type && survey.type == 'motivation') {
      return res.json({type: 'error', message: 'This is a motivation survey'});
    }

    var employees = [];
    var employee = results.user._doc;
    results.survey.rules.forEach(function(rule) {
      employees = employees.concat(checkRule(rule, results.users, employee));
    });
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

  var _survey = null;

  async.waterfall([
      function(cb) {
        Survey.findById(survey_id, function(err, survey) { // Get Survey
          if (survey)
            return cb(null, survey);
          cb({'error': true, message: "Survey not found"}, null);
        })
      }, function(survey, cb) { // Check if the survey contains the evaluation
        // TODO: make this better, I know it's ugly
        _survey = survey;
        Evaluation.findOne({ employee: user_id }, function(err, evaluation) {
          if (evaluation) {
            if (survey.evaluations.indexOf(evaluation._id))
              return cb(null, evaluation);
            else
              return cb(null, evaluation);
          }
          return cb(err, null);
        })
      }, function(evaluation, cb) { // Update or create the evaluation
        // TODO: I need to check if the employee can rate the subject employee
        console.log(evaluation);
        if (!evaluation) {
          evaluation = new Evaluation({ employee: user_id, survey: _survey._id});
          evaluation.save((err, evaluation) => cb(null, evaluation))
        } else {
          cb(null, evaluation)
        }
      }, function(evaluation, cb) {
        var rate = evaluation.ratings.filter( (r) => r.employee == req.body.employee
                                              && r.rateCategory == req.body.rateCategory);

        if (rate.length == 1) {
          evaluation.ratings.id(rate[0]._id).rate = req.body.rate;
          evaluation.ratings.id(rate[0]._id).comment = req.body.comment;
        } else {
          evaluation.ratings.push(req.body);
        }
        evaluation.save(cb);
      }
  ], function(err, results) {
    if (err)
      return res.json(err);
    if (_survey.evaluations.indexOf(results._id) < 0) {
      console.log(_survey.evaluations);
      _survey.evaluations.push(results._id);
      _survey.save(function(err, s) {
        if (err)
          return res.json(err);
        return res.json(results);
      });
    } else {
      return res.json(results);
    }
  })
}

surveyController.getRatings = function(req, res) {
  var survey_id = req.params.id;
  var user_id = req.user.id;

  Survey.findById(survey_id).populate("evaluations").exec(function(err, survey) {
    if (err)
      return res.json(err);
    survey.evaluations = survey.evaluations.filter((e) => e.employee == user_id);
    return res.json(survey);
  })
}

surveyController.sendResult = function(req, res) {
  var survey_id = req.params.id;
  var user = req.user;

  async.series([
    (cb) => Survey.findOne({ _id: survey_id, type: 'motivation'}, function(err, survey) {
      if (err) return cb(err, null);
      if (!survey) return cb('Survey not found', null);
      return cb(null, survey);
    }),
    function(cb) {
      Result.findOne({  survey: survey_id,  employee: user.id }, function(err, res) {
        console.log(user.id);
        console.log(res);
        if (res) return cb({error: true, message: "Already submitted survey"}, null);
        else cb(null, 'not found')
      })
    }
  ], function(err, result) {
    if (err) return res.json(err);
    var result = new Result(req.body);
    result.survey = survey_id;
    result.employee = user.id;

    result.save(function(err, result) {
      if (err) return res.json(err);
      return res.json(result);
    });
  });
}

surveyController.getResult = function(req, res) {
  var survey_id = req.params.id;
  var user = req.user;

  Result
    .find({survey: survey_id})
    .populate("employee survey")
    .exec((err, results) => res.json(err ? err : results));
}

const lookup = (from, localField, foreignField, as) => ({
  $lookup: { from, localField, foreignField, as }
})

const unwind = ($unwind) => ({ $unwind: { path: $unwind, preserveNullAndEmptyArrays: true } })


surveyController.s360Result = function(req, res) {
  var survey_id = req.params.id;
  var url_parts = url.parse(req.url, true);
  var query = url_parts.query;

  var pipeline = [];

  if (query.survey_id && mongoose.Types.ObjectId.isValid(query.survey_id)) {
    pipeline.push({
      $match: {
        survey: mongoose.Types.ObjectId(query.survey_id)
      }
    });
  }

  pipeline = pipeline.concat([
    unwind('$ratings'),
    lookup('users', 'ratings.employee', '_id', 'employee'),
    unwind('$employee'),
    lookup('teams', 'employee.team', '_id', 'team'),
    lookup('positions', 'employee.position', '_id', 'position'),
    lookup('surveys', 'survey', '_id', 'survey'),
    unwind('$position'),
    unwind('$team'),
    unwind('$survey')
  ]);

  var group = {
    $group: {
      _id: {
        employee: "$ratings.employee",
        rateCategory: "$ratings.rateCategory",
        name: {
          firstName: "$employee.firstName",
          lastName: "$employee.lastName"
        }
      },
      avg: {
        $avg: "$ratings.rate"
      },
      max: {
        $max: "$ratings.rate"
      },
      min: {
        $min: "$ratings.rate"
      }     
    }
  }

  // if (query.by && /^team|position$/i.test(query.by))
  //   group.$group._id[query.by.toLowerCase()] = "$" + query.by.toLowerCase();

  pipeline.push(group);
  //
  pipeline = pipeline.concat([
    {
      $group: {
        _id: {
          employee: "$_id.employee",
          name: {
            firstName: "$_id.name.firstName",
            lastName: "$_id.name.lastName"
          }
        },
        ratings: {
          $push: "$$ROOT"
        }
      }
    },
    {
      $project: {
        "_id": false,
        "employee_id": "$_id.employee",
        "firstName": "$_id.name.firstName",
        "lastName": "$_id.name.lastName",
        "ratings": {
          "$map": {
            "input": "$ratings",
            "as": "el",
            "in": {
              "rateCategory": "$$el._id.rateCategory",
              "avg": "$$el.avg",
              "min": "$$el.min",
              "max": "$$el.max"
            }
          }
        }
      }
    }
  ])


  Evaluation
    .aggregate(pipeline)
    .exec((err, results) => res.json(err ? err : results))
}

/*************************/



surveyController.motivationResult = function(req, res) {
  var user = req.user;
  var url_parts = url.parse(req.url, true);
  var query = url_parts.query;

  var pipeline = [];

  if (query.survey_id && mongoose.Types.ObjectId.isValid(query.survey_id)) {
    pipeline.push({
      $match: {
        survey: mongoose.Types.ObjectId(query.survey_id)
      }
    });
  }

  pipeline = pipeline.concat([
    lookup('users', 'employee', '_id', 'employee'),
    unwind("$employee"),
    lookup('positions', 'employee.position', '_id', 'position'),
    unwind("$position"),
    lookup('teams', 'employee.team', '_id', 'team'),
    unwind("$team"),
    lookup('surveys', 'survey', '_id', 'survey'),
    unwind("$survey"),
    unwind("$answers"),
    {
      $project: {
          "employee_id": "$employee._id",
          "survey_id": "$survey._id",
          "survey_date": "$survey.startAt",
          "position": "$position.title",
          "team": "$team.title",
          "answers.answer.weight": 1
      }
    }
  ]);

  var group = {
    $group : {
      _id: {
        survey: "$survey_id",
        survey_date: "$survey_date",
      },
      avg: { 
        $avg: "$answers.answer.weight"
      }
    }
  };

  if (query.by && /^team|position$/i.test(query.by))
    group.$group._id[query.by.toLowerCase()] = "$" + query.by.toLowerCase();

  pipeline.push(group);
  pipeline.push({
    $project: {
        "_id": 0,
        "survey_id": "$_id.survey",
        "survey_date": "$_id.survey_date",
        "team": "$_id.team",
        "position": "$_id.position",
        "avg": 1
    }
  })

  // TODO: check if admin
  Result
    .aggregate(pipeline)
    .exec( (err, results) => res.json(err ? err : results))

  // {
  //   $group: {
  //       _id: {
  //         survey_id: "$survey._id",
  //         position: "$position.title"
  //       },
  //       avg: { $avg: "$answers.answer.weight" }
  //   }
  // }

  // By survey
  // By teams
  // By position
}


surveyController.surveyResults = function(req, res) {
  var user = req.user;
  var url_parts = url.parse(req.url, true);
  var query = url_parts.query;

  switch(query.type) {
    case "360":
      return surveyController.s360Result(req, res);
    case "motivation":
      return surveyController.motivationResult(req, res);
    default:
      return res.sendStatus(404);
  }
}

surveyController.getRatings = function(req, res) {
  var survey_id = req.params.id;
  var user_id = req.user.id;

  Survey.findById(survey_id).populate("evaluations").exec(function(err, survey) {
    if (err)
      return res.json(err);
    survey.evaluations = survey.evaluations.filter((e) => e.employee == user_id);
    return res.json(survey);
  })
}

surveyController.motivationLine = function(req, res) {
  // By survey
  // By teams
  // By position
}

module.exports = surveyController;
