function newVariable (name, dataType, plcName, address, access, unit = '', isAlarm = false, isHistory = false) {
    var _variable = {
        name : name,
        dataType : dataType,
        plcName : plcName,
        address : address,
        access : access,
        unit : unit,
        isAlarm : isAlarm,
        isHistory : isHistory,
    }
    return _variable;
}

function newPLC(name, protocol , ipAddress, variables = null){
    var _plc = {
        name : name,
        protocol : protocol,
        ipAddress : ipAddress,
        variables : variables
    }
    return _plc;
}

function newDevice(name, id, longitude = 106.660172, latitude = 10.762622, period = 5000, status = false, creationTime = new Date().toLocaleString(), lastActive = null, PLCs){
    var _device = {
        name : name,
        id : id,
        longitude : longitude,
        latitude : latitude,
        period : period, 
        status : status,
        creationTime : creationTime,
        lastActive : lastActive,
        PLCs : PLCs
    }
    return _device;
}

module.exports.newVariable = newVariable;
module.exports.newPLC = newPLC;
module.exports.newDevice = newDevice;