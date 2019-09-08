var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');
var Schema = mongoose.Schema;
mongoose.Promise = global.Promise; //Error if not declared

var UserSchema = new Schema ({
    firstName : String,
    lastName : String,
    email : {type: String , require: true, trim: true},
    password: String,
    createdTime : {type : Date , default : Date.now},
} , {collection: 'user'});

var User = module.exports = mongoose.model('User',UserSchema);

module.exports.createUser = function (newUser) {
    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(newUser.password, salt, function(err, hash) {
            newUser.password = hash;
            newUser.save();
        });
    });
};

module.exports.getUserByEmail = function (email , callback) { 
    var query = {email : email};
    User.findOne(query, callback);
};

module.exports.checkPassword = function (pass, hash, callback) {
    bcrypt.compare (pass, hash, function (err, isMatch) { 
        if (err) console.log(err);
        callback(null, isMatch);
    });
};

module.exports.getUserById = function (id, callback) { 
    User.findById(id, callback);
}

 