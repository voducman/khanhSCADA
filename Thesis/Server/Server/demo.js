var mongoose = require('mongoose');
var async = require('async');
var alarmMongoose = require('./model/alarm')
var mongoBaseUrl = 'mongodb://localhost:27017/Device_';
var fs = require('fs');
var recursive = require("recursive-readdir");
var path = require('path');

var databasePath = '../Server/Database';
var user = 'nmkhanhbk@gmail.com';
var designPath = path.resolve(databasePath, user,'Save', 'Design');

recursive(designPath, function(err, files) {
    if (err) console.log(err);
    else {
        files.forEach( file => {
            console.log(fs.statSync(file).mtime);
            console.log(path.basename(file));
        })
    }
})