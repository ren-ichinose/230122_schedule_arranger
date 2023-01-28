var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const helmet = require('helmet');
const session = require('express-session');
const passport = require('passport');
const dotenv = require('dotenv');

dotenv.config();

// モデルの読み込み
const User = require('./models/user');
const Schedule = require('./models/schedule');
const Availability = require('./models/availability');
const Candidate = require('./models/candidate');
const Comment = require('./models/comment');
User.sync().then(async () => {
  Schedule.belongsTo(User, {foreignKey: 'createdBy'});
  Schedule.sync();
  Comment.belongsTo(User, {foreignKey: 'userId'});
  Comment.sync();
  Availability.belongsTo(User, {foreignKey: 'userId'});
  await Candidate.sync();
  Availability.belongsTo(Candidate, {foreignKey: 'candidateId'});
  Availability.sync();
});

const GitHubStrategy = require('passport-github2').Strategy;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID_ENV;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET_ENV;

passport.serializeUser((user, done) => { done(null, user); });
passport.deserializeUser((obj, done) => { done(null, obj); });

passport.use(new GitHubStrategy({
  clientID: GITHUB_CLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET,
  callbackURL: 'http://localhost:8000/auth/github/callback'
},
  (accessToken, refreshToken, profile, done) => {
    process.nextTick(async () => {
      await User.upsert({
        userId: profile.id,
        username: profile.username
      });
      done(null, profile)
    });
  }
));

var indexRouter = require('./routes/index');
const loginRouter = require('./routes/login');
const logoutRouter = require('./routes/logout');
const schedulesRouter = require('./routes/schedules');
const availabilitiesRouter = require('./routes/availabilities');

var app = express();
app.use(helmet());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({ 
  secret: process.env.SESSION_SECRET, 
  resave: false, 
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

app.use('/', indexRouter);
app.use('/login', loginRouter);
app.use('/logout', logoutRouter);
app.use('/schedules', schedulesRouter);
app.use('/schedules', availabilitiesRouter);

app.get('/auth/github',
  passport.authenticate('github', { scope: ['user:email'] }),
  (req, res) => {
});

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
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
