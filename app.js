var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var config = require('./config/config');
var passport = require('passport');
require('./service/google_auth');
var User = require('./model/User');
var jwt = require('jsonwebtoken');

var index = require('./routes/index');
var users = require('./routes/users');
var surveys = require('./routes/surveys');
var teams = require('./routes/teams');
var positions = require('./routes/positions');


require('./service/mongo');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});


app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((id, done) => {
    done(null, {test: 'hello'});
});

// app.use('/', index);
app.use('/', users);
app.use('/surveys', surveys);
app.use('/teams', teams);
app.use('/positions', positions);


/* Google auth */

app.get('/auth/google',
  passport.authenticate('google', { scope: ['email'] } ));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    var email = req.user.emails[0].value;
    User.findOne({email: email}, function(err, user) {
      if (!user)
        return res.redirect('/loginfailed');
      var tokenData = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        id: user._id,
        role: user.role
      }
      res.cookie('token', jwt.sign(tokenData, config.secret));
      return res.redirect('/')
    })
  });
app.get('/login', (req, res) => res.render('login'))

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
