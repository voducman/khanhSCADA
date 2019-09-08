var express = require('express');
var router = express.Router();
var passport = require('passport')
var LocalStrategy = require('passport-local').Strategy;
var fs = require('fs');
var path = require('path');
var async = require('async');
var recursive = require("recursive-readdir");
var moment = require('moment');


var databasePath = '../Server/Database';
var symbolPath = '../Server/public/images/symbols';
var userManualPath = '../Server/public/document/user_manual.pdf';

var userModel = require('../model/user');
var file = require('../model/fileSystem');

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/LuanVan2019DB', { useNewUrlParser: true });

/* GET home page. */
router.get('/', function (req, res, next) {
  res.redirect('/login');
});

/* GET register page. */
router.get('/register', checkLogin, function (req, res, next) {
  res.render('register', { errors: null });
});

/* POST register. */
router.post('/register', function (req, res, next) {
  userModel.getUserByEmail(req.body.email, function (err, userFound) {
    var errors = [];
    if (err) console.log(err);
    if (userFound) {
      var err = {};
      err.msg = "Existing email address";
      errors.push(err);
    }
    else {
      req.checkBody('password_confirmation', 'Password confirmation does not match').equals(req.body.password);
      errors = req.validationErrors();
    }

    if (errors) {
      res.render('register', { errors: errors });
    } else {
      var UserSchema = new userModel({
        firstName: req.body.first_name,
        lastName: req.body.last_name,
        email: req.body.email,
        password: req.body.password,
      });
      userModel.createUser(UserSchema);
      req.flash('success_msg', 'Successful registration');
      file.createUserDir(req.body.email);
      res.redirect('/');
    }
  });
});

passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
},
  function (username, password, done) {
    userModel.getUserByEmail(username, function (err, userFound) {
      if (err) console.log(err);
      if (!userFound)
        return done(null, false, { message: 'This email does not exist. Please register before' });
      userModel.checkPassword(password, userFound.password, function (err, isMatch) {
        if (err) console.log(err);
        if (isMatch)
          return done(null, userFound);
        else return done(null, false, { message: 'Wrong password' });
      });
    });
  }
));

passport.serializeUser(function (email, done) {
  done(null, email.id);
});

passport.deserializeUser(function (id, done) {
  userModel.getUserById(id, function (err, email) {
    done(err, email);
  });
});


/* GET login page. */
router.get('/login', checkLogin, function (req, res, next) {
  res.render('login', { errors: null });
});

router.post('/login',
  passport.authenticate('local', {
    successRedirect: '/device',
    failureRedirect: '/login',
    failureFlash: true
  }
  ));

/* GET logout page. */
router.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/login');
});

/* GET device (main) page. */
router.get('/device', checkAuthtication, function (req, res, next) {
  res.render('device', { errors: null, user: req.user.email });
});

/* GET design page. */
router.get('/design/:user/:filename', checkAuthtication, function (req, res, next) {
  var variableList = [];
  var arrSymbols = [];
  var arrDesign = [];

  var deviceID = req.params.filename.substring(
    req.params.filename.lastIndexOf("Config_") + 7,
    req.params.filename.lastIndexOf(".json"));

  async.parallel([
    function (callback) {
      fs.readFile(path.resolve(databasePath, req.params.user, 'Config', req.params.filename), function (err, data) {
        if (err) callback(err);
        JSON.parse(data).PLCs.forEach(plc => {
          plc.variables.forEach(variable => {
            var variableObject = {
              name: variable.name,
              dataType: variable.dataType,
              address: variable.address,
              plcName: plc.name,
              plcAddress: plc.ipAddress,
              plcProtocol: plc.protocol,
            };
            variableList.push(variableObject);
          });
        });
        callback();
      });
    },

    function (callback) {
      var arrFolders = fs.readdirSync(symbolPath);
      if (arrFolders) {
        arrFolders.forEach(function (folder) {
          var _arrSymbol = fs.readdirSync(path.resolve(symbolPath, folder));
          var _obj = {
            folder: folder,
            symbols: _arrSymbol,
          }
          arrSymbols.push(_obj);
        })
      }
      callback();
    },
    //Get saved designs
    function(callback) {
      var designPath = path.resolve(databasePath, req.params.user, 'Save', 'Design');
      recursive(designPath, function(err, files) {
        if (err) console.log(err);
        else {
          files.forEach(file => {
            arrDesign.push({
              name: path.basename(file),
              time : moment(fs.statSync(file).mtime).format('YYYY-MM-DD HH:mm:ss')
            })
          });
        }
        callback();
      })
    }
  ], function (err) {
    if (err) console.log(err);
    console.log(arrSymbols);
    res.render('designPage', { user: req.user.email, variableList: variableList, deviceID: deviceID, arrSymbols: arrSymbols, designFiles : arrDesign });

  });
});

/* GET published page */
router.get('/published/:user/:fileName', checkAuthtication, function (req, res, next) {
  var deviceId = req.params.fileName.replace('Device_', '').replace('_publish.ejs', '');
  console.log(deviceId);
  res.render(req.params.user + '/Publish/' + req.params.fileName, { user: req.params.user, deviceID: deviceId });
})

/* GET user manual */
router.get('/userManual', checkAuthtication, function (req, res, next) {
  res.download(userManualPath);
})

// router.get('/design', checkAuthtication, function(req, res, next) {
//   res.render('designPage',{user : req.user.email});

// });


//Check if user logins: TRUE = prevent login , FALSE = allow login
function checkLogin(req, res, next) {
  if (!req.isAuthenticated()) next();
  else res.redirect('/device');
}

//Allow access device page if user login
function checkAuthtication(req, res, next) {
  if (req.isAuthenticated()) next();
  else res.redirect('/login');
}

//Read symbol dir
async function readSymbolDir(_path) {

}


module.exports = router;
