var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.Promise = global.Promise; //Error if not declared

var HistorySchema =  new Schema({
        tag: String,
        type : String,
        address: String,
        value: String,
        timestamp : String,
    });

var History = module.exports.createModel = function (collection) { 
    return mongoose.model('History' , HistorySchema , collection)
}

module.exports.createNewHistory = function (newHistory) {
    newHistory.save();
    console.log('Write success to mongo history :' + newHistory);
};


