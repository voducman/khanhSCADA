var mqtt = require('mqtt');
var client = mqtt.connect('mqtt://test.mosquitto.org');

module.exports = {
    connect: function(){
        client.on('connect', function () {
            console.log('Connected to MQTT broker');
        });
        
        client.on('message', function (topic, message) {
            socket.emit(topic, message.toString());
        });
    },
    subscribeDevice: function (deviceID) {
        client.subscribe('/' + deviceID + '/' + 'status', function (err) { 
            if (err) console.log(err);
            else console.log('Subscribed topic: ' + deviceID + '/' + 'status');    
        });     
    
    }
}



