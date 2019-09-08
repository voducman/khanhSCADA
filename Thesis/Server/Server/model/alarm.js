var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.Promise = global.Promise; //Error if not declared

// var AlarmSchema = new Schema ({
//     source : String,
//     value : Number,
//     message : String,
//     type : String,
//     state: String,
//     timestamp : Date,
// } , {collection: 'alarm'});

var AlarmSchema =  new Schema({
        source: String,
        value: Number,
        message: String,
        type: String,
        state: String,
        timestamp: String,
    });

var Alarm = module.exports.createModel = function (collection) { 
    return mongoose.model('Alarm' , AlarmSchema , collection)
}

module.exports.createNewAlarm = function (newAlarm) {
    newAlarm.save();
    console.log('Write success to mongo alarm :' + newAlarm);
};


