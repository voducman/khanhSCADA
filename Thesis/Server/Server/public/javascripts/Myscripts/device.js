'use strict'
//Global variable
let deviceObject = {};
let rcvDeviceObject = [];
let deviceIndex;
const regexPattern = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;
let isLoaded = false;

$(document).ready(function () {
    var _user = $('#user').text();
    var socket = io();

    //Init view
    $('.input-alarm').prop('disabled', true)

    socket.on('connect', function () {

        socket.on('/' + _user + '/resDeviceConfig', function (data) {
            console.log(data);
            rcvDeviceObject = data;
            if (!isLoaded) {
                isLoaded = true;
                loadDeviceTable(rcvDeviceObject);
                socketOnStatus(socket); //Subscribe status topic

                //Choose first td when click on tr
                $('table tbody tr').each(function () {
                    $(this).click(function () {
                        var checkbox = $(this).find('input');
                        checkbox.prop('checked', !checkbox.prop('checked'));
                    });

                    $(this).hover(function () {
                        $(this).css('cursor', 'pointer');
                    })
                });
            }

        });

        socket.emit('/reqDeviceConfig', _user); //Get device config array

        $('#sidebarButton').on('click', function () {
            $('#sidebar').toggleClass('active');
            var icon = $(this).children('i')[0];
            $(icon).toggleClass('fa-arrow-left');
            $(icon).toggleClass('fa-bars');
        });

        //Clear all inputs after modal closes
        $('body').on('hidden.bs.modal', '.modal', function () {
            $(".modal-body input").val("");
        });

        //Gateway children (PLCs) modal
        $('#gatewayChildrenModal').on('show.bs.modal', function (event) {
            var modal = $(this);
            deviceIndex = $(event.relatedTarget).attr('data-index');
            loadPLCModal(modal, rcvDeviceObject[deviceIndex]);
        });

        //Variable modal
        $('#variableModal').on('show.bs.modal', function (event) {
            var modal = $(this);
            var plcIndex = $(event.relatedTarget).attr('data-index');
            loadVariables(modal, rcvDeviceObject[deviceIndex].PLCs[plcIndex]);
        });

        //Create new device
        $('#newDeviceModal').one('show.bs.modal', function (event) {
            var modalItem = $(this);
            //console.log($(this));
            $(this).find('.btnNext').on('click', function (nextEvent) {
                if (!(modalItem.find('.inputName')[0].value && modalItem.find('.inputID')[0].value)) {
                    alert('Fill in required parameters');
                }
                else { //Filled
                    deviceObject.deviceName = modalItem.find('.inputName')[0].value;
                    deviceObject.deviceID = modalItem.find('.inputID')[0].value;
                    deviceObject.longitude = modalItem.find('.inputLongitude')[0].value;
                    deviceObject.latitude = modalItem.find('.inputLatitude')[0].value;
                    if (modalItem.find('.inputInterval')[0].value != 0)
                        deviceObject.period = modalItem.find('.inputInterval')[0].value;
                    else deviceObject.period = 5000;
                    deviceObject.PLCs = [];
                    deviceObject.user = _user;
                    deviceObject.creationTime = moment().format('YYYY-MM-DD HH:mm:ss');
                    deviceObject.lastActive = '';
                    deviceObject.published = false;

                    modalItem.modal('hide');
                    //Add new row to device table
                    var htmlMarkup = `
                    <tr>
                        <td class = "text-center"><input type = "checkbox"></td>
                        <td class = "text-center">` + deviceObject.deviceName + `</td>
                        <td class = "text-center">` + deviceObject.creationTime + `</td>
                        <td class = "text-center">` + deviceObject.lastActive + `</td>
                        <td class = "text-center">` + deviceObject.longitude + `</td>
                        <td class = "text-center">` + deviceObject.latitude + `</td>
                        <td class = "text-center">` + deviceObject.period + `</td>
                        <td class = "text-center"><span class="rounded-circle bg-secondary status"></span></td>
                        <td class = "text-center">
                            <i class="fas fa-cog variable-icon" data-toggle="modal" data-target="#gatewayChildrenModal">
                        </td>
                        <td class = "text-center"><a class = "btn btn-link btn-warning btn-block " style="max-width:180px" href = "/design/` + _user + '/deviceConfig_' + deviceObject.deviceID + '.json' + `">Designable</a></td>
                        <td ><i class="fas fa-pencil-alt function-icon" data-toggle="modal" data-target="#editGatewayModal"></i></td>
                    </tr>
                    `
                    $('#deviceTable tbody').append(htmlMarkup);

                    $('#newPLCModal').modal('show');
                }

            });
        });

        $('#newPLCModal').one('show.bs.modal', function (event) {
            var modalItem = $(this);
            $('#btnAddNewPLC').on('click', function (clickEvent) {
                var plcName = modalItem.find('.inputName')[0].value,
                    plcProtocol = modalItem.find('[name=protocol]').val(),
                    plcIPAddress = modalItem.find('.inputIPAddress')[0].value;
                if (!(plcName && plcIPAddress)) {
                    alert('Please fill required parameters');
                }
                else if (!regexPattern.test(plcName)) alert('Invalid PLC name');
                else {
                    var newPLC = {
                        name: plcName,
                        protocol: plcProtocol,
                        ipAddress: plcIPAddress,
                        variables: [],
                    }
                    deviceObject.PLCs.push(newPLC);
                    deviceObject.status = false;

                    var htmlMarkup = `
                    <tr>
                        <td><input type = "checkbox"></td>
                        <td>` + plcName + `</td>
                        <td>` + plcProtocol + `</td>
                        <td>` + plcIPAddress + `</td>
                    </tr>
                    `;
                    $('#plcTable tbody').append(htmlMarkup);
                    $('.modal-body').css({
                        'max-height': '600px',
                        'overflow-y': 'scroll'
                    });

                    $('#plcTable tbody tr:last').click(function () {
                        var checkbox = $(this).find('input');
                        checkbox.prop('checked', !checkbox.prop('checked'));
                    });
                    $('#plcTable tbody tr:last').hover(function () {
                        $(this).css('cursor', 'pointer');
                    });

                    //Clear old PLC
                    modalItem.find('.inputName')[0].value = '';
                    modalItem.find('.inputIPAddress')[0].value = '';
                }
            });

            modalItem.find('.btnNext').on('click', function (clickEvent) {
                var rows = $('#plcTable tr').length - 1;
                if (rows > 0) {
                    modalItem.modal('hide');
                    $('#addNewVariable').modal('show');
                }
                else alert('Please add a new PLC');
            });
        });

        $('#addNewVariable').one('show.bs.modal', function (evebt) {
            var modalItem = $(this);
            deviceObject.PLCs.forEach(plc => {
                var _option = new Option(plc.name, plc.name);
                $(_option).html(plc.name);
                modalItem.find('[name=plc]').append(_option);
            });
            modalItem.find('.btnAdd').on('click', function (clickEvent) {
                if (!(modalItem.find('.inputName')[0].value && modalItem.find('.inputAddress')[0].value)) {
                    alert('Please fill required parameters');
                }
                else if (!regexPattern.test(modalItem.find('.inputName')[0].value))
                    alert('Invalid variable name');
                else {
                    var variableObject = {};
                    variableObject.name = modalItem.find('.inputName')[0].value;
                    variableObject.dataType = modalItem.find('[name=dataType]').val();
                    variableObject.plc = modalItem.find('[name=plc]').val();
                    variableObject.address = modalItem.find('.inputAddress')[0].value;
                    variableObject.access = modalItem.find('[name=access]').val();
                    variableObject.unit = modalItem.find('.inputUnit')[0].value;
                    variableObject.isAlarm = modalItem.find('.inputAlarm')[0].checked;
                    if (variableObject.isAlarm) { //isAlarm is ON
                        variableObject.alarmType = modalItem.find('.alarm-type').val();
                        variableObject.parameters = {
                            lolo: modalItem.find('.lolo')[0].value,
                            lo: modalItem.find('.lo')[0].value,
                            hi: modalItem.find('.hi')[0].value,
                            hihi: modalItem.find('.hihi')[0].value,
                            deadband: modalItem.find('.deadband')[0].value,
                        }
                    } else { //Alarm is off
                        variableObject.alarmType = null;
                        variableObject.parameters = {
                            lolo: null,
                            lo: null,
                            hi: null,
                            hihi: null,
                            deadband: null,
                        }
                    }
                    variableObject.isHistory = modalItem.find('.inputHistory')[0].checked;

                    for (var plc of deviceObject.PLCs) {
                        if (plc.name == variableObject.plc) {
                            plc.variables.push(variableObject);
                            break;
                        }
                    }

                    var htmlMarkup = `
                    <tr>
                        <td><input type = "checkbox"></td>
                        <td>` + variableObject.name + `</td>
                        <td>` + variableObject.dataType + `</td>
                        <td>` + variableObject.plc + `</td>
                        <td>` + variableObject.address + `</td>
                        <td>` + variableObject.access + `</td>
                        <td>` + variableObject.unit + `</td>
                        <td>` + variableObject.isAlarm + `</td>
                        <td>` + variableObject.isHistory + `</td>
    
                    </tr>
                    `
                    $('#tableVariableList tbody').append(htmlMarkup);
                    $('.modal-body').css({
                        'max-height': '600px',
                        'overflow-y': 'scroll'
                    });

                    $('#tableVariableList tbody tr:last').click(function () {
                        var checkbox = $(this).find('input');
                        checkbox.prop('checked', !checkbox.prop('checked'));
                    });
                    $('#tableVariableList tbody tr:last').hover(function () {
                        $(this).css('cursor', 'pointer');
                    });


                    //Clear old variable
                    modalItem.find('.inputName')[0].value = '';
                    modalItem.find('.inputAddress')[0].value = '';
                    modalItem.find('.inputUnit')[0].value = '';
                    modalItem.find('.inputAlarm')[0].checked = false;
                    modalItem.find('.inputHistory')[0].checked = false;
                    $('.input-alarm').prop('disabled', true);
                }
            });

            modalItem.find('.btnSave').on('click', function (clickEvent) {
                socket.emit('deviceConfig', JSON.stringify(deviceObject, null, 4));
                location.reload();
                socket.emit('reqDeviceConfig', _user); //Get device config array
            });
        });

        //Delete row
        $(".delete-row").click(function () {
            $('table tbody').find('input[type="checkbox"]').each(function () {
                if ($(this).is(":checked")) {
                    if ($(this).closest('table')[0].id == 'deviceTable') {
                        var delRow = $(this).parents("tr");
                        var delDevice = $(this).parents("tr").find('td')[1].innerHTML;
                        for (var device of rcvDeviceObject) {
                            if (device.deviceName == delDevice) {
                                socket.on('deleteSuccess', function (data) {
                                    delRow.remove();
                                    rcvDeviceObject.splice(rcvDeviceObject.indexOf(device), 1);
                                    console.log(rcvDeviceObject);
                                });
                                socket.emit('deleteDevice', device.user + '/Config/' + device.fileName);
                                break;
                            }
                        }
                    }
                    else { //Delete PLC, variable

                        //Remove from deviceObject
                        var tableId = $(this).closest('table')[0].id;
                        var deleteRow = $(this).parents('tr');
                        var tds = deleteRow.find('td');

                        if (tableId == 'plcTable') {    //PLC
                            var plcName = tds[1].innerText;
                            var plcAddress = tds[3].innerText;

                            for (var i = 0; i < deviceObject.PLCs.length; i++) {
                                if ((deviceObject.PLCs[i].name == plcName) && (deviceObject.PLCs[i].ipAddress == plcAddress)) {
                                    deviceObject.PLCs.splice(i, 1);
                                    break;
                                }
                            }
                        } else {    //VARIABLE
                            var variableName = tds[1].innerText;
                            var variableAddress = tds[4].innerText;
                            var plcName = tds[3].innerText;

                            for (var i = 0; i < deviceObject.PLCs.length; i++) {
                                if (deviceObject.PLCs[i].name == plcName) {
                                    for (var j = 0; j < deviceObject.PLCs[i].variables.length; j++) {
                                        if ((deviceObject.PLCs[i].variables[j].name == variableName) && (deviceObject.PLCs[i].variables[j].address == variableAddress)) {
                                            deviceObject.PLCs[i].variables.splice(j, 1);
                                            break;
                                        }
                                    }
                                }
                            }
                        }

                        //Remove from table
                        $(this).parents("tr").remove();
                        console.log(deviceObject);
                    }

                }
            });
        });

        //Edit gateway modal
        $('#editGatewayModal').on('show.bs.modal', function (e) {
            var row = $(e.relatedTarget).closest('tr');
            var currentDeviceName = row.find('td:eq(1)').text();
            var currentLongitude = row.find('td:eq(4)').text();
            var currentLatitude = row.find('td:eq(5)').text();
            var currentInterval = row.find('td:eq(6)').text();
            var currentPublishState = row.find('td:eq(9) a').hasClass('btn-success');

            $('#editGatewayModal .inputName').val(currentDeviceName);
            $('#editGatewayModal .inputLongitude').val(currentLongitude);
            $('#editGatewayModal .inputLatitude').val(currentLatitude);
            $('#editGatewayModal .inputInterval').val(currentInterval);
            if (currentPublishState) {
                $('#cbResetPublish').prop('disabled', false);
            } else {
                $('#cbResetPublish').prop('disabled', true);
            }

            $('#editGatewayModal .btnSave').on('click', function () {
                for (var i = 0; i < rcvDeviceObject.length; i++) {
                    if (rcvDeviceObject[i].deviceName == currentDeviceName) {
                        var isChanged = false;
                        var sendObject = {
                            user: _user,
                            fileName: rcvDeviceObject[i].fileName,
                            type: 0,
                            properties: []
                        };
                        if (currentDeviceName != $('#editGatewayModal .inputName').val()) {
                            isChanged = true;
                            sendObject.properties.push({
                                name: 'deviceName',
                                value: $('#editGatewayModal .inputName').val()
                            });
                            row.find('td:eq(1)').text($('#editGatewayModal .inputName').val());
                        }

                        if (currentLongitude != $('#editGatewayModal .inputLongitude').val()) {
                            isChanged = true;
                            sendObject.properties.push({
                                name: 'longitude',
                                value: Number($('#editGatewayModal .inputLongitude').val())
                            });
                            row.find('td:eq(4)').text($('#editGatewayModal .inputLongitude').val());
                        }

                        if (currentLatitude != $('#editGatewayModal .inputLatitude').val()) {
                            isChanged = true;
                            sendObject.properties.push({
                                name: 'latitude',
                                value: Number($('#editGatewayModal .inputLatitude').val())
                            });
                            row.find('td:eq(5)').text($('#editGatewayModal .inputLatitude').val());
                        }

                        if (currentInterval != $('#editGatewayModal .inputInterval').val()) {
                            isChanged = true;
                            sendObject.properties.push({
                                name: 'period',
                                value: Number($('#editGatewayModal .inputInterval').val())
                            });
                            row.find('td:eq(6)').text($('#editGatewayModal .inputInterval').val());
                        }

                        if ($('#cbResetPublish').prop('checked')) {
                            isChanged = true;
                            sendObject.properties.push({
                                name: 'published',
                                value: false
                            });
                            //console.log(row.find('td:eq(9)').val());
                            row.find('td:eq(9)').html(`<a class = "btn btn-link btn-warning btn-block " style="max-width:180px" href = "/design/` + rcvDeviceObject[i].user + '/' + rcvDeviceObject[i].fileName + `">Designable</a>`)
                        }

                        if (isChanged) socket.emit('/editConfig', sendObject);
                        $('#editGatewayModal').modal('hide');
                        break;
                    }
                }
            });
        });

        $('#editGatewayModal').on('hide.bs.modal', function () {
            $('#editGatewayModal .btnSave').off('click');
        })

        //Edit PLC modal
        $('#editPLCModal').on('show.bs.modal', function (e) {
            $('#gatewayChildrenModal').css('opacity', 0.7);
            var row = $(e.relatedTarget).closest('tr');
            var currentPLCName = row.find('td:eq(1)').text();
            var currentProtocol = row.find('td:eq(2)').text();
            var currentIpAddress = row.find('td:eq(3)').text();
            var currentDeviceName = $('#gatewayChildrenModal .gatewayName').text();

            $('#editPLCModal .inputName').val(currentPLCName);
            $('#editPLCModal [name=protocol]').val(currentProtocol);
            $('#editPLCModal .inputIPAddress').val(currentIpAddress);

            $('#editPLCModal .btnSave').on('click', function () {
                if (!($('#editPLCModal .inputName').val() && $('#editPLCModal .inputIPAddress').val())) {
                    alert('Please fill required parameters');
                }
                else if (!regexPattern.test($('#editPLCModal .inputName').val())) alert('Invalid PLC name');
                else {
                    for (var i = 0; i < rcvDeviceObject.length; i++) {
                        if (rcvDeviceObject[i].deviceName == currentDeviceName) {
                            for (var j = 0; j < rcvDeviceObject[i].PLCs.length; j++) {
                                if (rcvDeviceObject[i].PLCs[j].ipAddress == currentIpAddress) {
                                    var isChanged = false;
                                    var sendObject = {
                                        user: _user,
                                        fileName: rcvDeviceObject[i].fileName,
                                        type: 1,
                                        plcIndex: j,
                                        properties: []
                                    };

                                    if (currentPLCName != $('#editPLCModal .inputName').val()) {
                                        isChanged = true;
                                        sendObject.properties.push({
                                            name: 'name',
                                            value: $('#editPLCModal .inputName').val()
                                        });
                                        row.find('td:eq(1)').text($('#editPLCModal .inputName').val());
                                    }

                                    if (currentProtocol != $('#editPLCModal [name=protocol]').val()) {
                                        isChanged = true;
                                        sendObject.properties.push({
                                            name: 'protocol',
                                            value: $('#editPLCModal [name=protocol]').val()
                                        });
                                        row.find('td:eq(2)').text($('#editPLCModal [name=protocol]').val());
                                    }

                                    if (currentIpAddress != $('#editPLCModal .inputIPAddress').val()) {
                                        isChanged = true;
                                        sendObject.properties.push({
                                            name: 'ipAddress',
                                            value: $('#editPLCModal .inputIPAddress').val()
                                        });
                                        row.find('td:eq(3)').text($('#editPLCModal .inputIPAddress').val());
                                    }
                                    if (isChanged) socket.emit('/editConfig', sendObject);
                                    $('#editPLCModal').modal('hide');
                                    break;
                                }
                            }

                        }
                    }
                }
            });
        })

        $('#editPLCModal').on('hide.bs.modal', function (e) {
            $('#gatewayChildrenModal').css('opacity', 1);
            $('#editPLCModal .btnSave').off('click');
        })

        //Edit variable modal
        $('#editVariableModal').on('show.bs.modal', function (e) {
            $('#variableModal').css('opacity', 0.7);
            $('#gatewayChildrenModal').css('opacity', 0);
            $('#editAlarmCheck').on('change', function () {
                if (this.checked) {
                    $('#editVariableModal .alarm-options').find('*').prop('disabled', false);
                } else {
                    $('#editVariableModal .alarm-options').find('*').prop('disabled', true);
                }
            })
            var row = $(e.relatedTarget).closest('tr');
            var currentPLC = $(e.relatedTarget).closest('.modal-body').find('.plcName').text();
            var currentPLCAddress = $(e.relatedTarget).closest('.modal-body').find('.plcIPAddress').text();
            var currentGatewayName = $('#gatewayChildrenModal').find('.gatewayName').text()
            var currentAddress = $(e.relatedTarget).closest('tr').find('td:eq(3)').text();
            findVariable({ gateway: currentGatewayName, plc: currentPLCAddress, variable: currentAddress }, function (result) {
                var varObj = rcvDeviceObject[result.gatewayIndex].PLCs[result.plcIndex].variables[result.variableIndex];
                $('#editVariableModal .inputName').val(varObj.name);
                $('#editVariableModal [name=dataType]').val(varObj.dataType);
                $('#editVariableModal .inputPLC').val(currentPLC);
                $('#editVariableModal .inputAddress').val(varObj.address);
                $('#editVariableModal [name=access]').val(varObj.access);
                $('#editVariableModal .inputUnit').val(varObj.unit);
                $('#editAlarmCheck').prop('checked', varObj.isAlarm);
                $('#editHistoryCheck').prop('checked', varObj.isHistory);
                if (varObj.isAlarm) {
                    $('#editVariableModal .alarm-options').find('*').prop('disabled', false);
                    $('#editVariableModal .alarm-type').val(varObj.alarmType);
                    if (varObj.alarmType == '1' || varObj.alarmType == 1) {
                        $('#editVariableModal .hihi').val(varObj.parameters.hihi);
                        $('#editVariableModal .hi').val(varObj.parameters.hi);
                        $('#editVariableModal .lo').val(varObj.parameters.lo);
                        $('#editVariableModal .lolo').val(varObj.parameters.lolo);
                        $('#editVariableModal .deadband').val(varObj.parameters.deadband);
                    }
                } else {
                    $('#editVariableModal .alarm-options').find('*').prop('disabled', true);
                }
            });
            $('#editVariableModal .btnSave').on('click', function () {
                if (!($('#editVariableModal .inputName').val() && $('#editVariableModal .inputAddress').val())) {
                    alert('Please fill required parameters');
                }
                else if (!regexPattern.test($('#editVariableModal .inputName').val()))
                    alert('Invalid variable name');
                else {
                    findVariable({ gateway: currentGatewayName, plc: currentPLCAddress, variable: currentAddress }, function (result) {
                        var varObj = rcvDeviceObject[result.gatewayIndex].PLCs[result.plcIndex].variables[result.variableIndex];
                        var isChanged = false;
                        var sendObject = {
                            user: _user,
                            fileName: rcvDeviceObject[result.gatewayIndex].fileName,
                            type: 2,
                            plcIndex: result.plcIndex,
                            variableIndex: result.variableIndex,
                            properties: []
                        };

                        if (varObj.name != $('#editVariableModal .inputName').val()) {
                            isChanged = true;
                            sendObject.properties.push({
                                name: 'name',
                                value: $('#editVariableModal .inputName').val()
                            });
                            row.find('td:eq(1)').text($('#editVariableModal .inputName').val());
                        }

                        if (varObj.dataType != $('#editVariableModal [name=dataType]').val()) {
                            isChanged = true;
                            sendObject.properties.push({
                                name: 'dataType',
                                value: $('#editVariableModal [name=dataType]').val()
                            });
                            row.find('td:eq(2)').text($('#editVariableModal [name=dataType]').val());
                        }

                        if (varObj.address != $('#editVariableModal .inputAddress').val()) {
                            isChanged = true;
                            sendObject.properties.push({
                                name: 'address',
                                value: $('#editVariableModal .inputAddress').val()
                            });
                            row.find('td:eq(3)').text($('#editVariableModal .inputAddress').val());
                        }

                        if (varObj.access != $('#editVariableModal [name=access]').val()) {
                            isChanged = true;
                            sendObject.properties.push({
                                name: 'access',
                                value: $('#editVariableModal [name=access]').val()
                            });
                            row.find('td:eq(4)').text($('#editVariableModal [name=access]').val());
                        }

                        if (varObj.unit != $('#editVariableModal .inputUnit').val()) {
                            isChanged = true;
                            sendObject.properties.push({
                                name: 'unit',
                                value: $('#editVariableModal .inputUnit').val()
                            });
                            row.find('td:eq(5)').text($('#editVariableModal .inputUnit').val());
                        }

                        if (varObj.isAlarm != $('#editAlarmCheck').prop('checked')) {
                            isChanged = true;
                            sendObject.properties.push({
                                name: 'isAlarm',
                                value: $('#editAlarmCheck').prop('checked')
                            });
                            row.find('td:eq(6)').text($('#editAlarmCheck').prop('checked'));
                        }

                        if (varObj.isHistory != $('#editHistoryCheck').prop('checked')) {
                            isChanged = true;
                            sendObject.properties.push({
                                name: 'isHistory',
                                value: $('#editHistoryCheck').prop('checked')
                            });
                            row.find('td:eq(7)').text($('#editHistoryCheck').prop('checked'));
                        }

                        if ($('#editAlarmCheck').prop('checked')) {
                            sendObject.properties.push({
                                name: 'alarmType',
                                value: $('#editVariableModal .alarm-type').val()
                            });

                            if ($('#editVariableModal .alarm-type').val() == 1 || $('#editVariableModal .alarm-type').val() == "1") {
                                sendObject.properties.push({
                                    name: 'hihi',
                                    value: Number($('#editVariableModal .hihi').val())
                                });
                                sendObject.properties.push({
                                    name: 'hi',
                                    value: Number($('#editVariableModal .hi').val())
                                });
                                sendObject.properties.push({
                                    name: 'lo',
                                    value: Number($('#editVariableModal .lo').val())
                                });
                                sendObject.properties.push({
                                    name: 'lolo',
                                    value: Number($('#editVariableModal .lolo').val())
                                });
                                sendObject.properties.push({
                                    name: 'deadband',
                                    value: Number($('#editVariableModal .deadband').val())
                                });
                            }
                        }

                        //console.log(sendObject);
                        if (isChanged) socket.emit('/editConfig', sendObject);
                        $('#editVariableModal').modal('hide');
                    });
                }
            })
        });

        $('#editVariableModal').on('hide.bs.modal', function (e) {
            $('#variableModal').css('opacity', 1);
            $('#gatewayChildrenModal').css('opacity', 1);
            $('#editAlarmCheck').off('change');
            $('#editVariableModal .btnSave').off('click');
        })
    });
});

function loadDeviceTable(arrDeviceObject) {
    $('#deviceTable > tbody').empty();
    if (arrDeviceObject.length > 0) {
        arrDeviceObject.forEach(function (device) {
            var htmlMarkup = `
                <tr>
                    <td class = "text-center"><input type = "checkbox"></td>
                    <td class = "text-center">` + device.deviceName + `</td>
                    <td class = "text-center">` + device.creationTime + `</td>
                    <td class = "text-center">` + device.lastActive + `</td>
                    <td class = "text-center">` + device.longitude + `</td>
                    <td class = "text-center">` + device.latitude + `</td>
                    <td class = "text-center">` + device.period + `</td>`
            if (!device.status)
                htmlMarkup += '<td class = "text-center"><span class="rounded-circle bg-secondary status"></span></td>';
            else htmlMarkup += '<td class = "text-center"><span class="rounded-circle bg-primary status"></span></td>';

            htmlMarkup += `
                    <td class = "text-center">
                        <i class="fas fa-cog variable-icon" data-index=` + arrDeviceObject.indexOf(device) + ` data-toggle="modal" data-target="#gatewayChildrenModal">
                    </td>` ;

            if (!device.published)
                htmlMarkup += `<td class = "text-center"><a class = "btn btn-link btn-warning btn-block " style="max-width:180px" href = "/design/` + device.user + '/' + device.fileName + `">Designable</a></td>`;
            else htmlMarkup += `<td class = "text-center"><a class = "btn btn-link btn-success text-white btn-block" style="max-width:180px" href = "` + device.link + `">Published</a></td>`;
            htmlMarkup += ` <td class = "text-center" ><i class="fas fa-pencil-alt  variable-icon" data-toggle="modal" data-target="#editGatewayModal"></i></td></tr>`
            $('#deviceTable > tbody').append(htmlMarkup);

        });
    }
}

function socketOnStatus(socket) {
    if (rcvDeviceObject.length > 0) {
        rcvDeviceObject.forEach(function (device) {
            socket.on('/' + device.deviceID + '/status', function (data) {
                var statusObject = JSON.parse(data);
                console.log(statusObject);
                if (statusObject) {
                    for (var object of rcvDeviceObject) {
                        if (object.deviceID == statusObject.deviceID) {
                            object.status = statusObject.status;
                            object.lastActive = statusObject.timestamp;
                            rcvDeviceObject[rcvDeviceObject.indexOf(object)] = object;

                            var tableRow = $("#deviceTable tr td").filter(function () {
                                return $(this).text() == object.deviceName;
                            }).closest("tr");
                            tableRow[0].cells[3].innerHTML = `<td>` + statusObject.timestamp + `</td>`;
                            if (statusObject.status)
                                tableRow[0].cells[7].innerHTML = '<td><span class="rounded-circle bg-primary status"></span></td>';
                            else
                                tableRow[0].cells[7].innerHTML = '<td><span class="rounded-circle bg-secondary status"></span></td>';
                            break;
                        }
                    }

                }
            });
        });
    }
}

function loadPLCModal($modal, deviceObj) {
    $modal.find('.gatewayName')[0].innerHTML = deviceObj.deviceName;
    $modal.find('.creationTime')[0].innerHTML = deviceObj.creationTime;
    $modal.find('.lastActive')[0].innerHTML = deviceObj.lastActive;
    $modal.find('.longitude')[0].innerHTML = deviceObj.longitude;
    $modal.find('.latitude')[0].innerHTML = deviceObj.latitude;

    var plcList = deviceObj.PLCs;
    $modal.find('.table > tbody').empty();
    plcList.forEach(function (plc) {
        var htmlMarkup = `
        <tr>
            <td>` + (plcList.indexOf(plc) + 1) + `</td>
            <td>` + plc.name + `</td>
            <td>` + plc.protocol + `</td>
            <td>` + plc.ipAddress + `</td>
            <td class = "text-center">
                <i class="fas fa-cog variable-icon" data-index=`+ plcList.indexOf(plc) + ` data-toggle="modal" data-target="#variableModal">
            </td>
            <td class = "text-center" ><i class="fas fa-pencil-alt  variable-icon" data-toggle="modal" data-target="#editPLCModal"></i></td>
        </tr>`
        $modal.find('.table > tbody').append(htmlMarkup);
    });
}

function loadVariables($modal, plcObject) {
    $modal.find('.plcName')[0].innerHTML = plcObject.name;
    $modal.find('.connectionName')[0].innerHTML = plcObject.protocol;
    $modal.find('.plcIPAddress')[0].innerHTML = plcObject.ipAddress;

    var variableList = plcObject.variables;
    $modal.find('.table > tbody').empty();
    variableList.forEach(function (variable) {
        var htmlMarkup = `
        <tr>
            <td>` + (variableList.indexOf(variable) + 1) + `</td>
            <td>` + variable.name + `</td>
            <td>` + variable.dataType + `</td>
            <td>` + variable.address + `</td>
            <td>` + variable.access + `</td>
            <td>` + variable.unit + `</td>
            <td>` + variable.isAlarm + `</td>
            <td>` + variable.isHistory + `</td>
            <td><i class="fas fa-pencil-alt  variable-icon" data-toggle="modal" data-target="#editVariableModal"></i></td>
        </tr>`
        $modal.find('.table > tbody').append(htmlMarkup);
    });
}

function loadMap(arrDeviceObject) {
    var map = new Microsoft.Maps.Map(document.getElementById('googleMap'), {
        credentials: 'Asj0-f-7zchkrJPjgOi33l47en99sYjmCLyrF09f2CE2l88GoDFpgBPUUI6qcpAX',
        center: new Microsoft.Maps.Location(10.773362, 106.659393),
        zoom: 10,
    });

    arrDeviceObject.forEach(function (device) {
        if (device) {
            if (device.longitude && device.latitude) {
                var center = new Microsoft.Maps.Location(device.latitude, device.longitude);
                var pin = new Microsoft.Maps.Pushpin(center, {
                    title: device.deviceName,
                    icon: '/images/png/pushpin.png',
                    anchor: new Microsoft.Maps.Point(12, 39),
                });
                map.entities.push(pin);
            }
        }
    });
}



//Wait 1s to confirm BingMap resource loaded
setTimeout(function () {
    loadMap(rcvDeviceObject);
}, 500);

//Show alarm setup when enable
$('#alarmCheck').on('change', function () {
    if (this.checked) $('.input-alarm').prop('disabled', false)
    else $('.input-alarm').prop('disabled', true)
});

//Find variable object based on PLC IP address, variable ip address
//variableObject = {gateway: Name, plc: PLC address, variable: address}
function findVariable(variableObject, callback) {
    for (var i = 0; i < rcvDeviceObject.length; i++) {
        if (rcvDeviceObject[i].deviceName == variableObject.gateway) {
            for (var j = 0; j < rcvDeviceObject[i].PLCs.length; j++) {
                if (rcvDeviceObject[i].PLCs[j].ipAddress == variableObject.plc) {
                    for (var k = 0; k < rcvDeviceObject[i].PLCs[j].variables.length; k++) {
                        console.log(rcvDeviceObject[i].PLCs[j].variables[k].address);
                        if (rcvDeviceObject[i].PLCs[j].variables[k].address == variableObject.variable) {
                            return callback({
                                gatewayIndex: i,
                                plcIndex: j,
                                variableIndex: k
                            })
                        }
                    }
                }
            }
        }
    }
}