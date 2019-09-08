var fs = require('fs');

Number.prototype.pad = function(size) {
    var s = String(this);
    while (s.length < (size || 2)) {s = "0" + s;}
    return s;
  }

var path = 'P:\\NodeJS\\Server\\public\\images\\symbols\\Water_WasteWater';

var files = fs.readdirSync(path);
var number = 1;
files.forEach(file => {
    fs.renameSync(path + '\\' + file, path + '\\Water_WasteWater' + '_' + number.pad(3) + '.png');
    number++;
});


