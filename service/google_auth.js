var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

// Use the GoogleStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a token, tokenSecret, and Google profile), and
//   invoke a callback with a user object.
passport.use(new GoogleStrategy({
    clientID: "571877484125-pdfe3l29vqv73q7fk1fs4126c8jo7jpu.apps.googleusercontent.com",
    clientSecret: "bwHMXl89I1xi0gEbYnPGzdN4",
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  function(token, tokenSecret, profile, done) {
    done(null, profile);
  }
));
