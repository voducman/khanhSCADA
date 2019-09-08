/*
***********************************************************************************************
                                Document ready 
***********************************************************************************************
*/
let alarmEffectInterval;
let isFlashing = false;
let isRunning = false;

let saveTable, openTable;

$(document).ready(function () {
  //Load table file
  saveTable = $('#saveModal .file-table').DataTable({
    scrollY: 400,
    scrollCollapse: true,
    // scrollX : 'auto'
    paging: false,
  });
  openTable = $('#openModal .file-table').DataTable({
    scrollY: 400,
    scrollCollapse: true,
    // scrollX : 'auto'
    paging: false,
  });

  $('#saveModal').on('shown.bs.modal', function (e) {
    $.fn.dataTable.tables({ visible: true, api: true }).columns.adjust();
  });

  $('#saveModal').on('show.bs.modal', function (e) {
    saveTable.$('tr.table-selected').removeClass('table-selected');
  });

    //Save table: select row
    $('#saveModal table tbody').on('click', 'tr', function () {
      if ($(this).hasClass('table-selected')) {
        $(this).removeClass('table-selected');
      }
      else {
        saveTable.$('tr.table-selected').removeClass('table-selected');
        $(this).addClass('table-selected');
      }
    });

  $('#openModal').on('shown.bs.modal', function (e) {
    openTable.$('tr.table-selected').removeClass('table-selected');
    $.fn.dataTable.tables({ visible: true, api: true }).columns.adjust();
  });

  $('#openModal').on('show.bs.modal', function (e) {
    openTable.$('tr.table-selected').removeClass('table-selected');
  });


  //Open table: select row
  $('#openModal table tbody').on('click', 'tr', function () {
    if ($(this).hasClass('table-selected')) {
      $(this).removeClass('table-selected');
    }
    else {
      openTable.$('tr.table-selected').removeClass('table-selected');
      $(this).addClass('table-selected');
    }
  });

  //Rename modal
  $('#renameModal').on('show.bs.modal', function (e) {
    if ($('#openModal').hasClass('show')) {
      $('#openModal').css('opacity', 0.7);
    } else {
      $('#saveModal').css('opacity', 0.7);
    }

    var currentName = $(e.relatedTarget).closest('tr').children('td')[0].innerText.replace('.json', '');
    $('#inputRename').val(currentName);
    $('#btnRenameOK').on('click', function () {
      if ($('#inputRename').val() != currentName) {
        socket.emit('/rename', { user: user, currentName: currentName + '.json', newName: $('#inputRename').val() + '.json' })
        console.log({ user: user, currentName: currentName + '.json', newName: $('#inputRename').val() + '.json' });
        $(e.relatedTarget).closest('tr').children('td')[0].innerText = $('#inputRename').val() + '.json';
        var rowIndex = $(e.relatedTarget).closest('tr')[0].rowIndex - 1;
        if ($('#openModal').hasClass('show')) {
          $('#saveModal').find('table tbody')[0].rows[rowIndex].cells[0].innerText = $('#inputRename').val() + '.json';
        } else {
          $('#openModal').find('table tbody')[0].rows[rowIndex].cells[0].innerText = $('#inputRename').val() + '.json';
        }
        $('#renameModal').modal('hide');
      }
    })
  });

  $('#renameModal').on('hide.bs.modal', function () {
    if ($('#openModal').hasClass('show')) {
      $('#openModal').css('opacity', 1);
    } else {
      $('#saveModal').css('opacity', 1);
    }
    $('#btnRenameOK').off('click');
  });

  //Delete modal
  $('#deleteModal').on('show.bs.modal', function (e) {
    if ($('#openModal').hasClass('show')) {
      $('#openModal').css('opacity', 0.7);
    } else {
      $('#saveModal').css('opacity', 0.7);
    }
    var currentName = $(e.relatedTarget).closest('tr').children('td')[0].innerText;
    $('#deleteFilename').text(currentName);
    $('#btnDeleteOK').on('click', function () {
      socket.emit('/deleteDesign', { user: user, file: currentName });
      if ($('#openModal').hasClass('show')) {
        var rowIndex = openTable.row('.table-selected').index();
        openTable.row('.table-selected').remove().draw(false);
        saveTable.row(rowIndex).remove().draw(false);

      } else {
        var rowIndex = saveTable.row('.table-selected').index();
        saveTable.row('.table-selected').remove().draw(false);
        openTable.row(rowIndex).remove().draw(false);
      }
      $('#deleteModal').modal('hide');
    });
  })

  $('#deleteModal').on('hide.bs.modal', function (e) {
    if ($('#openModal').hasClass('show')) {
      $('#openModal').css('opacity', 1);
    } else {
      $('#saveModal').css('opacity', 1);
    }
    $('#btnDeleteOK').off('click');
  })

  //Disable all elements in alarm and history when not RUN
  $('#alarm *').prop('disabled', true);
  $('#history *').prop('disabled', true);

  declareVariable();

  var socket = io();
  socket.on('connect', function () {

    $('#btnRun').on('click', function (clickEvent) {
      isRunning = true;
      $(this).prop('disabled', true);
      $('#btnStop').prop('disabled', false);
      $('.button-icon').prop('disabled', true);
      $('#alarm *').prop('disabled', false);
      $('#history *').prop('disabled', false);
      draggableObjects.forEach(function (item) {
        item.disabled = true;
      });
      $('.draggable').draggable('disable');
      $('.draggable2').draggable('disable');

      //Disable menu button
      $('#btnOpen').prop('disabled', true);
      $('#btnSave').prop('disabled', true);
      $('#btnSetting').prop('disabled', true);
      $('#btnPublish').prop('disabled', true);


      //Disable all input in Modals: to prevent users from changing elements' properties
      $('.inputModal').prop('disabled', true);
      $('.btnBrowseTag').prop('disabled', true);
      $('.btnChooseImage').prop('disabled', true);
      $('.saveChangeButton').prop('disabled', true);

      initSCADA(shapes, socket);

      socket.on('/' + deviceID + '/tag', function (data) {
        var arrVarObjects = JSON.parse(data);
        if (arrVarObjects) {
          arrVarObjects.variables.forEach(function (varObject) {
            eval(varObject.tagName + '=' + varObject.value);
            SCADA(shapes, varObject.tagName, varObject.timeStamp);
          });
        }
      });

      //Clear table body first
      $('#alarmTable tbody').empty();
      socket.on('/' + deviceID + '/alarm', function (alarmObject) {
        var arrAlarmSource = Array.from($('#alarmTable tr td:nth-child(4)'));
        var arrAlarmType = Array.from($('#alarmTable tr td:nth-child(7)'));
        var arrAlarmState = Array.from($('#alarmTable tr td:nth-child(8)'));
        var _isExist = false;
        var _timeStamp = new Date(alarmObject.timestamp)

        for (var i = 0; i < arrAlarmSource.length; i++) { //_item => arrAlarmSource[i]
          if ((arrAlarmSource[i].innerText == alarmObject.source) && (arrAlarmType[i].innerText == alarmObject.type) && (arrAlarmState[i].innerText == 'UNACK')) {
            if (alarmObject.state == 'UNACK') {
              var _expression = '#alarmTable tr:nth(' + (i + 1) + ') td';
              var tableRow = $(_expression);
              tableRow[1].innerText = _timeStamp.toLocaleDateString();
              tableRow[2].innerText = _timeStamp.toLocaleTimeString();
              tableRow[4].innerText = alarmObject.value;
              tableRow[5].innerText = alarmObject.message;
              tableRow[6].innerText = alarmObject.type;
              tableRow[7].innerText = alarmObject.state;
            }
            else { //ACKED
              var _expression = '#alarmTable tr:nth(' + (i + 1) + ') td';
              var tableRow = $(_expression);
              tableRow[1].innerText = _timeStamp.toLocaleDateString();
              tableRow[2].innerText = _timeStamp.toLocaleTimeString();
              tableRow[7].innerText = alarmObject.state;
              $(arrAlarmSource[i].closest('tr')).css('color', 'black');
            }
            _isExist = true;
            break;
          }
        }


        if (!_isExist) {//Not found item 
          var _htmlMarkup =
            `<tr class = "row-pointer">
                <td><input type="checkbox" class = "alarmCheckbox"></td>
                <td>` + _timeStamp.toLocaleDateString() + `</td>
                <td>` + _timeStamp.toLocaleTimeString() + `</td>
                <td>` + alarmObject.source + `</td>
                <td>` + alarmObject.value + `</td>
                <td>` + alarmObject.message + `</td>
                <td>` + alarmObject.type + `</td>
                <td>` + alarmObject.state + `</td>
              </tr>`
          $('#alarmTable').prepend(_htmlMarkup);

          $('#alarmTable tbody tr:nth-child(1)').click(function () {
            var _checkbox = $(this).children('td').children('input');
            _checkbox.prop('checked', !_checkbox.prop('checked'));
            if (_checkbox.prop('checked')) $(this).addClass('alarm-selected');
            else $(this).removeClass('alarm-selected');
          });

        }

        //Alarm effect
        var isUNACK = false;
        var arrAlarmState_New = Array.from($('#alarmTable tr td:nth-child(8)'));
        var arrAlarmStateValue = [];
        for (var i = 0; i < arrAlarmState_New.length; i++) {
          arrAlarmStateValue.push(arrAlarmState_New[i].innerText);
        };

        if (arrAlarmStateValue.includes('UNACK')) {
          if (!isFlashing) {
            alarmEffectInterval = setInterval(function () {
              if ($('#alarmTitle').css('color') == 'rgb(255, 255, 255)') $('#alarmTitle').css('color', 'orange');
              else $('#alarmTitle').css('color', '');
            }, 1000);
            isFlashing = true;
          }
        } else {
          isFlashing = false;
          clearInterval(alarmEffectInterval);
          $('#alarmTitle').css('color', '');
        }
      });

      //Clear history table body first
      $('#historyTable tbody').empty();
      //socket.emit('/reqHistory', deviceID);
      socket.on('/' + deviceID + '/resHistory', function (data) {
        if (data.length > 0) {
          $('#historyTable tbody').empty();
          data.forEach(function (dataItem) {
            var _htmlMarkup =
              `<tr>
              <td>` + dataItem.tag + `</td>
              <td>` + dataItem.type + `</td>
              <td>` + dataItem.address + `</td>
              <td>` + dataItem.value + `</td>
              <td>` + dataItem.timestamp + `</td>
            </tr>`
            $('#historyTable tbody').append(_htmlMarkup);
            $('#historyTable tbody').css({ 'height': '800px', 'overflow-y': 'auto' });
          });
        }
      });
    });

    $('#btnStop').on('click', function (clickEvent) {
      isRunning = false;
      $(this).prop('disabled', true);
      $('#btnRun').prop('disabled', false);
      $('.button-icon').prop('disabled', false);
      $('#alarm *').prop('disabled', true);
      $('#history *').prop('disabled', true);
      draggableObjects.forEach(function (item) {
        item.disabled = false;
      });
      $('.draggable').draggable('enable');
      $('.draggable2').draggable('enable');

      //Enable menu buttons
      $('#btnOpen').prop('disabled', false);
      $('#btnSave').prop('disabled', false);
      $('#btnSetting').prop('disabled', false);
      $('#btnPublish').prop('disabled', false);

      //Enable input
      $('.inputModal').prop('disabled', false);
      $('.btnBrowseTag').prop('disabled', false);
      $('.btnChooseImage').prop('disabled', false);
      $('.saveChangeButton').prop('disabled', false);
      //Disable vertical slider
      $('.slider-vertical').siblings('input').bootstrapSlider('disable');
      //Clear chart data
      clearChartData();
      //Show all hidden items
      showHiddenItems();
      //Enable all items
      enableAllItems();

      socket.off('/' + deviceID + '/tag');
      socket.off('/' + deviceID + '/alarm');
      socket.off('/' + deviceID + '/resHistory');
      //Reset alarm color, clear Interval
      $('#alarmTitle').css('color', '');
      clearInterval(alarmEffectInterval);
    });
  });


  $('[data-toggle="tooltip"]').tooltip();
  $('body').keyup(function (e) {
    if (e.keyCode == 27) {
      stopDraw(true);
    }
  });

  $('.table-body tr').click(function () {
    $(this).children('td').children('div').children('input').prop('checked', true);
    $('.table-body tr').removeClass('row-selected');
    $(this).toggleClass('row-selected');
  });

  $('#btnAck').click(function () {
    if ($('.alarm-selected').length > 0) {
      var _resAlarm = {
        deviceID: deviceID,
        resAlarm: []
      }
      $('.alarm-selected').each(function () {
        var _selectedItem = $(this).find('td');
        if (_selectedItem[7].innerText != 'ACKED') {
          _resAlarm.resAlarm.push({
            deviceID: deviceID,
            source: _selectedItem[3].innerText,
            value: _selectedItem[4].innerText,
            message: _selectedItem[5].innerText,
            type: _selectedItem[6].innerText,
            state: 'ACKED',
            timestamp: new Date().toLocaleString(),
          })
        }
      });

      if (_resAlarm.resAlarm.length > 0) socket.emit('/resAlarm', _resAlarm);
    }
  });

  // $('#btnAckAll').click(function () {
  //   var rows = $('#alarmTable tbody tr');
  //   if (rows.length > 0) {
  //     var _resAlarm = {
  //       deviceID: deviceID,
  //       resAlarm: []
  //     }
  //     rows.each(function () {
  //       if ($(this).find('td')[7].innerText == 'UNACK')
  //         _resAlarm.resAlarm.push({
  //           source: $(this).find('td')[3].innerText,
  //           value: $(this).find('td')[4].innerText,
  //           message: $(this).find('td')[5].innerText,
  //           type: $(this).find('td')[6].innerText,
  //           state: 'ACKED',
  //           timestamp: new Date().toLocaleString(),
  //         })
  //     });
  //     socket.emit('/resAlarm', _resAlarm);
  //     console.log('ACK all');
  //     console.log(_resAlarm);
  //   }
  // });

  $('#btnRefreshHistory').click(function () {
    socket.emit('/reqHistory', deviceID);
  });

  $('#inputFilter').on('keyup', function () {
    var input, filter, table, tr, td, i, txtValue;
    input = document.getElementById("inputFilter");
    filter = input.value.toUpperCase();
    table = document.getElementById("historyTable");
    tr = table.getElementsByTagName("tr");
    for (i = 0; i < tr.length; i++) {
      td = tr[i].getElementsByTagName("td")[0];
      if (td) {
        txtValue = td.textContent || td.innerText;
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
          tr[i].style.display = "";
          tr[i].classList.remove('ignore-row');
        } else {
          tr[i].style.display = "none";
          tr[i].classList.add('ignore-row');
        }
      }
    }
  });

  $('.inputTimeFilter').on('change', function () {
    //console.log('Change')
    var inputFrom, inputTo, filterFrom, filterTo, table, tr, td, i, txtDate;

    inputFrom = document.getElementById("inputFrom");
    filterFrom = new Date(inputFrom.value);
    inputTo = document.getElementById("inputTo");
    filterTo = new Date(inputTo.value);

    table = document.getElementById("historyTable");
    tr = table.getElementsByTagName("tr");
    for (i = 0; i < tr.length; i++) {
      td = tr[i].getElementsByTagName("td")[4];
      if (td) {
        txtDate = new Date(td.textContent || td.innerText);
        if (inputFrom.value && !inputTo.value) { //Only from
          if (txtDate >= filterFrom) {
            tr[i].style.display = "";
            tr[i].classList.remove('ignore-row');
          } else {
            tr[i].style.display = "none";
            tr[i].classList.add('ignore-row');
          }
        } else if (!inputFrom.value && inputTo.value) { //Only to
          if (txtDate <= filterTo) {
            tr[i].style.display = "";
            tr[i].classList.remove('ignore-row');
          } else {
            tr[i].style.display = "none";
            tr[i].classList.add('ignore-row');
          }
        } else {  //Both
          if ((txtDate >= filterFrom) && (txtDate <= filterTo)) {
            tr[i].style.display = "";
            tr[i].classList.remove('ignore-row');
          } else {
            tr[i].style.display = "none";
            tr[i].classList.add('ignore-row');
          }
        }


      }
    }
  })

  $('#btnExportToPdf').click(function () {
    var rowData = [];
    table = document.getElementById("historyTable");
    tr = table.getElementsByTagName("tr");
    for (i = 0; i < tr.length; i++) {

      if (!tr[i].classList.contains('ignore-row')) {
        tds = Array.from(tr[i].getElementsByTagName("td"));
        rowData.push(tds);
      }
    }
    var doc = new jsPDF();

    var inputFrom = document.getElementById("inputFrom");
    var filterFrom = new Date(inputFrom.value);
    var inputTo = document.getElementById("inputTo");
    var filterTo = new Date(inputTo.value);

    doc.setFontSize(18);
    doc.text('History table', 14, 22);
    doc.setFontSize(12);
    if (inputFrom.value) doc.text('From: ' + filterFrom.toLocaleDateString(), 16, 30);
    if (inputTo.value) doc.text('To:   ' + filterTo.toLocaleDateString(), 16, 35);

    doc.autoTable({
      head: [['Tag', 'Data type', 'Address', 'Value', 'Timestamp']],
      body: rowData,
      startY: 50
    });
    doc.save('table.pdf');
  });

  $('#btnPublish').click(function () {
    var _confirm = confirm('Do you want to publish your design? This cannot be back!');
    if (_confirm) {
      //Enable vertical slider first
      for (i = 0; i < shapes.length; i++) {
        if (shapes[i].id) {
          if (typeof (shapes[i].id) == 'string') {
            if (shapes[i].id.includes('verticalSlider')) {
              $(shapes[i]).bootstrapSlider('enable');
            }
          }
        }
      }
      //Move each element 100px to the right to make it more "center" 
      addPixel();
      var mainPage1 = document.getElementById('mainPage1').innerHTML;
      var dashboard = document.getElementById('dashboard').innerHTML;

      var _sendObject = {
        user: user,
        deviceID: deviceID,
        html: mainPage1,
        dashboard: dashboard,
        elements: elementHTML,
        variableList: variableList
      }

      var mainPageColor = $('#mainPage1')[0].style.background;
      if (mainPageColor) mainPageColor = rgb2hex(mainPageColor);

      var alarmPageColor = $('#alarm')[0].style.background;
      if (alarmPageColor) alarmPageColor = rgb2hex(alarmPageColor);

      var historyPageColor = $('#history')[0].style.background;
      if (historyPageColor) historyPageColor = rgb2hex(historyPageColor);

      var dashboardPageColor = $('#dashboard')[0].style.background;
      if (dashboardPageColor) dashboardPageColor = rgb2hex(dashboardPageColor);

      var backgroundObject = {
        mainPage: mainPageColor,
        alarmPage: alarmPageColor,
        historyPage: historyPageColor,
        dashboardPage: dashboardPageColor
      }


      socket.emit('/publish', _sendObject, backgroundObject);
      $('#spinnerModal').modal('show');
      socket.on('/' + deviceID + '/publishSuccess', function (data) {
        setTimeout(function () {
          $('#spinnerModal').modal('hide');
          var href = '/published/' + user + '/' + 'Device_' + deviceID + '_publish.ejs';
          $('#publishedLink').attr('href', href)
          $('#successModal').modal('show');
        }, 3000);
      });

    }
  });

  //Settings: Change background color
  $('#settingModal').on('show.bs.modal', function () {
    var mainPageColor = $('#mainPage1')[0].style.background;
    if (mainPageColor) $('#mainPageColor').prop({ 'value': rgb2hex(mainPageColor) });

    var alarmPageColor = $('#alarm')[0].style.background;
    if (alarmPageColor) $('#alarmPageColor').prop({ 'value': rgb2hex(alarmPageColor) });

    var historyPageColor = $('#history')[0].style.background;
    if (historyPageColor) $('#historyPageColor').prop({ 'value': rgb2hex(historyPageColor) });

    var dashboardPageColor = $('#dashboard')[0].style.background;
    if (dashboardPageColor) $('#dashboardPageColor').prop({ 'value': rgb2hex(dashboardPageColor) });
  });

  $('#btnSaveColors').click(function () {
    //$('#mainPage1')[0].style.cssText = '#ff0000';
    $('#mainPage1')[0].style.setProperty('background', $('#mainPageColor').prop('value'), 'important');
    $('#alarm')[0].style.setProperty('background', $('#alarmPageColor').prop('value'), 'important');
    $('#history')[0].style.setProperty('background', $('#historyPageColor').prop('value'), 'important');
    $('#dashboard')[0].style.setProperty('background', $('#dashboardPageColor').prop('value'), 'important');
  });

  //Save current design
  $('#btnSaveDesign').click(function () {
    if ($('#inputSaveFilename').val() != '') {
      var filename = $('#inputSaveFilename').val() + '.json';
      var result = saveTable.search(filename).$('tr', { "filter": "applied" }).length;
      if (result > 0) alert('Existing filename');
      else saveDesign(socket);
    } else {
      alert('Filename is empty');
    }

  });

  //Open designs
  $('#btnOpenDesign').click(function () {
    if (openTable.$('tr.table-selected').length > 0) { //Detect selected row
      openDesign(socket);
      $('#openModal').modal('hide');
    } else { //None selected
      alert('Select a file first');
    }

  });


});



/*
***********************************************************************************************
                                Global variables and functions
***********************************************************************************************
*/
//SVG global variable
let draw = SVG('mainPage1');
const shapes = [];
const draggableObjects = [];
const arrChartJS = [];
const arrGauge = [];
let index = 0;
let nameIndex = 0;
let shape;
let selectedItemId;
const deviceID = $('#deviceID').text();
const user = $('#user').text();
let variableList = [];
let elementHTML = []; //Array contains extra-HTML properties, which is sent to server via socket.io
const $leftOffset = 165;
let isOpened = false;

//Default option for basic objects except LINE
const defaultOption = {
  stroke: 'black',
  'stroke-width': 3,
  'fill-opacity': 0,
};

//Line default option
const defaultLineOption = {
  stroke: 'black',
  'stroke-width': 5,
  'stroke-linecap': 'round'
};

//Add context menu
function addContextMenu() {
  $('.contextMenu').on('contextmenu', function (e) {
    selectedItemId = e.target.id;
    if (!selectedItemId) {
      selectedItemId = e.target.parentNode.id;
    };

    //For gauge
    if (!selectedItemId) {
      if (e.target.parentNode.tagName == 'svg') {  //This is gauge object
        selectedItemId = e.target.parentNode.parentNode.id;
      } else if (e.target.parentNode.tagName == 'text') {  //This is gauge object
        selectedItemId = e.target.parentNode.parentNode.parentNode.id;
      }
    }

    //For vertical slider
    if (!selectedItemId) {
      var _slider = $(e.target).closest('.slider')[0];
      if (_slider) selectedItemId = $(_slider).siblings('input')[0].id;
    }

    var top = e.pageY + 10;
    var left = e.pageX + 10;
    $("#context-menu").css({
      display: "block",
      top: top,
      left: left
    }).addClass("show");
    return false; //blocks default Webbrowser right click menu
  });
  $('#mainPage1').on("click", function () {
    $("#context-menu").removeClass("show").hide();
    selectedItemId = '';
  });

  $('#dashboard').on("click", function () {
    $("#context-menu").removeClass("show").hide();
    selectedItemId = '';
  });

  $("#context-menu a").on("click", function () {
    $(this).parent().removeClass("show").hide();
  });

}

//Delete element
function removeItem() {
  // console.log("Selected Item: ", selectedItemId);
  // console.log('Selected Item: ');
  // console.log(document.getElementById(selectedItemId));

  if (selectedItemId) {
    var item = document.getElementById(selectedItemId);
    if (selectedItemId.includes('verticalSlider') || selectedItemId.includes('chart') || selectedItemId.includes('switch')) {
      $(item.parentNode).remove();
    }
    else item.parentNode.removeChild(item);

    for (var elem of shapes) {
      try {
        if (elem.node.id == selectedItemId) {
          shapes.splice(shapes.indexOf(elem), 1);
          index--;
          break;
        }
      }
      catch{
        if (elem.id == selectedItemId) {
          shapes.splice(shapes.indexOf(elem), 1);
          index--;
          break;
        }
      }
    }


    for (var draggableItem of draggableObjects) {
      if (draggableItem.element.id == selectedItemId) {
        draggableObjects.splice(draggableObjects.indexOf(draggableItem), 1);
        break;
      }
    }

    for (var chartItem of arrChartJS) {
      if (chartItem.id == selectedItemId) {
        arrChartJS.splice(arrChartJS.indexOf(chartItem), 1);
        break;
      }
    }

    for (var gaugeItem of arrGauge) {
      if (gaugeItem.id == selectedItemId) {
        arrGauge.splice(arrGauge.indexOf(gaugeItem), 1);
        break;
      }
    }

    var _foundIndex = findElementHTMLById(selectedItemId);
    if (_foundIndex != -1) elementHTML.splice(_foundIndex, 1);
  };

  selectedItemId = '';
}

var hexDigits = new Array
  ("0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f");

//Function to convert rgb color to hex format
function rgb2hex(rgb) {
  rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
}

function hex(x) {
  return isNaN(x) ? "00" : hexDigits[(x - x % 16) / 16] + hexDigits[x % 16];
}

function declareVariable() {
  var tableRows = $('#tagsTable tbody tr');
  if (tableRows.length > 0) {
    tableRows.each(function (index, value) {
      var tds = $(this).find('td');
      var expression = tds[3].innerHTML + '_' + tds[1].innerHTML + ' = null;';
      eval(expression);
      variableList.push({
        name: tds[3].innerHTML + '_' + tds[1].innerHTML,
        value: null,
      });
    });
  }
}

function initSCADA(_shapes, _socket) {
  _shapes.forEach(function (_shape) {
    var _id = _shape.id.toString().toLowerCase().replace(/[0-9]/g, '');
    switch (_id) {
      case 'button': {
        $(_shape).on('click', function (event) {
          var _sendObj = {
            deviceID: deviceID,
            command: this.command,
          }
          if (isRunning && this.command) _socket.emit('/write', _sendObj);
        })
        break;
      }
      case 'input': {
        $(_shape).on('keyup', function (event) {
          if (event.keyCode == 13) {
            if (this.tag) {
              if (this.type == 'text') {
                var _sendObj = {
                  deviceID: deviceID,
                  command: this.tag + ' = ' + '"' + this.value + '"'
                }
              }
              else {
                var _sendObj = {
                  deviceID: deviceID,
                  command: this.tag + ' = ' + this.value
                }
              }
              if (isRunning) _socket.emit('/write', _sendObj);
            }
          }
        });
        break;
      }
      case 'slider': {
        $(_shape).on('input', function (event) {
          $(this).tooltip('dispose');
          $(this).tooltip({
            animation: false,
            offset: (this.value - (this.max - this.min) / 2) * (parseInt(this.style.width, 10) / (this.max - this.min)),
            title: this.value
          });
          $(this).tooltip('show');
        });
        $(_shape).on('change', function (event) {
          var _sendObj = {
            deviceID: deviceID,
            command: this.tag + ' = ' + this.value
          }
          if (this.tag && isRunning) _socket.emit('/write', _sendObj);
        });
        break;
      }
      case 'verticalslider': {
        //Update min, max value
        if (_shape.isMinTag) {
          $(_shape).bootstrapSlider({ 'min': eval(_shape.minTag) });
        } else {
          $(_shape).bootstrapSlider({ 'min': Number(_shape.minValue) });
        }
        // $(_shape).bootstrapSlider('refresh');
        if (_shape.isMaxTag) {
          $(_shape).bootstrapSlider({ 'max': eval(_shape.maxTag) });
        } else {
          $(_shape).bootstrapSlider({ 'max': Number(_shape.maxValue) });
        }
        $(_shape).bootstrapSlider('refresh');
        $(_shape).bootstrapSlider('enable');

        $(_shape).on('slideStop', function (event) {
          var _sendObj = {
            deviceID: deviceID,
            command: this.tag + ' = ' + this.value
          }
          if (this.tag && isRunning) _socket.emit('/write', _sendObj);
        });
        break;
      }
      default: {
        //Switch
        if ($(_shape).find('span')[0]) {
          var _checkbox = $(_shape).find('input')[0];
          var _span = $(_shape).find('span')[0];
          if (_checkbox) {
            $(_checkbox).on('change', function () {
              if ($(this).is(':checked')) {
                var _sendObj = {
                  deviceID: deviceID,
                  command: _span.onCommand,
                }
                if (isRunning && _span.onCommand) _socket.emit('/write', _sendObj);
              }
              else {
                var _sendObj = {
                  deviceID: deviceID,
                  command: _span.offCommand,
                }
                if (isRunning && _span.offCommand) _socket.emit('/write', _sendObj);
              }
            });
          }
        } else { //Checkbox
          var _label = $(_shape).find('label')[0];
          var _checkbox = $(_shape).find('input')[0];
          if (_checkbox) {
            $(_checkbox).on('change', function () {
              if ($(this).is(':checked')) {
                var _sendObj = {
                  deviceID: deviceID,
                  command: _label.checkedCommand,
                }
                if (isRunning && _label.checkedCommand) _socket.emit('/write', _sendObj);
              }
              else {
                var _sendObj = {
                  deviceID: deviceID,
                  command: _label.unCheckedCommand,
                }
                if (isRunning && _label.unCheckedCommand) _socket.emit('/write', _sendObj);
              }
            });
          }
        }
      }
    }
  })
}

function SCADA(arrHtmlElems, variableName, variableTimestamp) {
  shapes.forEach(function (_shape) {
    var _id = _shape.id.toString().toLowerCase().replace(/[0-9]/g, '');
    switch (_id) {
      case 'text': {
        scadaTextObject(_shape, variableName);
        break;
      }
      case 'img': {
        scadaImageObject(_shape, variableName);
        break;
      }
      case 'displayvalue': {
        scadaDisplayValueObject(_shape, variableName);
        break;
      }
      case 'input': {
        scadaInputObject(_shape, variableName);
        break;
      }
      case 'switch': {
        scadaSwitchObject(_shape, variableName);
        break;
      }
      case 'button': {
        scadaButtonObject(_shape, variableName);
        break;
      }
      case 'slider': {
        scadaSliderObject(_shape, variableName);
        break;
      }
      case 'verticalslider': {
        scadaVerticalSliderObject(_shape, variableName);
        break;
      }
      case 'progressbar': {
        scadaProgressBarObject(_shape, variableName);
        break;
      }
      case 'verticalprogressbar': {
        scadaVerticalProgressBarObject(_shape, variableName);
        break;
      }
      case 'checkbox': {
        scadaCheckboxObject(_shape, variableName);
        break;
      }
      case 'symbolset': {
        scadaSymbolSetObject(_shape, variableName);
        break;
      }
      case 'chartdiv': {
        scadaChartObject(_shape, variableName, variableTimestamp);
        break;
      }
      case 'gauge': {
        scadaGaugeObject(_shape, variableName);
        break;
      }
      default: {
        if ($(_shape).find('span')[0]) {
          scadaSwitchObject(_shape, variableName);
        } else if ($(_shape).find('label')[0]) {
          scadaCheckboxObject(_shape, variableName);
        } else {
          scadaSvgObject(_shape, variableName);
        }

      }
    }
  })
}

//Svg scada
function scadaSvgObject(item, variableName) {
  try {
    if (item.node.hiddenWhen) {
      if (item.node.hiddenWhen.includes(variableName)) {
        if (eval(item.node.hiddenWhen)) item.hide();
        else item.show();
      }
    }
  } catch {
    if (item.hiddenWhen) {
      if (item.hiddenWhen.includes(variableName)) {
        if (eval(item.hiddenWhen)) $(item).hide();
        else $(item).show();
      }
    }
  }

}

//Text scada
function scadaTextObject(item, variableName) {
  if (item.hiddenWhen) {
    if (item.hiddenWhen.includes(variableName)) {
      if (eval(item.hiddenWhen)) $(item).hide();
      else $(item).show();
    }
  }
}

//Image scada
function scadaImageObject(item, variableName) {
  if (item.hiddenWhen) {
    if (item.hiddenWhen.includes(variableName)) {
      if (eval(item.hiddenWhen)) $(item).hide();
      else $(item).show();
    }
  }
}

//DisplayValue scada
function scadaDisplayValueObject(item, variableName) {
  if (item.hiddenWhen) {
    if (item.hiddenWhen.includes(variableName)) {
      if (eval(item.hiddenWhen)) $(item).hide();
      else $(item).show();
    }
  }

  if (item.tag) {
    if (item.tag.includes(variableName)) {
      if (typeof (eval(item.tag)) == 'boolean') $(item).text(eval(item.tag));
      else $(item).text(eval(item.tag).toFixed(item.format));
    }
  }
}

//Progressbar scada
function scadaProgressBarObject(item, variableName) {
  if (item.isMinTag) {
    if (item.minTag.includes(variableName)) item.min = eval(item.minTag);
  }
  else {
    if (item.minValue) item.min = item.minValue;
  }

  if (item.isMaxTag) {
    if (item.maxTag.includes(variableName)) item.max = eval(item.maxTag);
  }
  else {
    if (item.maxValue) item.max = item.maxValue;
  }

  var _range = item.max - item.min;

  if (item.hiddenWhen) {
    if (item.hiddenWhen.includes(variableName)) {
      if (eval(item.hiddenWhen)) $(item).hide();
      else $(item).show();
    }
  }

  if (item.tag) {
    if (item.tag.includes(variableName)) {
      if (eval(item.tag) <= item.min) {
        var _width = '0%';
      } else if (eval(item.tag) >= item.max) {
        var _width = '100%';
      } else {
        var _width = (eval(item.tag) - item.min) / _range * 100 + '%';
      }
      $(item).children('div').css({
        'width': _width,
      });
      if (item.isHideLabel) $(item).children('div').text('');
      else {
        if (!item.isRawValue) $(item).children('div').text(_width);
        else $(item).children('div').text(eval(item.tag));
      }
    }
  }
}

//Vertical Progressbar scada
function scadaVerticalProgressBarObject(item, variableName) {
  if (item.isMinTag) {
    if (item.minTag.includes(variableName)) item.min = eval(item.minTag);
  }
  else {
    if (item.minValue) item.min = item.minValue;
  }

  if (item.isMaxTag) {
    if (item.maxTag.includes(variableName)) item.max = eval(item.maxTag);
  }
  else {
    if (item.maxValue) item.max = item.maxValue;
  }

  var _range = item.max - item.min;

  if (item.hiddenWhen) {
    if (item.hiddenWhen.includes(variableName)) {
      if (eval(item.hiddenWhen)) $(item).hide();
      else $(item).show();
    }
  }

  if (item.tag) {
    if (item.tag.includes(variableName)) {
      if (eval(item.tag) <= item.min) {
        var _height = '0%';
        var _top = '100%'
      } else if (eval(item.tag) >= item.max) {
        var _height = '100%';
        var _top = '0%'
      } else {
        var _height = Number((eval(item.tag) - item.min) / _range * 100).toFixed(3) + '%';
        var _top = (100 - (eval(item.tag) - item.min) / _range * 100) + '%';
      }

      $(item).children('div').css({
        'height': _height,
        'top': _top,
      });
      if (item.isHideLabel) $(item).children('div').text('');
      else {
        if (!item.isRawValue) $(item).children('div').text(_height);
        else $(item).children('div').text(Number(eval(item.tag)).toFixed(3));
      }
    }
  }
}

//SymbolSet scada
function scadaSymbolSetObject(item, variableName) {
  if (item.hiddenWhen) {
    if (item.hiddenWhen.includes(variableName)) {
      if (eval(item.hiddenWhen)) $(item).hide();
      else $(item).show();
    }
  }

  if (item.onCondition) {
    if (item.onCondition.includes(variableName)) {
      if (eval(item.onCondition)) item.src = item.onSymbol;
      else item.src = item.offSymbol;
    }
  }
}

//Button scada
function scadaButtonObject(item, variableName) {
  if (item.disableWhen) {
    if (item.disableWhen.includes(variableName)) {
      if (eval(item.disableWhen)) $(item).prop('disabled', true);
      else $(item).prop('disabled', false);
    }
  }
}

//Switch scada
function scadaSwitchObject(item, variableName) {
  var _span = $(item).find('span')[0];
  if (_span.disableWhen) {
    if (eval(_span.disableWhen)) $(item).find('input').prop('disabled', true);
    else $(item).find('input').prop('disabled', false);
  }
}

//Checkbox scada
function scadaCheckboxObject(item, variableName) {
  var _label = $(item).find('label')[0];
  if (_label.disableWhen) {
    if (eval(_label.disableWhen)) $(item).find('input').prop('disabled', true);
    else $(item).find('input').prop('disabled', false);
  }
}

//Input scada
function scadaInputObject(item, variableName) {
  if (item.disableWhen) {
    if (item.disableWhen.includes(variableName)) {
      if (eval(item.disableWhen)) $(item).prop('disabled', true);
      else $(item).prop('disabled', false);
    }
  }
}

//Slider scada
function scadaSliderObject(item, variableName) {
  if (item.disableWhen) {
    if (item.disableWhen.includes(variableName)) {
      if (eval(item.disableWhen)) $(item).prop('disabled', true);
      else $(item).prop('disabled', false);
    }
  }

  if (item.tag) {
    if (item.tag.includes(variableName)) {
      item.value = eval(item.tag);
    }
  }

  if (item.isMinTag) {
    if (item.minTag.includes(variableName)) item.min = eval(item.minTag);
  }
  else {
    if (item.minValue) item.min = item.minValue;
  }

  if (item.isMaxTag) {
    if (item.maxTag.includes(variableName)) item.max = eval(item.maxTag);
  }
  else {
    if (item.maxValue) item.max = item.maxValue;
  }
}

//Vertical slider scada
function scadaVerticalSliderObject(item, variableName) {
  if (item.disableWhen) {
    if (item.disableWhen.includes(variableName)) {
      if (eval(item.disableWhen)) $(item).bootstrapSlider('disable');
      else $(item).bootstrapSlider('enable');
    }
  }

  if (item.tag) {
    if (item.tag.includes(variableName)) {
      $(item).bootstrapSlider('setValue', eval(item.tag))
    }
  }

  if (item.isMinTag) {
    if (item.minTag.includes(variableName)) {
      if (item.min != eval(item.minTag)) {
        item.min = eval(item.minTag);
        $(item).bootstrapSlider({ 'min': eval(item.minTag) });
        $(item).bootstrapSlider('refresh');
        $(item).bootstrapSlider('enable');
      }
    }
  }
  else {
    if (item.minValue) item.min = Number(item.minValue);
  }

  if (item.isMaxTag) {
    if (item.maxTag.includes(variableName)) {
      if (item.max != eval(item.maxTag)) {
        item.max = eval(item.maxTag);
        $(item).bootstrapSlider({ 'max': eval(item.maxTag) });
        $(item).bootstrapSlider('refresh');
        $(item).bootstrapSlider('enable');
      }
    }
  }
  else {
    if (item.maxValue) item.max = Number(item.maxValue);
  }

}

//Chart scada
function scadaChartObject(item, variableName, variableTimestamp) {
  var canvas = $(item).find('canvas')[0];
  if (canvas) {
    var foundChartIndex = findChartById(canvas.id);
    if (foundChartIndex != -1) {  //Found chart JS object
      if (canvas.tag) {
        if (canvas.tag.includes(variableName)) {
          var label = moment(variableTimestamp).format('MM:mm:ss');
          var data = eval(canvas.tag);
          addChartData(arrChartJS[foundChartIndex].node, label, data);
        }
      };
      if (canvas.hiddenWhen) {
        if (canvas.hiddenWhen.includes(variableName)) {
          if (eval(canvas.hiddenWhen)) $(item).hide();
          else $(item).show();
        }
      }

    }
  }
}

//Gauge scada
function scadaGaugeObject(item, variableName) {
  if (item) {
    var foundGaugeIndex = findGaugeById(item.id);
    if (foundGaugeIndex != -1) {  //Found chart JS object
      if (item.tag) {
        if (item.tag.includes(variableName)) {
          arrGauge[foundGaugeIndex].node.refresh(eval(item.tag));
        }
      };
      if (item.hiddenWhen) {
        if (item.hiddenWhen.includes(variableName)) {
          if (eval(item.hiddenWhen)) $(item).hide();
          else $(item).show();
        }
      }

    }
  }
}

function findElementHTMLById(_id) {
  for (i = 0; i < elementHTML.length; i++) {
    if (elementHTML[i].id == _id) return elementHTML.indexOf(elementHTML[i]);
  }
  return -1;
}

function findChartById(_id) {
  for (var i = 0; i < arrChartJS.length; i++) {
    if (arrChartJS[i].id == _id) return i;
  }
  return -1;
}

function findGaugeById(_id) {
  for (var i = 0; i < arrGauge.length; i++) {
    if (arrGauge[i].id == _id) return i;
  }
  return -1;
}

//Fix tooltip for vertical slider
function fixTooltip(sliderID) {

  $('.slider-vertical').each(function () {
    $(this).children('.tooltip')[0].classList.add('bs-tooltip-left');
    $(this).children('.tooltip')[0].childNodes[0].classList.add('arrow', 'my-2');
  })


  //Fix background color
  $('.slider-vertical').find('.slider-handle').each(function () {
    $(this).css({ background: '#007bff' })
  });
}

//Update data for chart
function addChartData(chart, label, data) {
  chart.data.labels.push(label);
  chart.data.datasets[0].data.push(data);
  chart.update();
}

//Clear all chart data when press STOP
function clearChartData() {
  for (var i = 0; i < arrChartJS.length; i++) {
    arrChartJS[i].node.data.labels = [];
    arrChartJS[i].node.data.datasets[0].data = [];
    arrChartJS[i].node.update();
  }
}
/*
***********************************************************************************************
                                Create object functions 
***********************************************************************************************
*/

//startDraw function: Start drawing object depending on the parameter
//Input: shape (except POLYGON)
var startDraw = function (shape) {
  var modalId = '';
  //Stop the previous draw
  stopDraw(false);
  //Subscribe mouse down event
  draw.on('mousedown', function (event) {
    switch (shape) {
      case 'line': {
        shapes[index] = draw.line().attr(defaultLineOption);
        modalId = '#lineModal';
        break;
      }
      case 'ellipse': {
        shapes[index] = draw.ellipse().attr(defaultOption);
        modalId = '#ellipseModal';
        break;
      }
      case 'circle': {
        shapes[index] = draw.circle(10).attr(defaultOption);
        modalId = '#circleModal';
        break;
      }
      case 'rect': {
        shapes[index] = draw.rect().attr(defaultOption);
        modalId = '#rectModal';
        break;
      }
      case 'roundRect': {
        shapes[index] = draw.rect().attr(defaultOption);
        shapes[index].radius(10);
        modalId = '#roundRectModal';
        break;
      }
    }
    shapes[index].draw(event);
  }, false);

  //Subscribe mouse up event
  draw.on('mouseup', function (event) {
    shapes[index].draw(event);

    //Subscribe mouse over event for each object
    shapes[index].on('mouseover', function (event) {
      event.target.style.opacity = 0.4;
      //event.target.style.cursor = 'move';
    });
    //Subscribe mouse out event for each object
    shapes[index].on('mouseout', function (event) {
      event.target.style.opacity = 1;
    });

    //Subscribe double click event to open modal
    shapes[index].on('dblclick', function (mouseEvent) {
      $(modalId).one('show.bs.modal', function (showEvent) {

        var htmlElement = mouseEvent.target.getBoundingClientRect();
        var svgOffset = mouseEvent.target.parentNode.getBoundingClientRect();
        var element;
        for (var item of shapes) {

          try {
            if (item.node.id == mouseEvent.target.id) {
              element = item;
              break;
            }
          }
          catch{
            if (item.id == mouseEvent.target.id) {
              element = item;
              break;
            }
          }

        }

        switch (modalId) {
          case '#lineModal': {
            if (element) {
              var elemX1 = element.attr('x1'),
                elemY1 = element.attr('y1'),
                elemX2 = element.attr('x2'),
                elemY2 = element.attr('y2'),
                elemWidth = element.attr('stroke-width'),
                elemLinecap = element.attr('stroke-linecap'),
                elemColor = element.attr('stroke');

              var itemModal = $(modalId)[0];

              itemModal.querySelector('#inputX1').value = elemX1;
              itemModal.querySelector('#inputY1').value = elemY1;
              itemModal.querySelector('#inputX2').value = elemX2;
              itemModal.querySelector('#inputY2').value = elemY2;
              itemModal.querySelector('#inputStrokeWidth').value = elemWidth;
              itemModal.querySelector('#inputColor').value = elemColor;
              itemModal.querySelector('#inputLinecap').value = elemLinecap;

              if (mouseEvent.target.hiddenWhen) {
                itemModal.querySelector('.inputHiddenWhen').value = mouseEvent.target.hiddenWhen;
              }
              else {
                itemModal.querySelector('.inputHiddenWhen').value = '';
              }

              $('.saveChangeButton').on('click', function (event) {
                element.attr({
                  'stroke-width': itemModal.querySelector('#inputStrokeWidth').value,
                  'stroke-linecap': itemModal.querySelector('#inputLinecap').value,
                  'stroke': itemModal.querySelector('#inputColor').value,
                  'x1': itemModal.querySelector('#inputX1').value,
                  'y1': itemModal.querySelector('#inputY1').value,
                  'x2': itemModal.querySelector('#inputX2').value,
                  'y2': itemModal.querySelector('#inputY2').value,
                  'transform': 'translate(0,0)',
                });
                mouseEvent.target.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;

                var _foundIndex = findElementHTMLById(mouseEvent.target.id);
                if (_foundIndex != -1) elementHTML[_foundIndex].properties[0].value = mouseEvent.target.hiddenWhen;

                var html = document.getElementById(mouseEvent.target.id);
                for (draggableItem of draggableObjects) {
                  if (draggableItem.element.id == html.id) {
                    draggableObjects.splice(draggableObjects.indexOf(draggableItem), 1);
                    break;
                  }
                }
                draggable = new PlainDraggable(html, { leftTop: true });
                draggable.autoScroll = true;
                draggable.containment = document.getElementById('mainPage1');
                draggableObjects.push(draggable);
              });

              $('.btnHiddenWhen').on('click', function (onConditionClickEvent) {
                $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                  if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                    itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                  }
                });
              });

            }
            break;
          }

          case '#rectModal': {
            if (element) {

              var elemWidth = parseInt(element.attr('width'), 10),
                elemHeight = parseInt(element.attr('height'), 10),
                elemPositionX = Math.round(htmlElement.left - svgOffset.left),
                elemPositionY = Math.round(htmlElement.top - svgOffset.top),
                elemLineWidth = element.attr('stroke-width'),
                elemColor = element.attr('stroke');


              var itemModal = $(modalId)[0];

              itemModal.querySelector('#inputWidth').value = elemWidth;
              itemModal.querySelector('#inputHeight').value = elemHeight;
              itemModal.querySelector('#inputPositionX').value = elemPositionX;
              itemModal.querySelector('#inputPositionY').value = elemPositionY;
              itemModal.querySelector('#inputShapeLineWidth').value = elemLineWidth;
              itemModal.querySelector('#inputLineColor').value = elemColor;
              itemModal.querySelector('#fillRectCheckbox').checked = element.attr('fill-opacity');
              itemModal.querySelector('#inputFillRectColor').value = element.attr('fill');
              if (mouseEvent.target.hiddenWhen) {
                itemModal.querySelector('.inputHiddenWhen').value = mouseEvent.target.hiddenWhen;
              }
              else {
                itemModal.querySelector('.inputHiddenWhen').value = '';
              }

              $('.saveChangeButton').on('click', function (event) {
                element.attr({
                  'stroke-width': itemModal.querySelector('#inputShapeLineWidth').value,
                  'stroke': itemModal.querySelector('#inputLineColor').value,
                  'width': itemModal.querySelector('#inputWidth').value,
                  'height': itemModal.querySelector('#inputHeight').value,
                  'x': itemModal.querySelector('#inputPositionX').value,
                  'y': itemModal.querySelector('#inputPositionY').value,
                  'transform': 'translate(0 0)',
                  'fill-opacity': Number(itemModal.querySelector('#fillRectCheckbox').checked),
                  'fill': itemModal.querySelector('#inputFillRectColor').value,
                });

                mouseEvent.target.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;

                var _foundIndex = findElementHTMLById(mouseEvent.target.id);
                if (_foundIndex != -1) elementHTML[_foundIndex].properties[0].value = mouseEvent.target.hiddenWhen;

                var html = document.getElementById(mouseEvent.target.id);
                for (draggableItem of draggableObjects) {
                  if (draggableItem.element.id == html.id) {
                    draggableObjects.splice(draggableObjects.indexOf(draggableItem), 1);
                    break;
                  }
                }
                draggable = new PlainDraggable(html, { leftTop: true });
                draggable.autoScroll = true;
                draggable.containment = document.getElementById('mainPage1');
                draggableObjects.push(draggable);
              });

              $('.btnHiddenWhen').on('click', function (onConditionClickEvent) {
                $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                  if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                    itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                  }
                });
              });

            }
            break;
          }

          case '#roundRectModal': {
            if (element) {
              var elemWidth = parseInt(element.attr('width'), 10),
                elemHeight = parseInt(element.attr('height'), 10),
                elemPositionX = Math.round(htmlElement.left - svgOffset.left),
                elemPositionY = Math.round(htmlElement.top - svgOffset.top),
                elemRadiusX = parseInt(element.attr('rx'), 10),
                elemRadiusY = parseInt(element.attr('ry'), 10),
                elemLineWidth = element.attr('stroke-width'),
                elemColor = element.attr('stroke');

              var itemModal = $(modalId)[0];

              itemModal.querySelector('#inputWidth').value = elemWidth;
              itemModal.querySelector('#inputHeight').value = elemHeight;
              itemModal.querySelector('#inputPositionX').value = elemPositionX;
              itemModal.querySelector('#inputPositionY').value = elemPositionY;
              itemModal.querySelector('#inputRadiusX').value = elemRadiusX;
              itemModal.querySelector('#inputRadiusY').value = elemRadiusY;
              itemModal.querySelector('#inputShapeLineWidth').value = elemLineWidth;
              itemModal.querySelector('#inputShapeColor').value = elemColor;
              itemModal.querySelector('#fillRoundRectCheckbox').checked = element.attr('fill-opacity');
              itemModal.querySelector('#inputFillShapeColor').value = element.attr('fill');

              if (mouseEvent.target.hiddenWhen) {
                itemModal.querySelector('.inputHiddenWhen').value = mouseEvent.target.hiddenWhen;
              }
              else {
                itemModal.querySelector('.inputHiddenWhen').value = '';
              }

              $('.saveChangeButton').on('click', function (event) {
                element.attr({
                  'stroke-width': itemModal.querySelector('#inputShapeLineWidth').value,
                  'stroke': itemModal.querySelector('#inputShapeColor').value,
                  'width': itemModal.querySelector('#inputWidth').value,
                  'height': itemModal.querySelector('#inputHeight').value,
                  'x': itemModal.querySelector('#inputPositionX').value,
                  'y': itemModal.querySelector('#inputPositionY').value,
                  'rx': itemModal.querySelector('#inputRadiusX').value,
                  'ry': itemModal.querySelector('#inputRadiusY').value,
                  'transform': 'translate(0 0)',
                  'fill-opacity': Number(itemModal.querySelector('#fillRoundRectCheckbox').checked),
                  'fill': itemModal.querySelector('#inputFillShapeColor').value,
                });

                mouseEvent.target.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;

                var _foundIndex = findElementHTMLById(mouseEvent.target.id);
                if (_foundIndex != -1) elementHTML[_foundIndex].properties[0].value = mouseEvent.target.hiddenWhen;

                var html = document.getElementById(mouseEvent.target.id);
                for (draggableItem of draggableObjects) {
                  if (draggableItem.element.id == html.id) {
                    draggableObjects.splice(draggableObjects.indexOf(draggableItem), 1);
                    break;
                  }
                }
                draggable = new PlainDraggable(html, { leftTop: true });
                draggable.autoScroll = true;
                draggable.containment = document.getElementById('mainPage1');
                draggableObjects.push(draggable);
              });

              $('.btnHiddenWhen').on('click', function (onConditionClickEvent) {
                $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                  if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                    itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                  }
                });
              });
            }
            break;
          }

          case '#circleModal': {
            if (element) {
              var elemCx = Math.round(htmlElement.left - svgOffset.left + (htmlElement.right - htmlElement.left) / 2),
                elemCy = Math.round(htmlElement.top - svgOffset.top + (htmlElement.bottom - htmlElement.top) / 2),
                elemRadius = parseInt(element.attr('r'), 10),
                elemLineWidth = parseInt(element.attr('stroke-width'), 10),
                elemColor = element.attr('stroke');

              var elemIsFilled = false;
              if (element.attr('fill-opacity') != 0) elemIsFilled = true;

              var itemModal = $(modalId)[0];

              itemModal.querySelector('#inputRadius').value = elemRadius;
              itemModal.querySelector('#inputPositionX').value = elemCx;
              itemModal.querySelector('#inputPositionY').value = elemCy;
              itemModal.querySelector('#inputShapeLineWidth').value = elemLineWidth;
              itemModal.querySelector('#inputShapeColor').value = elemColor;
              itemModal.querySelector('#fillCircleCheckbox').checked = element.attr('fill-opacity');
              itemModal.querySelector('#inputFillShapeColor').value = element.attr('fill');

              if (mouseEvent.target.hiddenWhen) {
                itemModal.querySelector('.inputHiddenWhen').value = mouseEvent.target.hiddenWhen;
              }
              else {
                itemModal.querySelector('.inputHiddenWhen').value = '';
              }

              $('.saveChangeButton').on('click', function (event) {
                element.attr({
                  'r': itemModal.querySelector('#inputRadius').value,
                  'stroke-width': itemModal.querySelector('#inputShapeLineWidth').value,
                  'stroke': itemModal.querySelector('#inputShapeColor').value,
                  'cx': itemModal.querySelector('#inputPositionX').value,
                  'cy': itemModal.querySelector('#inputPositionY').value,
                  'transform': 'translate(0 0)',
                  'fill-opacity': Number(itemModal.querySelector('#fillCircleCheckbox').checked),
                  'fill': itemModal.querySelector('#inputFillShapeColor').value,
                });

                mouseEvent.target.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;

                var _foundIndex = findElementHTMLById(mouseEvent.target.id);
                if (_foundIndex != -1) elementHTML[_foundIndex].properties[0].value = mouseEvent.target.hiddenWhen;

                var html = document.getElementById(mouseEvent.target.id);
                for (draggableItem of draggableObjects) {
                  if (draggableItem.element.id == html.id) {
                    draggableObjects.splice(draggableObjects.indexOf(draggableItem), 1);
                    break;
                  }
                }
                draggable = new PlainDraggable(html, { leftTop: true });
                draggable.autoScroll = true;
                draggable.containment = document.getElementById('mainPage1');
                draggableObjects.push(draggable);
              });

              $('.btnHiddenWhen').on('click', function (onConditionClickEvent) {
                $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                  if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                    itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                  }
                });
              });
            }
            break;
          }

          case '#ellipseModal': {
            if (element) {
              var elemCx = Math.round(htmlElement.left - svgOffset.left + (htmlElement.right - htmlElement.left) / 2),
                elemCy = Math.round(htmlElement.top - svgOffset.top + (htmlElement.bottom - htmlElement.top) / 2),
                elemRadiusX = parseInt(element.attr('rx'), 10),
                elemRadiusY = parseInt(element.attr('ry'), 10),
                elemLineWidth = parseInt(element.attr('stroke-width'), 10),
                elemColor = element.attr('stroke');

              var elemIsFilled = false;
              if (element.attr('fill-opacity') != 0) elemIsFilled = true;

              var itemModal = $(modalId)[0];

              itemModal.querySelector('#inputRadiusX').value = elemRadiusX;
              itemModal.querySelector('#inputRadiusY').value = elemRadiusY;
              itemModal.querySelector('#inputPositionX').value = elemCx;
              itemModal.querySelector('#inputPositionY').value = elemCy;
              itemModal.querySelector('#inputShapeLineWidth').value = elemLineWidth;
              itemModal.querySelector('#inputShapeColor').value = elemColor;
              itemModal.querySelector('#fillEllipseCheckbox').checked = element.attr('fill-opacity');
              itemModal.querySelector('#inputFillShapeColor').value = element.attr('fill');

              if (mouseEvent.target.hiddenWhen) {
                itemModal.querySelector('.inputHiddenWhen').value = mouseEvent.target.hiddenWhen;
              }
              else {
                itemModal.querySelector('.inputHiddenWhen').value = '';
              }

              $('.saveChangeButton').on('click', function (event) {
                element.attr({
                  'stroke-width': itemModal.querySelector('#inputShapeLineWidth').value,
                  'stroke': itemModal.querySelector('#inputShapeColor').value,
                  'cx': itemModal.querySelector('#inputPositionX').value,
                  'cy': itemModal.querySelector('#inputPositionY').value,
                  'transform': 'translate(0 0)',
                  'rx': itemModal.querySelector('#inputRadiusX').value,
                  'ry': itemModal.querySelector('#inputRadiusY').value,
                  'fill-opacity': Number(itemModal.querySelector('#fillEllipseCheckbox').checked),
                  'fill': itemModal.querySelector('#inputFillShapeColor').value,
                });

                mouseEvent.target.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;

                var _foundIndex = findElementHTMLById(mouseEvent.target.id);
                if (_foundIndex != -1) elementHTML[_foundIndex].properties[0].value = mouseEvent.target.hiddenWhen;

                var html = document.getElementById(mouseEvent.target.id);
                for (draggableItem of draggableObjects) {
                  if (draggableItem.element.id == html.id) {
                    draggableObjects.splice(draggableObjects.indexOf(draggableItem), 1);
                    break;
                  }
                }
                draggable = new PlainDraggable(html, { leftTop: true });
                draggable.autoScroll = true;
                draggable.containment = document.getElementById('mainPage1');
                draggableObjects.push(draggable);
              });

              $('.btnHiddenWhen').on('click', function (onConditionClickEvent) {
                $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                  if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                    itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                  }
                });
              });
            }
            break;
          }
        }
      });

      $(modalId).one('hide.bs.modal', function (hideEvent) {
        $('.saveChangeButton').off('click');
        $('.btnHiddenWhen').off('click');
      });

      $(modalId).modal();
    });

    //Create elementHTML object
    var _svgObj = {
      type: 'svg',
      id: shapes[index].node.id,
      properties: [
        {
          name: 'hiddenWhen',
          value: ''
        }
      ]
    }
    elementHTML.push(_svgObj);

    //Add draggable feature
    var element = document.getElementById(shapes[index].node.id);
    draggable = new PlainDraggable(element, { leftTop: true });
    draggable.autoScroll = true;
    draggable.containment = document.getElementById('mainPage1');
    draggableObjects.push(draggable);

    //console.log(draggableObjects);


    //Add contextMenu class
    $(element).addClass('contextMenu');

    //Increase index to append the array
    //console.log(shapes);
    index++;
  }, false);
}

//drawPolygon function: Draw polygon
var drawPolygon = function () {
  stopDraw(false);
  shapes[index] = draw.polygon().draw();

  //Polygon attribute
  shapes[index].attr({
    'fill-opacity': 0,
    'stroke-width': 3,
  })

  //Subscribe drawstart event 
  shapes[index].on('drawstart', function (e) {
    //Subscribe mouseover event for each polygon
    shapes[index].on('mouseover', function (event) {
      event.target.style.opacity = 0.4;
      //event.target.style.cursor = 'move';
    });
    //Subscribe mouseout event for each polygon
    shapes[index].on('mouseout', function (event) {
      event.target.style.opacity = 1;
    });

    shapes[index].on('dblclick', function (mouseEvent) {
      $('#polygonModal').one('show.bs.modal', function (showEvent) {
        var element;
        for (var item of shapes) {
          try {
            if (item.node.id == mouseEvent.target.id) {
              element = item;
              break;
            }
          }
          catch {

          }

        }

        if (element) {
          var elemWidth = element.attr('stroke-width'),
            elemColor = element.attr('stroke');


          var itemModal = $('#polygonModal')[0];

          itemModal.querySelector('#inputShapeLineWidth').value = elemWidth;
          itemModal.querySelector('#inputShapeColor').value = elemColor;

          itemModal.querySelector('#fillPolygonCheckbox').checked = element.attr('fill-opacity');
          itemModal.querySelector('#inputFillShapeColor').value = element.attr('fill');

          if (mouseEvent.target.hiddenWhen) {
            itemModal.querySelector('.inputHiddenWhen').value = mouseEvent.target.hiddenWhen;
          }
          else {
            itemModal.querySelector('.inputHiddenWhen').value = '';
          }

          $('.saveChangeButton').on('click', function (event) {
            element.attr({
              'stroke-width': itemModal.querySelector('#inputShapeLineWidth').value,
              'stroke': itemModal.querySelector('#inputShapeColor').value,
              'fill-opacity': Number(itemModal.querySelector('#fillPolygonCheckbox').checked),
              'fill': itemModal.querySelector('#inputFillShapeColor').value,
            });

            mouseEvent.target.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;

            var _foundIndex = findElementHTMLById(mouseEvent.target.id);
            if (_foundIndex != -1) elementHTML[_foundIndex].properties[0].value = mouseEvent.target.hiddenWhen;

          });

          $('.btnHiddenWhen').on('click', function (onConditionClickEvent) {
            $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
              if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
              }
            });
          });
        }

      });

      $('#polygonModal').one('hide.bs.modal', function (hideEvent) {
        $('.saveChangeButton').off('click');
        $('.btnHiddenWhen').off('click');
      });

      $('#polygonModal').modal();
    });

    //Create elementHTML object
    var _svgObj = {
      type: 'svg',
      id: shapes[index].node.id,
      properties: [
        {
          name: 'hiddenWhen',
          value: ''
        }
      ]
    }
    elementHTML.push(_svgObj);

    //Add draggable feature
    var element = document.getElementById(shapes[index].node.id);
    draggable = new PlainDraggable(element, { leftTop: true });
    draggable.autoScroll = true;
    draggable.containment = document.getElementById('mainPage1');
    draggableObjects.push(draggable);

    //Add contextMenu class
    $(element).addClass('contextMenu');


    //Subscribe keydown event to detect ENTER key
    document.addEventListener('keydown', keyEnterDownHandler);
  });

  //Subscribe drawstop event: This event fires when <object>.draw('done') executes 
  shapes[index].on('drawstop', function () {
    //Remove enter key event
    document.removeEventListener('keydown', keyEnterDownHandler);
  });
}

//drawPolyline function: Draw polyline
var drawPolyline = function () {
  stopDraw(false);
  shapes[index] = draw.polyline().draw();

  //Polygon attribute
  shapes[index].attr({
    'fill-opacity': 0,
    'stroke-width': 3,
  })

  //Subscribe drawstart event 
  shapes[index].on('drawstart', function (e) {

    //Subscribe mouseover event for each polygon
    shapes[index].on('mouseover', function (event) {
      event.target.style.opacity = 0.4;
      //event.target.style.cursor = 'move';
    });
    //Subscribe mouseout event for each polygon
    shapes[index].on('mouseout', function (event) {
      event.target.style.opacity = 1;
    });
    //Subscribe double click event
    shapes[index].on('dblclick', function (mouseEvent) {
      $('#polylineModal').one('show.bs.modal', function (showEvent) {
        var element;
        for (var item of shapes) {
          try {
            if (item.node.id == mouseEvent.target.id) {
              element = item;
              break;
            }
          } catch {
            console.log('Item not found');
          }

        }

        if (element) {
          var elemWidth = element.attr('stroke-width'),
            elemColor = element.attr('stroke');

          var itemModal = $('#polylineModal')[0];

          itemModal.querySelector('#inputWidth').value = elemWidth;
          itemModal.querySelector('#inputColor').value = elemColor;

          if (mouseEvent.target.hiddenWhen) {
            itemModal.querySelector('.inputHiddenWhen').value = mouseEvent.target.hiddenWhen;
          }
          else {
            itemModal.querySelector('.inputHiddenWhen').value = '';
          }

          $('.saveChangeButton').on('click', function (event) {
            element.attr({
              'stroke-width': itemModal.querySelector('#inputWidth').value,
              'stroke': itemModal.querySelector('#inputColor').value,
            });

            mouseEvent.target.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;

            var _foundIndex = findElementHTMLById(mouseEvent.target.id);
            if (_foundIndex != -1) elementHTML[_foundIndex].properties[0].value = mouseEvent.target.hiddenWhen;
          });

          $('.btnHiddenWhen').on('click', function (onConditionClickEvent) {
            $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
              if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
              }
            });
          });
        }
      });


      $('#polylineModal').one('hide.bs.modal', function (hideEvent) {
        $('.saveChangeButton').off('click');
        $('.btnHiddenWhen').off('click');
      });

      $('#polylineModal').modal();
    });

    //Create elementHTML object
    var _svgObj = {
      type: 'svg',
      id: shapes[index].node.id,
      properties: [
        {
          name: 'hiddenWhen',
          value: ''
        }
      ]
    }

    elementHTML.push(_svgObj);

    //Add draggable feature
    var element = document.getElementById(shapes[index].node.id);
    draggable = new PlainDraggable(element, { leftTop: true });
    draggable.autoScroll = true;
    draggable.containment = document.getElementById('mainPage1');
    draggableObjects.push(draggable);

    //Add contextMenu class
    $(element).addClass('contextMenu');

    //Subscribe keydown event to detect ENTER key
    document.addEventListener('keydown', keyEnterDownHandler);
  });

  //Subscribe drawstop event: This event fires when <object>.draw('done') executes 
  shapes[index].on('drawstop', function () {
    //Remove enter key event
    document.removeEventListener('keydown', keyEnterDownHandler);
  });
}

//Add new image
function addNewImage() {
  stopDraw(false);
  $('#mainPage1').on('mousedown', imageMouseDownEventHandler);
}

//Add new textblock
function addNewText() {
  stopDraw(false);
  $('#mainPage1').on('mousedown', textMouseDownEventHandler);
}

//Add new display value
function addNewDisplayValue() {
  stopDraw(false);
  $('#mainPage1').on('mousedown', displayValueMouseDownEventHandler);
}

//Add new button
function addNewButton() {
  stopDraw(false);
  $('#mainPage1').on('mousedown', buttonMouseDownEventHandler);
}

//Add new switch
function addNewSwitch() {
  stopDraw(false);
  $('#mainPage1').on('mousedown', switchMouseDownEventHandler);
}

//Add new input
function addNewInput() {
  stopDraw(false);
  $('#mainPage1').on('mousedown', inputMouseDownEventHandler);
}

//Add new checkbox
function addNewCheckbox() {
  stopDraw(false);
  $('#mainPage1').on('mousedown', checkboxMouseDownEventHandler);
}

//Add new slider
function addNewSlider() {
  stopDraw(false);
  $('#mainPage1').on('mousedown', sliderMouseDownEventHandler);
}

//Add new vertical slider
function addNewVerticalSlider() {
  stopDraw(false);
  $('#mainPage1').on('mousedown', verticalSliderMouseDownEventHandler);
}

//Add new process bar
function addNewProcessbar() {
  stopDraw(false);
  $('#mainPage1').on('mousedown', processbarMouseDownEventHandler);
}

//Add new vertical process bar
function addNewVerticalProcessbar() {
  stopDraw(false);
  $('#mainPage1').on('mousedown', verticalProcessbarMouseDownEventHandler);
}

//Add new symbol set
function addNewSymbolSet() {
  stopDraw(false);
  $('#mainPage1').on('mousedown', symbolsetMouseDownEventHandler);
}

//Add new chart
function addNewChart() {
  stopDraw(false);
  $('#mainPage1').on('mousedown', chartMouseDownEventHandler);
}

//Add new gauge
function addNewGauge() {
  stopDraw(false);
  $('#mainPage1').on('mousedown', gaugeMouseDownEventHandler);
}

//Add new chart dashboard
function addNewChartDashboard() {
  stopDraw(false);
  $('#dashboard').on('mousedown', chartDashboardMouseDownEventHandler);
}

//Add new gauge dashboard
function addNewGaugeDashboard() {
  stopDraw(false);
  $('#dashboard').on('mousedown', gaugeDashboardMouseDownEventHandler);
}



/*
***********************************************************************************************
                                Stop drawing function 
***********************************************************************************************
*/

//stopDraw function: Stop all draw action
var stopDraw = function (addContext) {
  draw.off();
  $('#mainPage1').off('mousedown', imageMouseDownEventHandler);
  $('#mainPage1').off('mousedown', textMouseDownEventHandler);
  $('#mainPage1').off('mousedown', displayValueMouseDownEventHandler);
  $('#mainPage1').off('mousedown', buttonMouseDownEventHandler);
  $('#mainPage1').off('mousedown', switchMouseDownEventHandler);
  $('#mainPage1').off('mousedown', inputMouseDownEventHandler);
  $('#mainPage1').off('mousedown', checkboxMouseDownEventHandler);
  $('#mainPage1').off('mousedown', sliderMouseDownEventHandler);
  $('#mainPage1').off('mousedown', verticalSliderMouseDownEventHandler);
  $('#mainPage1').off('mousedown', processbarMouseDownEventHandler);
  $('#mainPage1').off('mousedown', verticalProcessbarMouseDownEventHandler);
  $('#mainPage1').off('mousedown', symbolsetMouseDownEventHandler);
  $('#mainPage1').off('mousedown', chartMouseDownEventHandler);
  $('#mainPage1').off('mousedown', gaugeMouseDownEventHandler);
  $('#dashboard').off('mousedown', chartDashboardMouseDownEventHandler);
  $('#dashboard').off('mousedown', gaugeDashboardMouseDownEventHandler);
  if (addContext) addContextMenu();
}

/*
***********************************************************************************************
                                Event handlers
***********************************************************************************************
*/

//Keydown ENTER event handler: To stop drawing polygon
function keyEnterDownHandler(e) {
  if (e.keyCode == 13) {
    shapes[index].draw('done');
    shapes[index].off('drawstart');
    index++;
    stopDraw();
  }
}

//Image mouse down event handler: To create new image
function imageMouseDownEventHandler(event) {
  var leftOffset = document.getElementById('mainPage1').getBoundingClientRect().left;
  var topOffset = document.getElementById('mainPage1').getBoundingClientRect().top;

  var left = event.pageX - leftOffset + 'px';
  var top = event.pageY - topOffset + 'px';

  //Declare new image
  var defaultImageSrc = '../../images/png/default-image.png';
  shapes[index] = document.createElement('img');
  shapes[index].id = 'img' + nameIndex;
  shapes[index].className += ' contextMenu '

  //Image css style
  shapes[index].src = defaultImageSrc;
  shapes[index].style.height = '100px';
  shapes[index].style.width = '150px';
  shapes[index].style.position = 'absolute';
  shapes[index].style.top = top;
  shapes[index].style.left = left;
  //  shapes[index].style.border = '2px solid black';

  //Create elementHTML object
  var _imgObj = {
    type: 'img',
    id: shapes[index].id,
    properties: [
      {
        name: 'hiddenWhen',
        value: ''
      }
    ]
  }

  elementHTML.push(_imgObj);

  //Image mouse events
  $(shapes[index]).on('mouseover', function (event) {
    event.target.style.cursor = 'pointer';
    event.target.style.opacity = 0.4;
    //event.target.style.cursor = 'move';
  });
  //Subscribe mouseout event for each polygon
  $(shapes[index]).on('mouseout', function (event) {
    event.target.style.opacity = 1;
  });
  //Subscribe mouse double click event
  $(shapes[index]).on('dblclick', function (mouseEvent) {
    $('#imageModal').one('show.bs.modal', function (showEvent) {

      var elem = document.getElementById(mouseEvent.target.id);

      var elemStyle = elem.style;

      var elemWidth = parseInt(elemStyle.width, 10),
        elemHeight = parseInt(elemStyle.height, 10),
        elemPositionX = parseInt(elemStyle.left, 10),
        elemPositionY = parseInt(elemStyle.top, 10),
        elemSource = elem.src;


      //console.log('Target ' + mouseEvent.target.id);

      var itemModal = document.getElementById('imageModal');
      itemModal.querySelector('#inputWidth').value = elemWidth;
      itemModal.querySelector('#inputHeight').value = elemHeight;
      itemModal.querySelector('#inputPositionX').value = elemPositionX;
      itemModal.querySelector('#inputPositionY').value = elemPositionY;
      itemModal.querySelector('.inputImageSource').value = elemSource;

      if (mouseEvent.target.hiddenWhen) {
        itemModal.querySelector('.inputHiddenWhen').value = mouseEvent.target.hiddenWhen;
      }
      else {
        itemModal.querySelector('.inputHiddenWhen').value = '';
      }

      //Button save 
      $('.saveChangeButton').on('click', function (event) {
        elemStyle.width = imageModal.querySelector('#inputWidth').value + 'px';
        elemStyle.height = imageModal.querySelector('#inputHeight').value + 'px';
        elemStyle.left = imageModal.querySelector('#inputPositionX').value + 'px';
        elemStyle.top = imageModal.querySelector('#inputPositionY').value + 'px';
        mouseEvent.target.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;
        mouseEvent.target.src = itemModal.querySelector('.inputImageSource').value;

        var _foundIndex = findElementHTMLById(mouseEvent.target.id);
        if (_foundIndex != -1) elementHTML[_foundIndex].properties[0].value = mouseEvent.target.hiddenWhen;

      });

      $('.btnHiddenWhen').on('click', function (onConditionClickEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

    });

    $('#imageModal').one('hide.bs.modal', function (hideEvent) {
      $('.saveChangeButton').off('click');
      $('.btnHiddenWhen').off('click');
      $('.btnSelect').off('click');
    });

    $('#chooseImageModal').one('show.bs.modal', function (event) {
      $('.btnSelect').on('click', function (btnEvent) {
        if ($("[name=symbol]").is(":checked"))
          $('.inputImageSource').val($('[name=symbol]:checked').val());
        $('#chooseImageModal').modal('toggle');
      });
    });

    $('#imageModal').modal();
  });


  $('#mainPage1').append(shapes[index]);



  //Add draggable feature
  // draggable = new PlainDraggable(shapes[index], { leftTop: true });
  // draggable.position();
  // draggable.autoScroll = true;
  // draggable.containment = document.getElementById('mainPage1');
  // draggableObjects.push(draggable);

  $(shapes[index]).addClass('draggable');
  $('.draggable').draggable({
    refreshPositions: true,
    containment: $('#mainPage1'),
  });

  index++;
  nameIndex++;
}

//Text mouse down event handler: To create new text
function textMouseDownEventHandler(event) {
  var leftOffset = document.getElementById('mainPage1').getBoundingClientRect().left;
  var topOffset = document.getElementById('mainPage1').getBoundingClientRect().top;

  var left = event.pageX - leftOffset + 'px';
  var top = event.pageY - topOffset + 'px';

  //Declare new paragrap
  var para = document.createElement('p');
  var text = document.createTextNode('Textblock');
  para.appendChild(text);
  para.id = 'text' + nameIndex;
  para.className += ' contextMenu ';


  //Image css style
  para.style.fontSize = '30px';
  para.style.fontFamily = 'Arial';
  para.style.fontStyle = 'normal';
  para.style.color = '#000000';
  para.style.position = 'absolute';
  para.style.top = top;
  para.style.left = left;

  //Add to elementHTML
  var _txtObj = {
    type: 'text',
    id: para.id,
    properties: [
      {
        name: 'hiddenWhen',
        value: ''
      }
    ]
  }

  elementHTML.push(_txtObj);

  //Image mouse events
  $(para).on('mouseover', function (event) {
    event.target.style.opacity = 0.4;
    //event.target.style.cursor = 'move';
  });
  //Subscribe mouseout event for each polygon
  $(para).on('mouseout', function (event) {
    event.target.style.opacity = 1;
  });
  //Subscribe mouse double click event
  $(para).on('dblclick', function (mouseEvent) {
    $('#textModal').one('show.bs.modal', function (showEvent) {
      var elemStyle = mouseEvent.target.style;
      var elemId = mouseEvent.target.id;
      var elemFontsize = parseInt(elemStyle.fontSize, 10).toString(),
        elemFontstyle = elemStyle.fontStyle,
        elemFontFamily = elemStyle.fontFamily.replace(/["']/g, ""), //Replace double quote from font with WHITESPACE
        elemColor = rgb2hex(elemStyle.color),
        elemText = mouseEvent.target.innerText;

      var itemModal = $('#textModal')[0];

      itemModal.querySelector('#inputFontSize').value = elemFontsize;
      itemModal.querySelector('#fontPicker').value = elemFontFamily;
      itemModal.querySelector('#fontStyleForm').value = elemFontstyle;
      itemModal.querySelector('#inputTextColor').value = elemColor;
      itemModal.querySelector('#textContent').value = elemText;
      if (mouseEvent.target.hiddenWhen) {
        itemModal.querySelector('.inputHiddenWhen').value = mouseEvent.target.hiddenWhen;
      }
      else {
        itemModal.querySelector('.inputHiddenWhen').value = '';
      }


      $('.saveChangeButton').on('click', function (event) {
        document.getElementById(elemId).style.fontSize = itemModal.querySelector('#inputFontSize').value + 'px';
        document.getElementById(elemId).style.fontFamily = itemModal.querySelector('#fontPicker').value;
        document.getElementById(elemId).style.color = itemModal.querySelector('#inputTextColor').value;
        document.getElementById(elemId).style.fontStyle = itemModal.querySelector('#fontStyleForm').value;
        document.getElementById(elemId).innerHTML = itemModal.querySelector('#textContent').value;
        mouseEvent.target.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;

        var _foundIndex = findElementHTMLById(elemId);
        if (_foundIndex != -1) elementHTML[_foundIndex].properties[0].value = mouseEvent.target.hiddenWhen;
      });

      $('.btnHiddenWhen').on('click', function (onConditionClickEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

    });

    $('#textModal').one('hide.bs.modal', function (hideEvent) {
      $('.saveChangeButton').off('click');
      $('.btnHiddenWhen').off('click');
    });

    $('#textModal').modal();
  });

  $('#mainPage1').append(para);
  shapes[index] = para;
  //Change draggable from Plain Draggable -> Jquery UI
  $(shapes[index]).addClass('draggable');
  $('.draggable').draggable({
    refreshPositions: true,
    containment: $('#mainPage1'),
  });


  index++;
  nameIndex++;

  //Add draggable feature
  // draggable = new PlainDraggable(para, { leftTop: true });
  // draggable.autoScroll = true;
  // draggable.containment = document.getElementById('mainPage1');
  // draggableObjects.push(draggable);



}

//Display Value mouse down event handler: To create new DisplayValue
function displayValueMouseDownEventHandler(event) {
  var leftOffset = document.getElementById('mainPage1').getBoundingClientRect().left;
  var topOffset = document.getElementById('mainPage1').getBoundingClientRect().top;

  var left = event.pageX - leftOffset + 'px';
  var top = event.pageY - topOffset + 'px';

  //Declare new paragrap
  var para = document.createElement('p');
  var text = document.createTextNode('##.##');
  para.appendChild(text);
  para.id = 'displayValue' + nameIndex;
  para.className += ' contextMenu '

  //Image css style
  para.style.fontSize = '40px';
  para.style.fontFamily = 'Arial';
  para.style.fontStyle = 'normal';
  para.style.color = '#000000';
  para.style.position = 'absolute';
  para.style.top = top;
  para.style.left = left;

  //Create elementHTML object
  var _dispObj = {
    type: 'displayValue',
    id: para.id,
    properties: [
      {
        name: 'tag',
        value: ''
      },
      {
        name: 'format',
        value: ''
      },
      {
        name: 'hiddenWhen',
        value: ''
      }
    ]
  }

  elementHTML.push(_dispObj);

  //Image mouse events
  $(para).on('mouseover', function (event) {
    event.target.style.opacity = 0.4;
    //event.target.style.cursor = 'move';
  });
  //Subscribe mouseout event for each polygon
  $(para).on('mouseout', function (event) {
    event.target.style.opacity = 1;
  });
  //Subscribe mouse double click event
  $(para).on('dblclick', function (mouseEvent) {
    $('#displayValueModal').one('show.bs.modal', function (showEvent) {
      var elemStyle = mouseEvent.target.style;
      var elemId = mouseEvent.target.id;
      var elemFontsize = parseInt(elemStyle.fontSize, 10).toString(),
        elemFontstyle = elemStyle.fontStyle,
        elemFontFamily = elemStyle.fontFamily.replace(/["']/g, ""), //Replace double quote from font with WHITESPACE
        elemColor = rgb2hex(elemStyle.color),
        elemText = mouseEvent.target.innerText;
      elemFormat = mouseEvent.target.format;

      var itemModal = $('#displayValueModal')[0];

      itemModal.querySelector('#inputFontSize').value = elemFontsize;
      itemModal.querySelector('#fontPicker').value = elemFontFamily;
      itemModal.querySelector('#fontStyleForm').value = elemFontstyle;
      itemModal.querySelector('#inputTextColor').value = elemColor;
      itemModal.querySelector('#textContent').value = elemText;
      if (elemFormat) itemModal.querySelector('#displayFormat').value = elemFormat;
      else itemModal.querySelector('#displayFormat').value = 3;

      if (mouseEvent.target.hiddenWhen) {
        itemModal.querySelector('.inputHiddenWhen').value = mouseEvent.target.hiddenWhen;
      }
      else {
        itemModal.querySelector('.inputHiddenWhen').value = '';
      }

      if (mouseEvent.target.tag) {
        itemModal.querySelector('.inputTag').value = mouseEvent.target.tag;
      }
      else {
        itemModal.querySelector('.inputTag').value = '';
      }

      $('.saveChangeButton').on('click', function (event) {
        document.getElementById(elemId).style.fontSize = itemModal.querySelector('#inputFontSize').value + 'px';
        document.getElementById(elemId).style.fontFamily = itemModal.querySelector('#fontPicker').value;
        document.getElementById(elemId).style.color = itemModal.querySelector('#inputTextColor').value;
        document.getElementById(elemId).style.fontStyle = itemModal.querySelector('#fontStyleForm').value;
        document.getElementById(elemId).innerHTML = itemModal.querySelector('#textContent').value;
        mouseEvent.target.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;
        mouseEvent.target.tag = itemModal.querySelector('.inputTag').value;
        mouseEvent.target.format = itemModal.querySelector('#displayFormat').value;

        var _foundIndex = findElementHTMLById(elemId);
        if (_foundIndex != -1) {
          elementHTML[_foundIndex].properties[0].value = mouseEvent.target.tag;
          elementHTML[_foundIndex].properties[1].value = mouseEvent.target.format;
          elementHTML[_foundIndex].properties[2].value = mouseEvent.target.hiddenWhen;
        }

      });

      $('.btnTag').on('click', function (onConditionClickEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputTag').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

      $('.btnHiddenWhen').on('click', function (onConditionClickEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

    });

    $('#displayValueModal').one('hide.bs.modal', function (hideEvent) {
      $('.saveChangeButton').off('click');
      $('.btnTag').off('click');
      $('.btnHiddenWhen').off('click');
    });

    $('#displayValueModal').modal();
  });

  $('#mainPage1').append(para);
  shapes[index] = para;

  $(shapes[index]).addClass('draggable');
  $('.draggable').draggable({
    refreshPositions: true,
    containment: $('#mainPage1'),
  });

  index++;
  nameIndex++;

  //Add draggable feature
  // draggable = new PlainDraggable(para, { leftTop: true });
  // draggable.autoScroll = true;
  // draggable.containment = document.getElementById('mainPage1');
  // draggableObjects.push(draggable);
}

//Button mouse down event handler: To create new button
function buttonMouseDownEventHandler(event) {
  var leftOffset = document.getElementById('mainPage1').getBoundingClientRect().left;
  var topOffset = document.getElementById('mainPage1').getBoundingClientRect().top;

  var left = event.pageX - leftOffset + 'px';
  var top = event.pageY - topOffset + 'px';

  //Declare new paragrap
  var btn = document.createElement('button');
  var text = document.createTextNode('Button');
  btn.appendChild(text);
  btn.id = 'button' + nameIndex;

  //Image css style
  btn.className = 'btn btn-primary contextMenu ';
  btn.style.position = 'absolute';
  btn.style.top = top;
  btn.style.left = left;
  btn.style.color = '#ffffff';
  btn.style.background = '#4285F4';
  btn.style.fontFamily = 'Helvetica Neue';
  btn.style.fontSize = '16px';
  btn.style.fontStyle = 'normal';

  //Create elementHTML object
  var _btnObj = {
    type: 'button',
    id: btn.id,
    properties: [
      {
        name: 'command',
        value: ''
      },
      {
        name: 'disableWhen',
        value: ''
      }
    ]
  }

  elementHTML.push(_btnObj);

  //Image mouse events
  $(btn).on('mouseover', function (event) {
    event.target.style.opacity = 0.4;
    //event.target.style.cursor = 'move';
  });
  //Subscribe mouseout event for each polygon
  $(btn).on('mouseout', function (event) {
    event.target.style.opacity = 1;
  });
  //Subscribe mouse double click event
  $(btn).on('dblclick', function (mouseEvent) {
    $('#buttonModal').one('show.bs.modal', function (showEvent) {
      var elemStyle = mouseEvent.target.style;
      var elemId = mouseEvent.target.id;

      var htmlElement = mouseEvent.target.getBoundingClientRect();
      var svgOffset = mouseEvent.target.parentNode.getBoundingClientRect();

      var elemFontsize = parseInt(elemStyle.fontSize, 10).toString(),
        elemFontstyle = elemStyle.fontStyle,
        elemFontFamily = elemStyle.fontFamily.replace(/["']/g, ""), //Replace double quote from font with WHITESPACE
        elemColor = rgb2hex(elemStyle.color),
        elemBackground = rgb2hex(elemStyle.background),
        elemWidth = Math.round(htmlElement.right - htmlElement.left),
        elemHeight = Math.round(htmlElement.bottom - htmlElement.top),
        elemPositionX = Math.round(htmlElement.left - svgOffset.left),
        elemPositionY = Math.round(htmlElement.top - svgOffset.top),
        elemText = mouseEvent.target.innerText;


      var itemModal = $('#buttonModal')[0];

      itemModal.querySelector('#inputFontSize').value = elemFontsize;
      itemModal.querySelector('#fontPicker').value = elemFontFamily;
      itemModal.querySelector('#fontStyleForm').value = elemFontstyle;
      itemModal.querySelector('#inputTextColor').value = elemColor;
      itemModal.querySelector('#inputBackgroundColor').value = elemBackground;
      itemModal.querySelector('#textContent').value = elemText;
      itemModal.querySelector('#inputWidth').value = elemWidth;
      itemModal.querySelector('#inputHeight').value = elemHeight;
      itemModal.querySelector('#inputPositionX').value = elemPositionX;
      itemModal.querySelector('#inputPositionY').value = elemPositionY;

      if (mouseEvent.target.command) {
        itemModal.querySelector('.inputCommand').value = mouseEvent.target.command;
      }
      else {
        itemModal.querySelector('.inputCommand').value = '';
      }

      if (mouseEvent.target.disableWhen) {
        itemModal.querySelector('.inputDisableWhen').value = mouseEvent.target.disableWhen;
      }
      else {
        itemModal.querySelector('.inputDisableWhen').value = '';
      }

      $('.saveChangeButton').on('click', function (event) {
        document.getElementById(elemId).style.fontSize = itemModal.querySelector('#inputFontSize').value + 'px';
        document.getElementById(elemId).style.fontFamily = itemModal.querySelector('#fontPicker').value;
        document.getElementById(elemId).style.color = itemModal.querySelector('#inputTextColor').value;
        document.getElementById(elemId).style.background = itemModal.querySelector('#inputBackgroundColor').value;
        document.getElementById(elemId).style.fontStyle = itemModal.querySelector('#fontStyleForm').value;
        document.getElementById(elemId).innerHTML = itemModal.querySelector('#textContent').value;
        document.getElementById(elemId).style.left = itemModal.querySelector('#inputPositionX').value + 'px';
        document.getElementById(elemId).style.top = Number(itemModal.querySelector('#inputPositionY').value) + 43 + 'px';
        document.getElementById(elemId).style.width = itemModal.querySelector('#inputWidth').value + 'px';
        document.getElementById(elemId).style.height = itemModal.querySelector('#inputHeight').value + 'px';
        mouseEvent.target.command = itemModal.querySelector('.inputCommand').value;
        mouseEvent.target.disableWhen = itemModal.querySelector('.inputDisableWhen').value;

        var _foundIndex = findElementHTMLById(elemId);
        if (_foundIndex != -1) {
          elementHTML[_foundIndex].properties[0].value = mouseEvent.target.command;
          elementHTML[_foundIndex].properties[1].value = mouseEvent.target.disableWhen;
        }

        // var html = document.getElementById(elemId);
        // for (draggableItem of draggableObjects) {
        //   if (draggableItem.element.id == html.id) {
        //     draggableObjects.splice(draggableObjects.indexOf(draggableItem), 1);
        //     break;
        //   }
        // }
        // draggable = new PlainDraggable(html, { leftTop: true });
        // draggable.autoScroll = true;
        // draggable.containment = document.getElementById('mainPage1');
        // draggableObjects.push(draggable);
      });

      $('.btnCommand').on('click', function (onConditionClickEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputCommand').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

      $('.btnDisableWhen').on('click', function (onConditionClickEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputDisableWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

    });

    $('#buttonModal').one('hide.bs.modal', function (hideEvent) {
      $('.saveChangeButton').off('click');
      $('.btnCommand').off('click');
      $('.btnDisableWhen').off('click');
    });

    $('#buttonModal').modal();
  });
  $('#mainPage1').append(btn);
  shapes[index] = btn;
  index++;
  nameIndex++;

  //Add draggable feature
  // draggable = new PlainDraggable(btn, { leftTop: true });
  // draggable.autoScroll = true;
  // draggable.containment = document.getElementById('mainPage1');
  // draggableObjects.push(draggable);
  btn.classList.add('draggable');
  $('.draggable').draggable({
    refreshPositions: true,
    containment: $('#mainPage1'),
    cancel: false,
  });


}

//Switch mouse down event handler: To create new switch
function switchMouseDownEventHandler(event) {
  var leftOffset = document.getElementById('mainPage1').getBoundingClientRect().left;
  var topOffset = document.getElementById('mainPage1').getBoundingClientRect().top;

  var left = event.pageX - leftOffset + 'px';
  var top = event.pageY - topOffset + 'px';

  //Declare new paragrap
  var sw = document.createElement('label');
  sw.className = 'switch contextMenu ';

  var inputsw = document.createElement('input');
  inputsw.setAttribute('type', 'checkbox');
  inputsw.className = ' primary ';

  var spansw = document.createElement('span');
  spansw.className = 'slider-sw round';
  spansw.id = 'switch' + nameIndex;

  sw.appendChild(inputsw);
  sw.appendChild(spansw);

  //sw.id = 'switch' + index;

  //Image css style
  sw.style.position = 'absolute';
  sw.style.top = top;
  sw.style.left = left;

  //Create elementHTML object
  var _swObj = {
    type: 'switch',
    id: spansw.id,
    properties: [
      {
        name: 'onCommand',
        value: ''
      },
      {
        name: 'offCommand',
        value: ''
      },
      {
        name: 'disableWhen',
        value: ''
      }
    ]
  }

  elementHTML.push(_swObj);
  //Image mouse events
  // $(sw).on('mouseover', function (event) {
  //   event.target.style.opacity = 0.65;
  //   //event.target.style.cursor = 'move';
  // });
  //Subscribe mouseout event for each polygon
  // $(sw).on('mouseout', function (vent) {
  //   event.target.style.opacity = 1;
  // });
  //Subscribe mouse double click event
  $(sw).on('dblclick', function (mouseEvent) {
    $('#switchModal').one('show.bs.modal', function (showEvent) {
      var itemModal = $('#switchModal')[0];

      if (mouseEvent.target.onCommand) {
        itemModal.querySelector('.inputOnCommand').value = mouseEvent.target.onCommand;
      }
      else {
        itemModal.querySelector('.inputOnCommand').value = '';
      }

      if (mouseEvent.target.offCommand) {
        itemModal.querySelector('.inputOffCommand').value = mouseEvent.target.offCommand;
      }
      else {
        itemModal.querySelector('.inputOffCommand').value = '';
      }

      if (mouseEvent.target.disableWhen) {
        itemModal.querySelector('.inputDisableWhen').value = mouseEvent.target.disableWhen;
      }
      else {
        itemModal.querySelector('.inputDisableWhen').value = '';
      }

      $('.saveChangeButton').on('click', function (event) {
        mouseEvent.target.onCommand = itemModal.querySelector('.inputOnCommand').value;
        mouseEvent.target.offCommand = itemModal.querySelector('.inputOffCommand').value;
        mouseEvent.target.disableWhen = itemModal.querySelector('.inputDisableWhen').value;


        var _foundIndex = findElementHTMLById(mouseEvent.target.id);
        if (_foundIndex != -1) {
          elementHTML[_foundIndex].properties[0].value = mouseEvent.target.onCommand;
          elementHTML[_foundIndex].properties[1].value = mouseEvent.target.offCommand;
          elementHTML[_foundIndex].properties[2].value = mouseEvent.target.disableWhen;
        }

      });

      $('.btnOnCommand').on('click', function (onConditionClickEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputOnCommand').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

      $('.btnOffCommand').on('click', function (onConditionClickEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputOffCommand').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

      $('.btnDisableWhen').on('click', function (onConditionClickEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputDisableWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

    });

    $('#switchModal').one('hide.bs.modal', function (hideEvent) {
      $('.saveChangeButton').off('click');
      $('.btnOnCommand').off('click');
      $('.btnOffCommand').off('click');
      $('.btnDisableWhen').off('click');
    });

    $('#switchModal').modal();
  });

  $('#mainPage1').append(sw);
  shapes[index] = sw;
  index++;
  nameIndex++;

  //Add draggable feature
  // draggable = new PlainDraggable(sw, { leftTop: true });
  // draggable.autoScroll = true;
  // draggable.containment = document.getElementById('mainPage1');
  // draggableObjects.push(draggable);

  sw.classList.add('draggable');
  $('.draggable').draggable({
    refreshPositions: true,
    containment: $('#mainPage1'),
    cancel: false,
  });

}

//Input mouse down event handler: To create new input
function inputMouseDownEventHandler(event) {
  var leftOffset = document.getElementById('mainPage1').getBoundingClientRect().left;
  var topOffset = document.getElementById('mainPage1').getBoundingClientRect().top;

  var left = event.pageX - leftOffset + 'px';
  var top = event.pageY - topOffset + 'px';

  //Declare new paragrap
  var input = document.createElement('input');
  input.type = 'number';
  input.id = 'input' + nameIndex;
  input.placeholder = 'Add value ...';

  //Image css style
  input.className = 'form-control contextMenu ';
  input.style.width = '200px';
  input.style.position = 'absolute';
  input.style.top = top;
  input.style.left = left;

  //Create elementHTML object
  var _inputObj = {
    type: 'input',
    id: input.id,
    properties: [
      {
        name: 'tag',
        value: ''
      },
      {
        name: 'disableWhen',
        value: ''
      }
    ]
  }

  elementHTML.push(_inputObj);

  //Image mouse events
  $(input).on('mouseover', function (event) {
    event.target.style.opacity = 0.4;
    event.target.style.cursor = 'pointer';
  });
  //Subscribe mouseout event for each polygon
  $(input).on('mouseout', function (event) {
    event.target.style.opacity = 1;
  });
  //Subscribe mouse double click event
  $(input).on('dblclick', function (mouseEvent) {
    $('#inputModal').one('show.bs.modal', function (showEvent) {
      var elemStyle = mouseEvent.target.style;
      var elemId = mouseEvent.target.id;
      var elemBound = mouseEvent.target.getBoundingClientRect();

      var elemWidth = parseInt(elemStyle.width, 10),
        elemHeight = Math.round(elemBound.bottom - elemBound.top);
      elemType = mouseEvent.target.type;

      var itemModal = $('#inputModal')[0];
      itemModal.querySelector('.inputWidth').value = elemWidth;
      itemModal.querySelector('.inputHeight').value = elemHeight;
      itemModal.querySelector('.inputType').value = elemType;

      if (mouseEvent.target.tag) {
        itemModal.querySelector('.inputTag').value = mouseEvent.target.tag;
      }
      else {
        itemModal.querySelector('.inputTag').value = '';
      }

      if (mouseEvent.target.disableWhen) {
        itemModal.querySelector('.inputDisableWhen').value = mouseEvent.target.disableWhen;
      }
      else {
        itemModal.querySelector('.inputDisableWhen').value = '';
      }

      $('.saveChangeButton').on('click', function (event) {
        document.getElementById(elemId).style.width = itemModal.querySelector('.inputWidth').value + 'px';
        document.getElementById(elemId).style.height = itemModal.querySelector('.inputHeight').value + 'px';
        mouseEvent.target.tag = itemModal.querySelector('.inputTag').value;
        mouseEvent.target.disableWhen = itemModal.querySelector('.inputDisableWhen').value;
        mouseEvent.target.type = itemModal.querySelector('.inputType').value;

        var _foundIndex = findElementHTMLById(elemId);
        if (_foundIndex != -1) {
          elementHTML[_foundIndex].properties[0].value = mouseEvent.target.tag;
          elementHTML[_foundIndex].properties[1].value = mouseEvent.target.disableWhen;
        }
      });

      $('.btnTag').on('click', function (onConditionClickEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputTag').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

      $('.btnDisableWhen').on('click', function (onConditionClickEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputDisableWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

    });

    $('#inputModal').one('hide.bs.modal', function (hideEvent) {
      $('.saveChangeButton').off('click');
      $('.btnTag').off('click');
      $('.btnDisableWhen').off('click');
    });

    $('#inputModal').modal();
  });

  $('#mainPage1').append(input);
  shapes[index] = input;
  index++;
  nameIndex++;

  //Add draggable feature
  // draggable = new PlainDraggable(input, { leftTop: true });
  // draggable.autoScroll = true;
  // draggable.containment = document.getElementById('mainPage1');
  // draggableObjects.push(draggable);
  input.classList.add('draggable');
  $('.draggable').draggable({
    refreshPositions: true,
    containment: $('#mainPage1'),
    cancel: false,
  });


}

//Checkbox mouse down event handler: To create new Checkbox
function checkboxMouseDownEventHandler(event) {
  var leftOffset = document.getElementById('mainPage1').getBoundingClientRect().left;
  var topOffset = document.getElementById('mainPage1').getBoundingClientRect().top;

  var left = event.pageX - leftOffset + 'px';
  var top = event.pageY - topOffset + 'px';

  //Declare new paragrap
  var checkbox = document.createElement('div');
  checkbox.className = 'custom-control custom-checkbox contextMenu ';
  //checkbox.id = 'checkbox' + index;

  var cbInput = document.createElement('input');
  cbInput.type = 'checkbox';
  cbInput.className = 'custom-control-input';
  cbInput.id = 'cbInput' + nameIndex;

  var cbLabel = document.createElement('label');
  cbLabel.className = 'custom-control-label';
  cbLabel.htmlFor = 'cbInput' + nameIndex;
  cbLabel.innerText = 'Checkbox';
  cbLabel.id = 'checkbox' + nameIndex;

  checkbox.appendChild(cbInput);
  checkbox.appendChild(cbLabel);


  //Image css style
  checkbox.style.position = 'absolute';
  checkbox.style.top = top;
  checkbox.style.left = left;

  //Create elementHTML object
  var _chbObj = {
    type: 'checkbox',
    id: cbLabel.id,
    properties: [
      {
        name: 'checkedCommand',
        value: ''
      },
      {
        name: 'unCheckedCommand',
        value: ''
      },
      {
        name: 'disableWhen',
        value: ''
      }
    ]
  }

  elementHTML.push(_chbObj);


  //Image mouse events
  $(checkbox).on('mouseover', function (event) {
    event.target.style.opacity = 0.4;
    //event.target.style.cursor = 'move';
  });
  //Subscribe mouseout event for each polygon
  $(checkbox).on('mouseout', function (event) {
    event.target.style.opacity = 1;
  });
  //Subscribe double click event
  $(checkbox).on('dblclick', function (mouseEvent) {
    $('#checkboxModal').one('show.bs.modal', function (showEvent) {

      var itemModal = $('#checkboxModal')[0];
      itemModal.querySelector('.textContent').value = mouseEvent.target.innerText;

      if (mouseEvent.target.checkedCommand) {
        itemModal.querySelector('.inputChecked').value = mouseEvent.target.checkedCommand;
      }
      else {
        itemModal.querySelector('.inputChecked').value = '';
      }

      if (mouseEvent.target.unCheckedCommand) {
        itemModal.querySelector('.inputUnchecked').value = mouseEvent.target.unCheckedCommand;
      }
      else {
        itemModal.querySelector('.inputUnchecked').value = '';
      }

      if (mouseEvent.target.disableWhen) {
        itemModal.querySelector('.inputDisableWhen').value = mouseEvent.target.disableWhen;
      }
      else {
        itemModal.querySelector('.inputDisableWhen').value = '';
      }

      $('.saveChangeButton').on('click', function (event) {
        mouseEvent.target.innerHTML = itemModal.querySelector('.textContent').value;
        mouseEvent.target.checkedCommand = itemModal.querySelector('.inputChecked').value;
        mouseEvent.target.unCheckedCommand = itemModal.querySelector('.inputUnchecked').value;
        mouseEvent.target.disableWhen = itemModal.querySelector('.inputDisableWhen').value;

        var _foundIndex = findElementHTMLById(mouseEvent.target.id);
        if (_foundIndex != -1) {
          elementHTML[_foundIndex].properties[0].value = mouseEvent.target.checkedCommand;
          elementHTML[_foundIndex].properties[1].value = mouseEvent.target.unCheckedCommand;
          elementHTML[_foundIndex].properties[2].value = mouseEvent.target.disableWhen;
        }
      });

      $('.btnChecked').on('click', function (onConditionClickEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputChecked').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

      $('.btnUnchecked').on('click', function (onConditionClickEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputUnchecked').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

      $('.btnDisableWhen').on('click', function (onConditionClickEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputDisableWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

    });

    $('#checkboxModal').one('hide.bs.modal', function (hideEvent) {
      $('.saveChangeButton').off('click');
      $('.btnChecked').off('click');
      $('.btnUnchecked').off('click');
      $('.btnDisableWhen').off('click');
    });

    $('#checkboxModal').modal();
  });

  $('#mainPage1').append(checkbox);
  shapes[index] = checkbox;
  index++;
  nameIndex++;

  //Add draggable feature
  // draggable = new PlainDraggable(checkbox, { leftTop: true });
  // draggable.autoScroll = true;
  // draggable.containment = document.getElementById('mainPage1');
  // draggableObjects.push(draggable);

  checkbox.classList.add('draggable');
  $('.draggable').draggable({
    refreshPositions: true,
    containment: $('#mainPage1'),
    cancel: false,
  });
}

//Slider mouse down event handler: To create new Checkbox
function sliderMouseDownEventHandler(event) {
  var leftOffset = document.getElementById('mainPage1').getBoundingClientRect().left;
  var topOffset = document.getElementById('mainPage1').getBoundingClientRect().top;

  var left = event.pageX - leftOffset + 'px';
  var top = event.pageY - topOffset + 'px';

  //Declare new paragrap
  var slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'custom-range contextMenu ';
  slider.id = 'slider' + nameIndex;
  slider.min = 0;
  slider.max = 100;
  slider.minValue = slider.min;
  slider.maxValue = slider.max;

  //Image css style
  slider.style.position = 'absolute';
  slider.style.top = top;
  slider.style.left = left;
  slider.style.width = '400px';

  //Create elementHTML object
  var _sliderObj = {
    type: 'slider',
    id: slider.id,
    properties: [
      {
        name: 'tag',
        value: ''
      },
      {
        name: 'minTag',
        value: ''
      },
      {
        name: 'minValue',
        value: ''
      },
      {
        name: 'maxTag',
        value: ''
      },
      {
        name: 'maxValue',
        value: ''
      },
      {
        name: 'isMinTag',
        value: ''
      },
      {
        name: 'isMaxTag',
        value: ''
      },
      {
        name: 'disableWhen',
        value: ''
      }
    ]
  }

  elementHTML.push(_sliderObj);

  //Image mouse events
  $(slider).on('mouseover', function (event) {
    event.target.style.opacity = 0.4;
    $(this).tooltip('dispose');
    $(this).tooltip({
      animation: false,
      offset: (this.value - (this.max - this.min) / 2) * (parseInt(this.style.width, 10) / (this.max - this.min)),
      title: this.value
    });
    $(this).tooltip('show');

  });
  //Subscribe mouseout event for each polygon
  $(slider).on('mouseout', function (event) {
    event.target.style.opacity = 1;
    $(this).tooltip('hide');
  });
  //Subscribe mouse double click event
  $(slider).on('dblclick', function (mouseEvent) {
    $('#sliderModal').one('show.bs.modal', function (showEvent) {

      var elem = document.getElementById(mouseEvent.target.id);
      var elemStyle = elem.style;

      var elemWidth = parseInt(elemStyle.width, 10);

      var itemModal = $('#sliderModal')[0];
      itemModal.querySelector('.inputWidth').value = elemWidth;

      if (mouseEvent.target.tag) {
        itemModal.querySelector('.inputValue').value = mouseEvent.target.tag;
      }
      else {
        itemModal.querySelector('.inputValue').value = '';
      }

      if (mouseEvent.target.minTag) {
        itemModal.querySelector('.inputMinTag').value = mouseEvent.target.minTag;
      }
      else {
        itemModal.querySelector('.inputMinTag').value = '';
      }

      if (mouseEvent.target.minValue) {
        itemModal.querySelector('.inputMinValue').value = mouseEvent.target.minValue;
      }
      else {
        itemModal.querySelector('.inputMinValue').value = '';
      }

      if (mouseEvent.target.maxTag) {
        itemModal.querySelector('.inputMaxTag').value = mouseEvent.target.maxTag;
      }
      else {
        itemModal.querySelector('.inputMaxTag').value = '';
      }

      if (mouseEvent.target.maxValue) {
        itemModal.querySelector('.inputMaxValue').value = mouseEvent.target.maxValue;
      }
      else {
        itemModal.querySelector('.inputMaxValue').value = '';
      }

      if (mouseEvent.target.disableWhen) {
        itemModal.querySelector('.inputDisableWhen').value = mouseEvent.target.disableWhen;
      }
      else {
        itemModal.querySelector('.inputDisableWhen').value = '';
      }

      //Button save 
      $('.saveChangeButton').on('click', function (event) {
        elemStyle.width = itemModal.querySelector('.inputWidth').value + 'px';
        mouseEvent.target.tag = itemModal.querySelector('.inputValue').value;
        mouseEvent.target.minTag = itemModal.querySelector('.inputMinTag').value;
        mouseEvent.target.minValue = itemModal.querySelector('.inputMinValue').value;
        mouseEvent.target.maxTag = itemModal.querySelector('.inputMaxTag').value;
        mouseEvent.target.maxValue = itemModal.querySelector('.inputMaxValue').value;
        mouseEvent.target.disableWhen = itemModal.querySelector('.inputDisableWhen').value;

        if (itemModal.querySelector('.inputMinTag').value)
          mouseEvent.target.isMinTag = true;
        else mouseEvent.target.isMinTag = false;

        if (itemModal.querySelector('.inputMaxTag').value)
          mouseEvent.target.isMaxTag = true;
        else mouseEvent.target.isMaxTag = false;

        var _foundIndex = findElementHTMLById(mouseEvent.target.id);
        if (_foundIndex != -1) {
          elementHTML[_foundIndex].properties[0].value = mouseEvent.target.tag;
          elementHTML[_foundIndex].properties[1].value = mouseEvent.target.minTag;
          elementHTML[_foundIndex].properties[2].value = mouseEvent.target.minValue;
          elementHTML[_foundIndex].properties[3].value = mouseEvent.target.maxTag;
          elementHTML[_foundIndex].properties[4].value = mouseEvent.target.maxValue;
          elementHTML[_foundIndex].properties[5].value = mouseEvent.target.isMinTag;
          elementHTML[_foundIndex].properties[6].value = mouseEvent.target.isMaxTag;
          elementHTML[_foundIndex].properties[7].value = mouseEvent.target.disableWhen;
        }
      });

      //Browse button
      $('.btnValue').on('click', function (onConditionClickEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputValue').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

      $('.btnMinTag').on('click', function (onConditionClickEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputMinTag').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

      $('.btnMaxTag').on('click', function (onConditionClickEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputMaxTag').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

      $('.btnDisableWhen').on('click', function (onConditionClickEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputDisableWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

    });

    $('#sliderModal').one('hide.bs.modal', function (hideEvent) {
      $('.saveChangeButton').off('click');
      $('.btnValue').off('click');
      $('.btnMinTag').off('click');
      $('.btnMaxTag').off('click');
      $('.btnDisableWhen').off('click');
    });

    $('#sliderModal').modal();
  });

  $('#mainPage1').append(slider);
  shapes[index] = slider;
  index++;
  nameIndex++;

  //Add draggable feature
  // draggable = new PlainDraggable(slider, { leftTop: true });
  // draggable.autoScroll = true;
  // draggable.containment = document.getElementById('mainPage1');
  // draggableObjects.push(draggable);
  slider.classList.add('draggable');
  $('.draggable').draggable({
    refreshPositions: true,
    containment: $('#mainPage1'),
    cancel: false
  });

}

//Vertical slider mouse down event handler: To create new Checkbox
function verticalSliderMouseDownEventHandler(event) {
  var leftOffset = document.getElementById('mainPage1').getBoundingClientRect().left;
  var topOffset = document.getElementById('mainPage1').getBoundingClientRect().top;

  var left = event.pageX - leftOffset + 'px';
  var top = event.pageY - topOffset + 'px';

  //Declare new paragrap
  var verticalSliderDiv = document.createElement('div');
  //verticalSlider.type = 'text';
  verticalSliderDiv.className = ' contextMenu ';
  verticalSliderDiv.style.background = 'transparent';

  var verticalSlider = document.createElement('input');
  verticalSlider.type = 'range';
  verticalSlider.id = 'verticalSlider' + nameIndex;
  verticalSlider.min = 0;
  verticalSlider.max = 100;
  verticalSlider.minValue = verticalSlider.min;
  verticalSlider.maxValue = verticalSlider.max;


  //Image css style
  verticalSliderDiv.style.position = 'absolute';
  verticalSliderDiv.style.top = top;
  verticalSliderDiv.style.left = left;



  verticalSliderDiv.append(verticalSlider);
  $('#mainPage1').append(verticalSliderDiv);

  //Create vertical slider
  $(verticalSlider).bootstrapSlider({
    min: verticalSlider.min,
    max: verticalSlider.max,
    value: 50,
    orientation: 'vertical',
    tooltip_position: 'left',
    reversed: true,
    enabled: false,
  });

  fixTooltip(); //Fix tooltip for vertical slider
  $(verticalSlider).siblings('div')[0].style.height = '300px';

  //Create elementHTML object
  var _verticalSliderObj = {
    type: 'verticalslider',
    id: verticalSlider.id,
    properties: [
      {
        name: 'tag',
        value: ''
      },
      {
        name: 'minTag',
        value: ''
      },
      {
        name: 'minValue',
        value: verticalSlider.minValue
      },
      {
        name: 'maxTag',
        value: ''
      },
      {
        name: 'maxValue',
        value: verticalSlider.maxValue
      },
      {
        name: 'isMinTag',
        value: ''
      },
      {
        name: 'isMaxTag',
        value: ''
      },
      {
        name: 'disableWhen',
        value: ''
      }
    ]
  }

  elementHTML.push(_verticalSliderObj);

  //Image mouse events
  // $(verticalSliderDiv).on('mouseover', function (event) {
  //   event.target.style.opacity = 0.4;
  //   console.log('Mouse over');
  // });
  //Subscribe mouseout event for each polygon
  // $(verticalSliderDiv).on('mouseout', function (event) {
  //   event.target.style.opacity = 1;
  // });
  //Subscribe mouse double click event
  $(verticalSliderDiv).on('dblclick', function (mouseEvent) {
    var elem = $(mouseEvent.target).closest('.slider')[0];
    $('#verticalSliderModal').one('show.bs.modal', function (showEvent) {

      var elemHeight = elem.style.height;
      if (elemHeight) elemHeight = parseInt(elemHeight, 10);

      var _input = $(elem).siblings('input')[0];

      var itemModal = $('#verticalSliderModal')[0];
      itemModal.querySelector('.inputWidth').value = elemHeight;

      if (_input.tag) {
        itemModal.querySelector('.inputValue').value = _input.tag;
      }
      else {
        itemModal.querySelector('.inputValue').value = '';
      }

      if (_input.minTag) {
        itemModal.querySelector('.inputMinTag').value = _input.minTag;
      }
      else {
        itemModal.querySelector('.inputMinTag').value = '';
      }

      if (_input.minValue) {
        itemModal.querySelector('.inputMinValue').value = _input.minValue;
      }
      else {
        itemModal.querySelector('.inputMinValue').value = '';
      }

      if (_input.maxTag) {
        itemModal.querySelector('.inputMaxTag').value = _input.maxTag;
      }
      else {
        itemModal.querySelector('.inputMaxTag').value = '';
      }

      if (_input.maxValue) {
        itemModal.querySelector('.inputMaxValue').value = _input.maxValue;
      }
      else {
        itemModal.querySelector('.inputMaxValue').value = '';
      }

      if (_input.disableWhen) {
        itemModal.querySelector('.inputDisableWhen').value = _input.disableWhen;
      }
      else {
        itemModal.querySelector('.inputDisableWhen').value = '';
      }

      //Button save 
      $('.saveChangeButton').on('click', function (event) {
        elem.style.height = itemModal.querySelector('.inputWidth').value + 'px';
        _input.tag = itemModal.querySelector('.inputValue').value;
        _input.minTag = itemModal.querySelector('.inputMinTag').value;
        _input.minValue = itemModal.querySelector('.inputMinValue').value;
        _input.maxTag = itemModal.querySelector('.inputMaxTag').value;
        _input.maxValue = itemModal.querySelector('.inputMaxValue').value;
        _input.disableWhen = itemModal.querySelector('.inputDisableWhen').value;

        if (itemModal.querySelector('.inputMinTag').value)
          _input.isMinTag = true;
        else {
          _input.isMinTag = false;
        }

        if (itemModal.querySelector('.inputMaxTag').value)
          _input.isMaxTag = true;
        else {
          _input.isMaxTag = false;
        }


        var _foundIndex = findElementHTMLById(_input.id);
        if (_foundIndex != -1) {
          elementHTML[_foundIndex].properties[0].value = _input.tag;
          elementHTML[_foundIndex].properties[1].value = _input.minTag;
          elementHTML[_foundIndex].properties[2].value = _input.minValue;
          elementHTML[_foundIndex].properties[3].value = _input.maxTag;
          elementHTML[_foundIndex].properties[4].value = _input.maxValue;
          elementHTML[_foundIndex].properties[5].value = _input.isMinTag;
          elementHTML[_foundIndex].properties[6].value = _input.isMaxTag;
          elementHTML[_foundIndex].properties[7].value = _input.disableWhen;
        }
      });

      //Browse button
      $('.btnValue').on('click', function (onConditionClickEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputValue').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

      $('.btnMinTag').on('click', function (onConditionClickEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputMinTag').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

      $('.btnMaxTag').on('click', function (onConditionClickEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputMaxTag').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

      $('.btnDisableWhen').on('click', function (onConditionClickEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputDisableWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

    });

    $('#verticalSliderModal').one('hide.bs.modal', function (hideEvent) {
      $('.saveChangeButton').off('click');
      $('.btnValue').off('click');
      $('.btnMinTag').off('click');
      $('.btnMaxTag').off('click');
      $('.btnDisableWhen').off('click');
    });

    $('#verticalSliderModal').modal();
  });


  shapes[index] = verticalSlider;
  index++;
  nameIndex++;

  //Add draggable feature
  // draggable = new PlainDraggable(slider, { leftTop: true });
  // draggable.autoScroll = true;
  // draggable.containment = document.getElementById('mainPage1');
  // draggableObjects.push(draggable);
  verticalSliderDiv.classList.add('draggable');
  $('.draggable').draggable({
    refreshPositions: true,
    containment: $('#mainPage1'),
    cancel: false
  });

}


//Process bar mouse down event handler: To create new Checkbox
function processbarMouseDownEventHandler(event) {
  var leftOffset = document.getElementById('mainPage1').getBoundingClientRect().left;
  var topOffset = document.getElementById('mainPage1').getBoundingClientRect().top;

  var left = event.pageX - leftOffset + 'px';
  var top = event.pageY - topOffset + 'px';

  //Declare new paragrap
  var progressbar = document.createElement('div');
  progressbar.className = 'progress contextMenu';
  progressbar.id = 'progressbar' + nameIndex;
  progressbar.isHideLabel = false;
  progressbar.min = 0;
  progressbar.max = 100;

  progressbar.minValue = progressbar.min;
  progressbar.maxValue = progressbar.max;

  var bar = document.createElement('div');
  bar.className = 'progress-bar';
  bar.style.width = '70%';
  //bar.style.height = '20px';
  bar.innerText = '70%';


  progressbar.appendChild(bar);

  //Image css style
  progressbar.style.position = 'absolute';
  progressbar.style.top = top;
  progressbar.style.left = left;
  progressbar.style.width = '400px';

  //Create elementHTML object
  var _progressObj = {
    type: 'progressbar',
    id: progressbar.id,
    properties: [
      {
        name: 'tag',
        value: ''
      },
      {
        name: 'minTag',
        value: ''
      },
      {
        name: 'minValue',
        value: ''
      },
      {
        name: 'maxTag',
        value: ''
      },
      {
        name: 'maxValue',
        value: ''
      },
      {
        name: 'isMinTag',
        value: ''
      },
      {
        name: 'isMaxTag',
        value: ''
      },
      {
        name: 'hiddenWhen',
        value: ''
      },
      {
        name: 'isHideLabel',
        value: ''
      },
      {
        name: 'isRawValue',
        value: ''
      }
    ]
  }

  elementHTML.push(_progressObj);


  //Image mouse events
  $(progressbar).on('mouseover', function (event) {
    event.target.style.opacity = 0.4;
    event.target.style.cursor = 'pointer';
  });
  //Subscribe mouseout event for each polygon
  $(progressbar).on('mouseout', function (event) {
    event.target.style.opacity = 1;
  });
  //Subscribe mouse double click event
  $(progressbar).on('dblclick', function (mouseEvent) {
    $('#progressBarModal').one('show.bs.modal', function (showEvent) {

      var selectedItem = mouseEvent.target;
      var elemWidth, elemHeight;
      var progressElement;
      var isHideLabel = false;
      var isRawValue = false;

      if (selectedItem.id) { //Progress is chosen
        progressElement = selectedItem;
        elemWidth = parseInt(selectedItem.style.width, 10);
        elemHeight = Math.round(selectedItem.getBoundingClientRect().bottom - selectedItem.getBoundingClientRect().top);
      }
      else { //Bar is chosen
        progressElement = selectedItem.parentNode;
        elemWidth = parseInt(selectedItem.parentNode.style.width, 10);
        elemHeight = Math.round(selectedItem.getBoundingClientRect().bottom - selectedItem.getBoundingClientRect().top);
      }
      isHideLabel = progressElement.isHideLabel;
      isRawValue = progressElement.isRawValue;

      var itemModal = $('#progressBarModal')[0];
      itemModal.querySelector('.inputWidth').value = elemWidth;
      itemModal.querySelector('.inputHeight').value = elemHeight;
      itemModal.querySelector('#hideLabelCheckbox').checked = isHideLabel;
      itemModal.querySelector('#rawValueCheckbox').checked = isRawValue;

      if (progressElement.tag) {
        itemModal.querySelector('.inputValue').value = progressElement.tag;
      }
      else {
        itemModal.querySelector('.inputValue').value = '';
      }

      if (progressElement.minTag) {
        itemModal.querySelector('.inputMinTag').value = progressElement.minTag;
      }
      else {
        itemModal.querySelector('.inputMinTag').value = '';
      }

      if (progressElement.minValue) {
        itemModal.querySelector('.inputMinValue').value = progressElement.minValue;
      }
      else {
        itemModal.querySelector('.inputMinValue').value = '';
      }

      if (progressElement.maxTag) {
        itemModal.querySelector('.inputMaxTag').value = progressElement.maxTag;
      }
      else {
        itemModal.querySelector('.inputMaxTag').value = '';
      }

      if (progressElement.maxValue) {
        itemModal.querySelector('.inputMaxValue').value = progressElement.maxValue;
      }
      else {
        itemModal.querySelector('.inputMaxValue').value = '';
      }

      if (progressElement.hiddenWhen) {
        itemModal.querySelector('.inputHiddenWhen').value = progressElement.hiddenWhen;
      }
      else {
        itemModal.querySelector('.inputHiddenWhen').value = '';
      }


      //Button save 
      $('.saveChangeButton').on('click', function (event) {
        if (selectedItem.id) { //Progress is chosen
          selectedItem.style.width = itemModal.querySelector('.inputWidth').value + 'px';
          selectedItem.style.height = itemModal.querySelector('.inputHeight').value + 'px';
        }
        else {  //Bar is chosen
          selectedItem.parentNode.style.width = itemModal.querySelector('.inputWidth').value + 'px';
          selectedItem.parentNode.style.height = itemModal.querySelector('.inputHeight').value + 'px';
        }

        progressElement.tag = itemModal.querySelector('.inputValue').value;
        progressElement.minTag = itemModal.querySelector('.inputMinTag').value;
        progressElement.minValue = itemModal.querySelector('.inputMinValue').value;
        progressElement.maxTag = itemModal.querySelector('.inputMaxTag').value;
        progressElement.maxValue = itemModal.querySelector('.inputMaxValue').value;
        progressElement.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;
        progressElement.isHideLabel = itemModal.querySelector('#hideLabelCheckbox').checked;
        progressElement.isRawValue = itemModal.querySelector('#rawValueCheckbox').checked;


        if (itemModal.querySelector('.inputMinTag').value)
          progressElement.isMinTag = true;
        else progressElement.isMinTag = false;

        if (itemModal.querySelector('.inputMaxTag').value)
          progressElement.isMaxTag = true;
        else progressElement.isMaxTag = false;

        var _bar = $(progressElement).find('.progress-bar')[0];
        if (progressElement.isHideLabel) _bar.innerText = '';
        else _bar.innerText = _bar.style.width;

        var _foundIndex = findElementHTMLById(progressElement.id);
        if (_foundIndex != -1) {
          elementHTML[_foundIndex].properties[0].value = progressElement.tag;
          elementHTML[_foundIndex].properties[1].value = progressElement.minTag;
          elementHTML[_foundIndex].properties[2].value = progressElement.minValue;
          elementHTML[_foundIndex].properties[3].value = progressElement.maxTag;
          elementHTML[_foundIndex].properties[4].value = progressElement.maxValue;
          elementHTML[_foundIndex].properties[5].value = progressElement.isMinTag;
          elementHTML[_foundIndex].properties[6].value = progressElement.isMaxTag;
          elementHTML[_foundIndex].properties[7].value = progressElement.hiddenWhen;
          elementHTML[_foundIndex].properties[8].value = progressElement.isHideLabel;
        }
      });

      //Button Value browse tag
      $('.btnValueTag').on('click', function (valueEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputValue').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

      $('.btnMinTag').on('click', function (valueEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputMinTag').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

      $('.btnMaxTag').on('click', function (valueEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputMaxTag').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

      $('.btnHiddenWhen').on('click', function (valueEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

    });

    $('#progressBarModal').one('hide.bs.modal', function (hideEvent) {
      $('.saveChangeButton').off('click');
      $('.btnValueTag').off('click');
      $('.btnMinTag').off('click');
      $('.btnMaxTag').off('click');
      $('.btnHiddenWhen').off('click');
    });

    $('#progressBarModal').modal();
  });

  $('#mainPage1').append(progressbar);
  shapes[index] = progressbar;
  index++;
  nameIndex++;

  //Add draggable feature
  // draggable = new PlainDraggable(progressbar, { leftTop: true });
  // draggable.autoScroll = true;
  // draggable.containment = document.getElementById('mainPage1');
  // draggableObjects.push(draggable);

  progressbar.classList.add('draggable');
  $('.draggable').draggable({
    refreshPositions: true,
    containment: $('#mainPage1'),
  });


}

//Vertical process bar mouse down event handler: To create new Checkbox
function verticalProcessbarMouseDownEventHandler(event) {
  var leftOffset = document.getElementById('mainPage1').getBoundingClientRect().left;
  var topOffset = document.getElementById('mainPage1').getBoundingClientRect().top;

  var left = event.pageX - leftOffset + 'px';
  var top = event.pageY - topOffset + 'px';

  //Declare new paragrap
  var verticalProgressbar = document.createElement('div');
  verticalProgressbar.className = 'progress contextMenu vertical-progress ';
  verticalProgressbar.id = 'verticalProgressbar' + nameIndex;
  verticalProgressbar.isHideLabel = false;
  verticalProgressbar.min = 0;
  verticalProgressbar.max = 100;
  //verticalProgressbar.isRawValue = false;

  verticalProgressbar.minValue = verticalProgressbar.min;
  verticalProgressbar.maxValue = verticalProgressbar.max;

  var bar = document.createElement('div');
  bar.className = 'progress-bar';
  bar.style.position = 'absolute';
  bar.style.top = '30%';
  bar.style.width = '100%';
  bar.style.height = '70%';
  bar.innerText = '70%';


  verticalProgressbar.appendChild(bar);

  //Image css style
  verticalProgressbar.style.position = 'absolute';
  verticalProgressbar.style.top = top;
  verticalProgressbar.style.left = left;
  verticalProgressbar.style.width = '30px';
  verticalProgressbar.style.height = '300px';
  verticalProgressbar.style.opacity = 0.8;
  verticalProgressbar.style.filter = 'alpha(opacity=80)';
  //Create elementHTML object
  var _verticalProgressObj = {
    type: 'verticalprogressbar',
    id: verticalProgressbar.id,
    properties: [
      {
        name: 'tag',
        value: ''
      },
      {
        name: 'minTag',
        value: ''
      },
      {
        name: 'minValue',
        value: ''
      },
      {
        name: 'maxTag',
        value: ''
      },
      {
        name: 'maxValue',
        value: ''
      },
      {
        name: 'isMinTag',
        value: ''
      },
      {
        name: 'isMaxTag',
        value: ''
      },
      {
        name: 'hiddenWhen',
        value: ''
      },
      {
        name: 'isHideLabel',
        value: ''
      },
      {
        name: 'isRawValue',
        value: ''
      }
    ]
  }

  elementHTML.push(_verticalProgressObj);


  //Image mouse events
  $(verticalProgressbar).on('mouseover', function (event) {
    event.target.style.opacity = 0.4;
    event.target.style.cursor = 'pointer';
  });
  //Subscribe mouseout event for each polygon
  $(verticalProgressbar).on('mouseout', function (event) {
    event.target.style.opacity = 1;
  });
  //Subscribe mouse double click event
  $(verticalProgressbar).on('dblclick', function (mouseEvent) {
    $('#verticalProgressBarModal').one('show.bs.modal', function (showEvent) {

      var selectedItem = mouseEvent.target;
      var elemWidth, elemHeight;
      var progressElement;
      var isHideLabel = false;
      var isRawValue = false;

      if (selectedItem.id) { //Progress is chosen
        progressElement = selectedItem;
        elemWidth = parseInt(selectedItem.style.width, 10);
        elemHeight = Math.round(selectedItem.getBoundingClientRect().bottom - selectedItem.getBoundingClientRect().top);
      }
      else { //Bar is chosen
        progressElement = selectedItem.parentNode;
        elemWidth = parseInt(selectedItem.parentNode.style.width, 10);
        elemHeight = Math.round(selectedItem.parentNode.getBoundingClientRect().bottom - selectedItem.parentNode.getBoundingClientRect().top);
      }
      isHideLabel = progressElement.isHideLabel;
      isRawValue = progressElement.isRawValue;

      var itemModal = $('#verticalProgressBarModal')[0];
      itemModal.querySelector('.inputWidth').value = elemWidth;
      itemModal.querySelector('.inputHeight').value = elemHeight;
      itemModal.querySelector('#hideVerticalLabelCheckbox').checked = isHideLabel;
      itemModal.querySelector('#rawVerticalValueCheckbox').checked = isRawValue;

      if (progressElement.tag) {
        itemModal.querySelector('.inputValue').value = progressElement.tag;
      }
      else {
        itemModal.querySelector('.inputValue').value = '';
      }

      if (progressElement.minTag) {
        itemModal.querySelector('.inputMinTag').value = progressElement.minTag;
      }
      else {
        itemModal.querySelector('.inputMinTag').value = '';
      }

      if (progressElement.minValue) {
        itemModal.querySelector('.inputMinValue').value = progressElement.minValue;
      }
      else {
        itemModal.querySelector('.inputMinValue').value = '';
      }

      if (progressElement.maxTag) {
        itemModal.querySelector('.inputMaxTag').value = progressElement.maxTag;
      }
      else {
        itemModal.querySelector('.inputMaxTag').value = '';
      }

      if (progressElement.maxValue) {
        itemModal.querySelector('.inputMaxValue').value = progressElement.maxValue;
      }
      else {
        itemModal.querySelector('.inputMaxValue').value = '';
      }

      if (progressElement.hiddenWhen) {
        itemModal.querySelector('.inputHiddenWhen').value = progressElement.hiddenWhen;
      }
      else {
        itemModal.querySelector('.inputHiddenWhen').value = '';
      }


      //Button save 
      $('.saveChangeButton').on('click', function (event) {
        if (selectedItem.id) { //Progress is chosen
          selectedItem.style.width = itemModal.querySelector('.inputWidth').value + 'px';
          selectedItem.style.height = itemModal.querySelector('.inputHeight').value + 'px';
        }
        else {  //Bar is chosen
          selectedItem.parentNode.style.width = itemModal.querySelector('.inputWidth').value + 'px';
          selectedItem.parentNode.style.height = itemModal.querySelector('.inputHeight').value + 'px';
        }

        progressElement.tag = itemModal.querySelector('.inputValue').value;
        progressElement.minTag = itemModal.querySelector('.inputMinTag').value;
        progressElement.minValue = itemModal.querySelector('.inputMinValue').value;
        progressElement.maxTag = itemModal.querySelector('.inputMaxTag').value;
        progressElement.maxValue = itemModal.querySelector('.inputMaxValue').value;
        progressElement.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;
        progressElement.isHideLabel = itemModal.querySelector('#hideVerticalLabelCheckbox').checked;
        progressElement.isRawValue = itemModal.querySelector('#rawVerticalValueCheckbox').checked;


        if (itemModal.querySelector('.inputMinTag').value)
          progressElement.isMinTag = true;
        else progressElement.isMinTag = false;

        if (itemModal.querySelector('.inputMaxTag').value)
          progressElement.isMaxTag = true;
        else progressElement.isMaxTag = false;

        var _bar = $(progressElement).find('.progress-bar')[0];
        if (progressElement.isHideLabel) _bar.innerText = '';
        else _bar.innerText = _bar.style.width;

        var _foundIndex = findElementHTMLById(progressElement.id);
        if (_foundIndex != -1) {
          elementHTML[_foundIndex].properties[0].value = progressElement.tag;
          elementHTML[_foundIndex].properties[1].value = progressElement.minTag;
          elementHTML[_foundIndex].properties[2].value = progressElement.minValue;
          elementHTML[_foundIndex].properties[3].value = progressElement.maxTag;
          elementHTML[_foundIndex].properties[4].value = progressElement.maxValue;
          elementHTML[_foundIndex].properties[5].value = progressElement.isMinTag;
          elementHTML[_foundIndex].properties[6].value = progressElement.isMaxTag;
          elementHTML[_foundIndex].properties[7].value = progressElement.hiddenWhen;
          elementHTML[_foundIndex].properties[8].value = progressElement.isHideLabel;
          elementHTML[_foundIndex].properties[9].value = progressElement.isRawValue;
        }
      });

      //Button Value browse tag
      $('.btnValueTag').on('click', function (valueEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputValue').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

      $('.btnMinTag').on('click', function (valueEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputMinTag').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

      $('.btnMaxTag').on('click', function (valueEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputMaxTag').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

      $('.btnHiddenWhen').on('click', function (valueEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

    });

    $('#verticalProgressBarModal').one('hide.bs.modal', function (hideEvent) {
      $('.saveChangeButton').off('click');
      $('.btnValueTag').off('click');
      $('.btnMinTag').off('click');
      $('.btnMaxTag').off('click');
      $('.btnHiddenWhen').off('click');
    });

    $('#verticalProgressBarModal').modal();
  });

  $('#mainPage1').append(verticalProgressbar);
  shapes[index] = verticalProgressbar;
  index++;
  nameIndex++;

  //Add draggable feature
  // draggable = new PlainDraggable(progressbar, { leftTop: true });
  // draggable.autoScroll = true;
  // draggable.containment = document.getElementById('mainPage1');
  // draggableObjects.push(draggable);

  verticalProgressbar.classList.add('draggable');
  $('.draggable').draggable({
    refreshPositions: true,
    containment: $('#mainPage1'),
  });


}

//Symbol Set mouse down event handler: To create new image
function symbolsetMouseDownEventHandler(event) {
  var leftOffset = document.getElementById('mainPage1').getBoundingClientRect().left;
  var topOffset = document.getElementById('mainPage1').getBoundingClientRect().top;

  var left = event.pageX - leftOffset + 'px';
  var top = event.pageY - topOffset + 'px';

  //Declare new image
  var defaultSymbolSet = '../../images/symbol-set/light-off.png';
  var symbolSet = document.createElement('img');
  symbolSet.id = 'symbolSet' + nameIndex;
  symbolSet.className += ' contextMenu ';
  symbolSet.offSymbol = '';
  symbolSet.onSymbol = '';



  //Image css style
  symbolSet.src = defaultSymbolSet;
  symbolSet.style.height = '50px';
  symbolSet.style.width = '50px';
  symbolSet.style.position = 'absolute';
  symbolSet.style.top = top;
  symbolSet.style.left = left;

  //Create elementHTML object
  var _sybObj = {
    type: 'symbolSet',
    id: symbolSet.id,
    properties: [
      {
        name: 'onCondition',
        value: ''
      },
      {
        name: 'onSymbol',
        value: ''
      },
      {
        name: 'offSymbol',
        value: ''
      },
      {
        name: 'hiddenWhen',
        value: ''
      }
    ]
  }

  elementHTML.push(_sybObj);

  //Image mouse events
  $(symbolSet).on('mouseover', function (event) {
    event.target.style.cursor = 'pointer';
    event.target.style.opacity = 0.4;
    //event.target.style.cursor = 'move';
  });
  //Subscribe mouseout event for each polygon
  $(symbolSet).on('mouseout', function (event) {
    event.target.style.opacity = 1;
  });
  //Subscribe double click event
  $(symbolSet).on('dblclick', function (mouseEvent) {
    $('#symbolSetModal').one('show.bs.modal', function (showEvent) {

      var elem = document.getElementById(mouseEvent.target.id);
      var elemStyle = elem.style;

      var elemWidth = parseInt(elemStyle.width, 10),
        elemHeight = parseInt(elemStyle.height, 10),
        elemPositionX = parseInt(elemStyle.left, 10),
        elemPositionY = parseInt(elemStyle.top, 10),
        elemOnSymbol = elem.onSymbol,
        elemOffSymbol = elem.offSymbol;

      var itemModal = $('#symbolSetModal')[0];
      itemModal.querySelector('.inputWidth').value = elemWidth;
      itemModal.querySelector('.inputHeight').value = elemHeight;
      itemModal.querySelector('.inputPositionX').value = elemPositionX;
      itemModal.querySelector('.inputPositionY').value = elemPositionY;
      itemModal.querySelector('.inputOnImageSource').value = elemOnSymbol;
      itemModal.querySelector('.inputOffImageSource').value = elemOffSymbol;

      if (mouseEvent.target.onCondition) {
        itemModal.querySelector('.inputOnCondition').value = mouseEvent.target.onCondition;
      }
      else {
        itemModal.querySelector('.inputOnCondition').value = '';
      }

      if (mouseEvent.target.hiddenWhen) {
        itemModal.querySelector('.inputHiddenWhen').value = mouseEvent.target.hiddenWhen;
      }
      else {
        itemModal.querySelector('.inputHiddenWhen').value = '';
      }

      //Button save 
      $('.saveChangeButton').on('click', function (event) {
        elemStyle.width = itemModal.querySelector('.inputWidth').value + 'px';
        elemStyle.height = itemModal.querySelector('.inputHeight').value + 'px';
        elemStyle.left = itemModal.querySelector('.inputPositionX').value + 'px';
        elemStyle.top = itemModal.querySelector('.inputPositionY').value + 'px';
        mouseEvent.target.onCondition = itemModal.querySelector('.inputOnCondition').value;
        mouseEvent.target.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;
        mouseEvent.target.onSymbol = itemModal.querySelector('.inputOnImageSource').value;
        mouseEvent.target.offSymbol = itemModal.querySelector('.inputOffImageSource').value;
        mouseEvent.target.src = mouseEvent.target.offSymbol;

        var _foundIndex = findElementHTMLById(mouseEvent.target.id);
        if (_foundIndex != -1) {
          elementHTML[_foundIndex].properties[0].value = mouseEvent.target.onCondition;
          elementHTML[_foundIndex].properties[1].value = mouseEvent.target.onSymbol;
          elementHTML[_foundIndex].properties[2].value = mouseEvent.target.offSymbol;
          elementHTML[_foundIndex].properties[3].value = mouseEvent.target.hiddenWhen;
        }
      });

      //Browse Tag button
      $('#btnOnCondition').on('click', function (onConditionClickEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputOnCondition').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

      //Browse Tag button
      $('.btnHiddenWhen').on('click', function (onHiddenWhenClickEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

    });

    $('#symbolSetModal').one('hide.bs.modal', function (hideEvent) {
      $('.saveChangeButton').off('click');
      $('#btnOnCondition').off('click');
      $('.btnHiddenWhen').off('click');
      $('.btnSelect').off('click');
    });

    $('#chooseImageModal').on('show.bs.modal', function (event) {
      var _target = event.relatedTarget.id;
      $('.btnSelect').one('click', function (btnEvent) {
        if ($("[name=symbol]").is(":checked")) {
          if (_target == 'btnOnSymbol')
            $('.inputOnImageSource').val($('[name=symbol]:checked').val());
          else
            $('.inputOffImageSource').val($('[name=symbol]:checked').val());
        }
        $('#chooseImageModal').modal('hide');
      });
    });

    $('#symbolSetModal').modal();
  });

  $('#mainPage1').append(symbolSet);
  shapes[index] = symbolSet;
  index++;
  nameIndex++;

  //Add draggable feature
  // draggable = new PlainDraggable(symbolSet, { leftTop: true });
  // draggable.autoScroll = true;
  // draggable.containment = document.getElementById('mainPage1');
  // draggableObjects.push(draggable);
  symbolSet.classList.add('draggable');
  $('.draggable').draggable({
    refreshPositions: true,
    containment: $('#mainPage1'),
  });

}

//Chart mouse down event handler: To create new chart
function chartMouseDownEventHandler(event) {
  var leftOffset = document.getElementById('mainPage1').getBoundingClientRect().left;
  var topOffset = document.getElementById('mainPage1').getBoundingClientRect().top;

  var left = event.pageX - leftOffset + 'px';
  var top = event.pageY - topOffset + 'px';

  //Add a new div
  var canvas = document.createElement('canvas');
  canvas.className = 'chart contextMenu';
  canvas.id = 'chart' + nameIndex;
  canvas.xLabel = 'Time';
  canvas.yLabel = 'Value';
  canvas.timeRange = 60000;

  var chartDiv = document.createElement('div');
  chartDiv.id = 'chartDiv' + nameIndex;
  chartDiv.appendChild(canvas);

  //Chart css style
  chartDiv.style.position = 'absolute';
  chartDiv.style.top = top;
  chartDiv.style.left = left;

  canvas.style.height = '200px';
  canvas.style.width = '500px';

  //canvas.style.background = 'green';

  //Create elementHTML object
  var _chartObj = {
    type: 'chart',
    id: canvas.id,
    properties: [
      {
        name: 'tag',
        value: ''
      },
      {
        name: 'hiddenWhen',
        value: ''
      },
      {
        name: 'xLabel',
        value: ''
      },
      {
        name: 'yLabel',
        value: ''
      },
    ]
  }

  elementHTML.push(_chartObj);

  //Create chart
  var ctx1 = canvas.getContext('2d');
  var newChart = new Chart(ctx1, {
    // The type of chart we want to create
    type: 'line',
    // The data for our dataset
    data: {
      labels: [],
      datasets: [{
        steppedLine: false,
        backgroundColor: 'rgba(57,172,180 , 0.8)',
        hoverBackgroundColor: 'rgba(57,172,180 , 0.3)',
        data: [],
        label: 'Value',
        // backgroundColor: 'rgb(255, 255, 255, 0.2)',
        borderColor: 'rgb(0,102,10)',
        borderWidth: 2,
        pointRadius: 0,
      }]
    },

    // Configuration options go here
    options: {
      legend: false,
      responsive: true,
      maintainAspectRatio: false,
      title: {
        display: false,
        // text: option.title,
        // fontColor: 'white',
        // fontSize: 20
      },
      tooltips: {
        mode: 'index',
        intersect: false,
        titleFontSize: 16,
        bodyFontSize: 16
      },
      hover: {
        mode: 'nearest',
        intersect: true
      },
      scales: {
        xAxes: [{
          display: true,
          // type : 'realtime',
          scaleLabel: {
            display: true,
            labelString: canvas.xLabel,
          },
        }],
        yAxes: [{
          ticks: {
            beginAtZero: true
          },
          display: true,
          gridLines: {
            color: '#282525'
          },
          scaleLabel: {
            display: true,
            labelString: canvas.yLabel,
          }
        }]
      },

    }
  });
  arrChartJS.push({ id: canvas.id, node: newChart });



  //Image mouse events
  $(canvas).on('mouseover', function (event) {
    //event.target.style.opacity = 0.4;
    event.target.style.cursor = 'pointer';
  });
  //Subscribe mouseout event for each polygon
  // $(canvas).on('mouseout', function (event) {
  //   event.target.style.opacity = 1;
  // });
  //Subscribe mouse double click event
  $(canvas).on('dblclick', function (mouseEvent) {
    $('#chartModal').one('show.bs.modal', function (showEvent) {

      var selectedItem = mouseEvent.target; //Canvas selected
      var elemWidth, elemHeight;

      elemWidth = parseInt(selectedItem.style.width, 10);
      elemHeight = parseInt(selectedItem.style.height, 10);

      var itemModal = $('#chartModal')[0];
      itemModal.querySelector('.inputWidth').value = elemWidth;
      itemModal.querySelector('.inputHeight').value = elemHeight;

      if (selectedItem.tag) {
        itemModal.querySelector('.inputValue').value = selectedItem.tag;
      }
      else {
        itemModal.querySelector('.inputValue').value = '';
      }

      if (selectedItem.xLabel) {
        itemModal.querySelector('.inputXLabel').value = selectedItem.xLabel;
      }
      else {
        itemModal.querySelector('.inputXLabel').value = '';
      }

      if (selectedItem.yLabel) {
        itemModal.querySelector('.inputYLabel').value = selectedItem.yLabel;
      }
      else {
        itemModal.querySelector('.inputYLabel').value = '';
      }

      // if (selectedItem.timeRange) {
      //   itemModal.querySelector('.inputTimeRange').value = selectedItem.timeRange;
      // }
      // else {
      //   itemModal.querySelector('.inputTimeRange').value = '';
      // }

      if (selectedItem.hiddenWhen) {
        itemModal.querySelector('.inputHiddenWhen').value = selectedItem.hiddenWhen;
      }
      else {
        itemModal.querySelector('.inputHiddenWhen').value = '';
      }


      //Button save 
      $('.saveChangeButton').on('click', function (event) {

        selectedItem.style.width = itemModal.querySelector('.inputWidth').value + 'px';
        selectedItem.style.height = itemModal.querySelector('.inputHeight').value + 'px';
        selectedItem.tag = itemModal.querySelector('.inputValue').value;
        selectedItem.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;
        selectedItem.xLabel = itemModal.querySelector('.inputXLabel').value;
        selectedItem.yLabel = itemModal.querySelector('.inputYLabel').value;
        //selectedItem.timeRange = itemModal.querySelector('.inputTimeRange').value;

        var _foundIndex = findElementHTMLById(selectedItem.id);
        if (_foundIndex != -1) {
          elementHTML[_foundIndex].properties[0].value = selectedItem.tag;
          elementHTML[_foundIndex].properties[1].value = selectedItem.hiddenWhen;
          elementHTML[_foundIndex].properties[2].value = selectedItem.xLabel;
          elementHTML[_foundIndex].properties[3].value = selectedItem.yLabel;
          // elementHTML[_foundIndex].properties[4].value = selectedItem.timeRange;
        }

        var foundChartIndex = findChartById(selectedItem.id);
        if (foundChartIndex != -1) {
          arrChartJS[foundChartIndex].node.options.scales.xAxes[0].scaleLabel.labelString = selectedItem.xLabel;
          arrChartJS[foundChartIndex].node.options.scales.yAxes[0].scaleLabel.labelString = selectedItem.yLabel;
          arrChartJS[foundChartIndex].node.update();
        }
      });

      //Button Value browse tag
      $('.btnValueTag').on('click', function (valueEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputValue').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

      $('.btnHiddenWhen').on('click', function (valueEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

    });

    $('#chartModal').one('hide.bs.modal', function (hideEvent) {
      $('.saveChangeButton').off('click');
      $('.btnValueTag').off('click');
      $('.btnHiddenWhen').off('click');
    });

    $('#chartModal').modal();
  });

  $('#mainPage1').append(chartDiv);
  shapes[index] = chartDiv;
  index++;
  nameIndex++;

  //Add draggable feature
  // draggable = new PlainDraggable(progressbar, { leftTop: true });
  // draggable.autoScroll = true;
  // draggable.containment = document.getElementById('mainPage1');
  // draggableObjects.push(draggable);

  chartDiv.classList.add('draggable');
  $('.draggable').draggable({
    refreshPositions: true,
    containment: $('#mainPage1'),
  });


}

//Gauge mouse down event handler: To create new chart
function gaugeMouseDownEventHandler(event) {
  var leftOffset = document.getElementById('mainPage1').getBoundingClientRect().left;
  var topOffset = document.getElementById('mainPage1').getBoundingClientRect().top;

  var left = event.pageX - leftOffset + 'px';
  var top = event.pageY - topOffset + 'px';

  //Add a new div
  var gaugeDiv = document.createElement('div');
  gaugeDiv.id = 'gauge' + nameIndex;
  gaugeDiv.className = 'gauge contextMenu';

  //Chart css style
  gaugeDiv.style.position = 'absolute';
  gaugeDiv.style.top = top;
  gaugeDiv.style.left = left;
  gaugeDiv.style.height = '400px';
  gaugeDiv.style.width = '400px';
  //gaugeDiv.style.background = 'green';

  //Init gauge properties
  gaugeDiv.type = false;
  gaugeDiv.format = 2;
  gaugeDiv.usePointer = true;
  gaugeDiv.gaugeWidth = 0.2;
  gaugeDiv.gaugeColor = 'rgba(255,255,255,0.5)';
  gaugeDiv.levelColor = ['#00660a'];
  gaugeDiv.pointerColor = '#00800d';
  gaugeDiv.fontColor = '#000000';
  gaugeDiv.label = 'value';
  gaugeDiv.min = 0;
  gaugeDiv.max = 100;
  gaugeDiv.title = "Gauge";

  //Create elementHTML object
  var _gaugeObj = {
    type: 'gauge',
    id: gaugeDiv.id,
    properties: [
      {
        name: 'tag',
        value: ''
      },
      {
        name: 'hiddenWhen',
        value: ''
      },
      {
        name: 'type',
        value: ''
      },
      {
        name: 'gaugeColor',
        value: ''
      },
      {
        name: 'levelColor',
        value: ''
      },
      {
        name: 'fontColor',
        value: ''
      },
      {
        name: 'gaugeWidth',
        value: ''
      },
      {
        name: 'usePointer',
        value: ''
      },
      {
        name: 'pointerColor',
        value: ''
      },
      {
        name: 'format',
        value: ''
      },
      {
        name: 'label',
        value: ''
      },
      {
        name: 'min',
        value: ''
      },
      {
        name: 'max',
        value: ''
      },
      {
        name: 'title',
        value: ''
      },
    ]
  }

  elementHTML.push(_gaugeObj);

  $('#mainPage1').append(gaugeDiv);

  var gauge = new JustGage({
    id: gaugeDiv.id,
    value: 50,
    decimals: gaugeDiv.format,
    title: gaugeDiv.title,
    min: gaugeDiv.min,
    max: gaugeDiv.max,
    label: gaugeDiv.label,
    labelFontColor: gaugeDiv.fontColor,
    donut: gaugeDiv.type,
    relativeGaugeSize: true,
    valueFontColor: gaugeDiv.fontColor,
    valueFontSize: '10px',
    gaugeColor: gaugeDiv.gaugeColor,
    levelColors: gaugeDiv.levelColor,
    pointer: gaugeDiv.usePointer,
    pointerOptions: {
      toplength: 8,
      bottomlength: -20,
      bottomwidth: 6,
      color: gaugeDiv.pointerColor
    },
    gaugeWidthScale: gaugeDiv.gaugeWidth,
    counter: true,
  });
  arrGauge.push({ id: gaugeDiv.id, node: gauge });

  //Image mouse events
  $(gaugeDiv).on('mouseover', function (event) {
    //event.target.style.opacity = 0.4;
    event.target.style.cursor = 'pointer';
  });
  //Subscribe mouseout event for each polygon
  // $(canvas).on('mouseout', function (event) {
  //   event.target.style.opacity = 1;
  // });
  //Subscribe mouse double click event
  $(gaugeDiv).on('dblclick', function (mouseEvent) {
    $('#gaugeModal').one('show.bs.modal', function (showEvent) {

      var selectedItem = mouseEvent.target; //Canvas selected
      switch (selectedItem.tagName) {
        case 'svg': {
          selectedItem = selectedItem.parentNode;
          break;
        }
        case 'path': {
          selectedItem = selectedItem.parentNode.parentNode;
          break;
        }
        case 'tspan': {
          selectedItem = selectedItem.parentNode.parentNode.parentNode;
          break;
        }
      }

      var elemWidth, elemHeight;

      elemWidth = parseInt(selectedItem.style.width, 10);
      elemHeight = parseInt(selectedItem.style.height, 10);

      var itemModal = $('#gaugeModal')[0];
      itemModal.querySelector('.inputWidth').value = elemWidth;
      itemModal.querySelector('.inputHeight').value = elemHeight;

      if (selectedItem.type) {
        itemModal.querySelector('[name = gaugeType]').value = "true";
      } else {
        itemModal.querySelector('[name = gaugeType]').value = "false";
      }

      if (selectedItem.format) {
        itemModal.querySelector('[name = gaugeFormat]').value = selectedItem.format;
      }

      if (selectedItem.gaugeWidth) {
        itemModal.querySelector('.inputGaugeWidth').value = selectedItem.gaugeWidth;
      }

      if (selectedItem.usePointer) {
        itemModal.querySelector('#gaugeUsePointerCheckbox').checked = true;
      } else {
        itemModal.querySelector('#gaugeUsePointerCheckbox').checked = false;
      }

      if (selectedItem.gaugeColor) {
        itemModal.querySelector('.inputGaugeColor').value = selectedItem.gaugeColor;
      }

      if (selectedItem.levelColor) {
        itemModal.querySelector('.inputLevelColor').value = selectedItem.levelColor[0];
      }

      if (selectedItem.fontColor) {
        itemModal.querySelector('.inputFontColor').value = selectedItem.fontColor;
      }

      if (selectedItem.pointerColor) {
        itemModal.querySelector('.inputPointerColor').value = selectedItem.pointerColor;
      }

      if (selectedItem.tag) {
        itemModal.querySelector('.inputValue').value = selectedItem.tag;
      } else {
        itemModal.querySelector('.inputValue').value = '';
      }

      if (selectedItem.label) {
        itemModal.querySelector('.inputGaugeLabel').value = selectedItem.label;
      } else {
        itemModal.querySelector('.inputGaugeLabel').value = '';
      }

      if (selectedItem.min != null) {
        itemModal.querySelector('.inputMin').value = selectedItem.min;
      }

      if (selectedItem.max != null) {
        itemModal.querySelector('.inputMax').value = selectedItem.max;
      }

      if (selectedItem.hiddenWhen) {
        itemModal.querySelector('.inputHiddenWhen').value = selectedItem.hiddenWhen;
      } else {
        itemModal.querySelector('.inputHiddenWhen').value = '';
      }

      if (selectedItem.title) {
        itemModal.querySelector('.inputGaugeTitle').value = selectedItem.title;
      } else {
        itemModal.querySelector('.inputGaugeTitle').value = '';
      }

      //Button save 
      $('.saveChangeButton').on('click', function (event) {

        selectedItem.style.width = itemModal.querySelector('.inputWidth').value + 'px';
        selectedItem.style.height = itemModal.querySelector('.inputHeight').value + 'px';
        selectedItem.type = (itemModal.querySelector('[name = gaugeType]').value == 'true');
        selectedItem.format = Number(itemModal.querySelector('[name=gaugeFormat]').value);
        selectedItem.gaugeWidth = itemModal.querySelector('.inputGaugeWidth').value;
        selectedItem.usePointer = itemModal.querySelector('#gaugeUsePointerCheckbox').checked;
        selectedItem.gaugeColor = itemModal.querySelector('.inputGaugeColor').value;
        selectedItem.levelColor = [itemModal.querySelector('.inputLevelColor').value];
        selectedItem.fontColor = itemModal.querySelector('.inputFontColor').value;
        selectedItem.pointerColor = itemModal.querySelector('.inputPointerColor').value;
        selectedItem.tag = itemModal.querySelector('.inputValue').value;
        selectedItem.label = itemModal.querySelector('.inputGaugeLabel').value;
        selectedItem.min = Number(itemModal.querySelector('.inputMin').value);
        selectedItem.max = Number(itemModal.querySelector('.inputMax').value);
        selectedItem.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;
        selectedItem.title = itemModal.querySelector('.inputGaugeTitle').value;

        var _foundIndex = findElementHTMLById(selectedItem.id);
        if (_foundIndex != -1) {
          elementHTML[_foundIndex].properties[0].value = selectedItem.tag;
          elementHTML[_foundIndex].properties[1].value = selectedItem.hiddenWhen;
          elementHTML[_foundIndex].properties[2].value = selectedItem.type;
          elementHTML[_foundIndex].properties[3].value = selectedItem.gaugeColor;
          elementHTML[_foundIndex].properties[4].value = [selectedItem.levelColor];
          elementHTML[_foundIndex].properties[5].value = selectedItem.fontColor;
          elementHTML[_foundIndex].properties[6].value = selectedItem.gaugeWidth;
          elementHTML[_foundIndex].properties[7].value = selectedItem.usePointer;
          elementHTML[_foundIndex].properties[8].value = selectedItem.pointerColor;
          elementHTML[_foundIndex].properties[9].value = selectedItem.format;
          elementHTML[_foundIndex].properties[10].value = selectedItem.label;
          elementHTML[_foundIndex].properties[11].value = selectedItem.min;
          elementHTML[_foundIndex].properties[12].value = selectedItem.max;
          elementHTML[_foundIndex].properties[13].value = selectedItem.title;
        }

        var foundGaugeIndex = findGaugeById(selectedItem.id);
        if (foundGaugeIndex != -1) {
          var gaugeItem = arrGauge[foundGaugeIndex].node;
          var gaugeConfig = JSON.parse(JSON.stringify(gaugeItem.config));
          var gaugeId = arrGauge[foundGaugeIndex].id;

          //Update config 
          gaugeConfig.donut = selectedItem.type;
          gaugeConfig.gaugeColor = selectedItem.gaugeColor;
          gaugeConfig.levelColors = [selectedItem.levelColor];
          gaugeConfig.labelFontColor = selectedItem.fontColor;
          gaugeConfig.valueFontColor = selectedItem.fontColor;
          gaugeConfig.gaugeWidthScale = selectedItem.gaugeWidth;
          gaugeConfig.pointer = selectedItem.usePointer;
          gaugeConfig.pointerOptions.color = selectedItem.pointerColor;
          gaugeConfig.decimals = selectedItem.format;
          gaugeConfig.label = selectedItem.label;
          gaugeConfig.title = selectedItem.title;

          //Remove current svg object
          $('#' + gaugeId).find('svg').remove();

          //Create new gauge
          var newGauge = new JustGage(gaugeConfig);

          //Update arrGauge
          arrGauge[foundGaugeIndex].node = newGauge;

        }
      });

      //Button Value browse tag
      $('.btnValueTag').on('click', function (valueEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputValue').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

      $('.btnHiddenWhen').on('click', function (valueEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

    });

    $('#gaugeModal').one('hide.bs.modal', function (hideEvent) {
      $('.saveChangeButton').off('click');
      $('.btnValueTag').off('click');
      $('.btnHiddenWhen').off('click');
    });

    $('#gaugeModal').modal();
  });


  shapes[index] = gaugeDiv;
  index++;
  nameIndex++;

  //Add draggable feature
  // draggable = new PlainDraggable(progressbar, { leftTop: true });
  // draggable.autoScroll = true;
  // draggable.containment = document.getElementById('mainPage1');
  // draggableObjects.push(draggable);

  gaugeDiv.classList.add('draggable');
  $('.draggable').draggable({
    refreshPositions: true,
    containment: $('#mainPage1'),
  });


}

//Chart dashboard mouse down event handler: To create new chart dashboard
function chartDashboardMouseDownEventHandler(event) {
  var leftOffset = document.getElementById('dashboard').getBoundingClientRect().left;
  var topOffset = document.getElementById('dashboard').getBoundingClientRect().top;

  var left = event.pageX - leftOffset + 'px';
  var top = event.pageY - topOffset + 'px';

  //Add a new div
  var canvas = document.createElement('canvas');
  canvas.className = 'chart contextMenu';
  canvas.id = 'chart' + nameIndex;
  canvas.xLabel = 'Time';
  canvas.yLabel = 'Value';
  canvas.timeRange = 60000;

  var chartDiv = document.createElement('div');
  chartDiv.id = 'chartDiv' + nameIndex;
  chartDiv.appendChild(canvas);

  //Chart css style
  chartDiv.style.position = 'absolute';
  chartDiv.style.top = top;
  chartDiv.style.left = left;

  canvas.style.height = '200px';
  canvas.style.width = '500px';

  //canvas.style.background = 'green';

  //Create elementHTML object
  var _chartObj = {
    type: 'chart',
    id: canvas.id,
    properties: [
      {
        name: 'tag',
        value: ''
      },
      {
        name: 'hiddenWhen',
        value: ''
      },
      {
        name: 'xLabel',
        value: ''
      },
      {
        name: 'yLabel',
        value: ''
      },
    ]
  }

  elementHTML.push(_chartObj);

  //Create chart
  var ctx1 = canvas.getContext('2d');
  var newChart = new Chart(ctx1, {
    // The type of chart we want to create
    type: 'line',
    // The data for our dataset
    data: {
      labels: [],
      datasets: [{
        steppedLine: false,
        backgroundColor: 'rgba(57,172,180 , 0.8)',
        hoverBackgroundColor: 'rgba(57,172,180 , 0.3)',
        data: [],
        label: 'Value',
        // backgroundColor: 'rgb(255, 255, 255, 0.2)',
        borderColor: 'rgb(0,102,10)',
        borderWidth: 2,
        pointRadius: 0,
      }]
    },

    // Configuration options go here
    options: {
      legend: false,
      responsive: true,
      maintainAspectRatio: false,
      title: {
        display: false,
        // text: option.title,
        // fontColor: 'white',
        // fontSize: 20
      },
      tooltips: {
        mode: 'index',
        intersect: false,
        titleFontSize: 16,
        bodyFontSize: 16
      },
      hover: {
        mode: 'nearest',
        intersect: true
      },
      scales: {
        xAxes: [{
          display: true,
          // type : 'realtime',
          scaleLabel: {
            display: true,
            labelString: canvas.xLabel,
          },
        }],
        yAxes: [{
          ticks: {
            beginAtZero: true
          },
          display: true,
          gridLines: {
            color: '#282525'
          },
          scaleLabel: {
            display: true,
            labelString: canvas.yLabel,
          }
        }]
      },

    }
  });
  arrChartJS.push({ id: canvas.id, node: newChart });



  //Image mouse events
  $(canvas).on('mouseover', function (event) {
    //event.target.style.opacity = 0.4;
    event.target.style.cursor = 'pointer';
  });
  //Subscribe mouseout event for each polygon
  // $(canvas).on('mouseout', function (event) {
  //   event.target.style.opacity = 1;
  // });
  //Subscribe mouse double click event
  $(canvas).on('dblclick', function (mouseEvent) {
    $('#chartModal').one('show.bs.modal', function (showEvent) {

      var selectedItem = mouseEvent.target; //Canvas selected
      var elemWidth, elemHeight;

      elemWidth = parseInt(selectedItem.style.width, 10);
      elemHeight = parseInt(selectedItem.style.height, 10);

      var itemModal = $('#chartModal')[0];
      itemModal.querySelector('.inputWidth').value = elemWidth;
      itemModal.querySelector('.inputHeight').value = elemHeight;

      if (selectedItem.tag) {
        itemModal.querySelector('.inputValue').value = selectedItem.tag;
      }
      else {
        itemModal.querySelector('.inputValue').value = '';
      }

      if (selectedItem.xLabel) {
        itemModal.querySelector('.inputXLabel').value = selectedItem.xLabel;
      }
      else {
        itemModal.querySelector('.inputXLabel').value = '';
      }

      if (selectedItem.yLabel) {
        itemModal.querySelector('.inputYLabel').value = selectedItem.yLabel;
      }
      else {
        itemModal.querySelector('.inputYLabel').value = '';
      }

      // if (selectedItem.timeRange) {
      //   itemModal.querySelector('.inputTimeRange').value = selectedItem.timeRange;
      // }
      // else {
      //   itemModal.querySelector('.inputTimeRange').value = '';
      // }

      if (selectedItem.hiddenWhen) {
        itemModal.querySelector('.inputHiddenWhen').value = selectedItem.hiddenWhen;
      }
      else {
        itemModal.querySelector('.inputHiddenWhen').value = '';
      }


      //Button save 
      $('.saveChangeButton').on('click', function (event) {

        selectedItem.style.width = itemModal.querySelector('.inputWidth').value + 'px';
        selectedItem.style.height = itemModal.querySelector('.inputHeight').value + 'px';
        selectedItem.tag = itemModal.querySelector('.inputValue').value;
        selectedItem.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;
        selectedItem.xLabel = itemModal.querySelector('.inputXLabel').value;
        selectedItem.yLabel = itemModal.querySelector('.inputYLabel').value;
        //selectedItem.timeRange = itemModal.querySelector('.inputTimeRange').value;

        var _foundIndex = findElementHTMLById(selectedItem.id);
        if (_foundIndex != -1) {
          elementHTML[_foundIndex].properties[0].value = selectedItem.tag;
          elementHTML[_foundIndex].properties[1].value = selectedItem.hiddenWhen;
          elementHTML[_foundIndex].properties[2].value = selectedItem.xLabel;
          elementHTML[_foundIndex].properties[3].value = selectedItem.yLabel;
          // elementHTML[_foundIndex].properties[4].value = selectedItem.timeRange;
        }

        var foundChartIndex = findChartById(selectedItem.id);
        if (foundChartIndex != -1) {
          arrChartJS[foundChartIndex].node.options.scales.xAxes[0].scaleLabel.labelString = selectedItem.xLabel;
          arrChartJS[foundChartIndex].node.options.scales.yAxes[0].scaleLabel.labelString = selectedItem.yLabel;
          arrChartJS[foundChartIndex].node.update();
        }
      });

      //Button Value browse tag
      $('.btnValueTag').on('click', function (valueEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputValue').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

      $('.btnHiddenWhen').on('click', function (valueEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

    });

    $('#chartModal').one('hide.bs.modal', function (hideEvent) {
      $('.saveChangeButton').off('click');
      $('.btnValueTag').off('click');
      $('.btnHiddenWhen').off('click');
    });

    $('#chartModal').modal();
  });

  $('#dashboard').append(chartDiv);
  shapes[index] = chartDiv;
  index++;
  nameIndex++;


  //Add draggable feature
  // draggable = new PlainDraggable(progressbar, { leftTop: true });
  // draggable.autoScroll = true;
  // draggable.containment = document.getElementById('mainPage1');
  // draggableObjects.push(draggable);

  chartDiv.classList.add('draggable2');
  $('.draggable2').draggable({
    refreshPositions: true,
    containment: $('#dashboard'),
  });


}

//Gauge dashboard mouse down event handler: To create new chart dashboard
function gaugeDashboardMouseDownEventHandler(event) {
  var leftOffset = document.getElementById('dashboard').getBoundingClientRect().left;
  var topOffset = document.getElementById('dashboard').getBoundingClientRect().top;

  var left = event.pageX - leftOffset + 'px';
  var top = event.pageY - topOffset + 'px';

  //Add a new div
  var gaugeDiv = document.createElement('div');
  gaugeDiv.id = 'gauge' + nameIndex;
  gaugeDiv.className = 'gauge contextMenu';

  //Chart css style
  gaugeDiv.style.position = 'absolute';
  gaugeDiv.style.top = top;
  gaugeDiv.style.left = left;
  gaugeDiv.style.height = '400px';
  gaugeDiv.style.width = '400px';
  //gaugeDiv.style.background = 'green';

  //Init gauge properties
  gaugeDiv.type = false;
  gaugeDiv.format = 2;
  gaugeDiv.usePointer = true;
  gaugeDiv.gaugeWidth = 0.2;
  gaugeDiv.gaugeColor = 'rgba(255,255,255,0.5)';
  gaugeDiv.levelColor = ['#00660a'];
  gaugeDiv.pointerColor = '#00800d';
  gaugeDiv.fontColor = '#000000';
  gaugeDiv.label = 'value';
  gaugeDiv.min = 0;
  gaugeDiv.max = 100;
  gaugeDiv.title = "Gauge";

  //Create elementHTML object
  var _gaugeObj = {
    type: 'gauge',
    id: gaugeDiv.id,
    properties: [
      {
        name: 'tag',
        value: ''
      },
      {
        name: 'hiddenWhen',
        value: ''
      },
      {
        name: 'type',
        value: ''
      },
      {
        name: 'gaugeColor',
        value: ''
      },
      {
        name: 'levelColor',
        value: ''
      },
      {
        name: 'fontColor',
        value: ''
      },
      {
        name: 'gaugeWidth',
        value: ''
      },
      {
        name: 'usePointer',
        value: ''
      },
      {
        name: 'pointerColor',
        value: ''
      },
      {
        name: 'format',
        value: ''
      },
      {
        name: 'label',
        value: ''
      },
      {
        name: 'min',
        value: ''
      },
      {
        name: 'max',
        value: ''
      },
      {
        name: 'title',
        value: ''
      },
    ]
  }

  elementHTML.push(_gaugeObj);

  $('#dashboard').append(gaugeDiv);

  var gauge = new JustGage({
    id: gaugeDiv.id,
    value: 50,
    decimals: gaugeDiv.format,
    title: gaugeDiv.title,
    min: gaugeDiv.min,
    max: gaugeDiv.max,
    label: gaugeDiv.label,
    labelFontColor: gaugeDiv.fontColor,
    donut: gaugeDiv.type,
    relativeGaugeSize: true,
    valueFontColor: gaugeDiv.fontColor,
    valueFontSize: '10px',
    gaugeColor: gaugeDiv.gaugeColor,
    levelColors: gaugeDiv.levelColor,
    pointer: gaugeDiv.usePointer,
    pointerOptions: {
      toplength: 8,
      bottomlength: -20,
      bottomwidth: 6,
      color: gaugeDiv.pointerColor
    },
    gaugeWidthScale: gaugeDiv.gaugeWidth,
    counter: true,
  });
  arrGauge.push({ id: gaugeDiv.id, node: gauge });

  //Image mouse events
  $(gaugeDiv).on('mouseover', function (event) {
    //event.target.style.opacity = 0.4;
    event.target.style.cursor = 'pointer';
  });
  //Subscribe mouseout event for each polygon
  // $(canvas).on('mouseout', function (event) {
  //   event.target.style.opacity = 1;
  // });
  //Subscribe mouse double click event
  $(gaugeDiv).on('dblclick', function (mouseEvent) {
    $('#gaugeModal').one('show.bs.modal', function (showEvent) {

      var selectedItem = mouseEvent.target; //Canvas selected
      switch (selectedItem.tagName) {
        case 'svg': {
          selectedItem = selectedItem.parentNode;
          break;
        }
        case 'path': {
          selectedItem = selectedItem.parentNode.parentNode;
          break;
        }
        case 'tspan': {
          selectedItem = selectedItem.parentNode.parentNode.parentNode;
          break;
        }
      }

      var elemWidth, elemHeight;

      elemWidth = parseInt(selectedItem.style.width, 10);
      elemHeight = parseInt(selectedItem.style.height, 10);

      var itemModal = $('#gaugeModal')[0];
      itemModal.querySelector('.inputWidth').value = elemWidth;
      itemModal.querySelector('.inputHeight').value = elemHeight;

      if (selectedItem.type) {
        itemModal.querySelector('[name = gaugeType]').value = "true";
      } else {
        itemModal.querySelector('[name = gaugeType]').value = "false";
      }

      if (selectedItem.format) {
        itemModal.querySelector('[name = gaugeFormat]').value = selectedItem.format;
      }

      if (selectedItem.gaugeWidth) {
        itemModal.querySelector('.inputGaugeWidth').value = selectedItem.gaugeWidth;
      }

      if (selectedItem.usePointer) {
        itemModal.querySelector('#gaugeUsePointerCheckbox').checked = true;
      } else {
        itemModal.querySelector('#gaugeUsePointerCheckbox').checked = false;
      }

      if (selectedItem.gaugeColor) {
        itemModal.querySelector('.inputGaugeColor').value = selectedItem.gaugeColor;
      }

      if (selectedItem.levelColor) {
        itemModal.querySelector('.inputLevelColor').value = selectedItem.levelColor[0];
      }

      if (selectedItem.fontColor) {
        itemModal.querySelector('.inputFontColor').value = selectedItem.fontColor;
      }

      if (selectedItem.pointerColor) {
        itemModal.querySelector('.inputPointerColor').value = selectedItem.pointerColor;
      }

      if (selectedItem.tag) {
        itemModal.querySelector('.inputValue').value = selectedItem.tag;
      } else {
        itemModal.querySelector('.inputValue').value = '';
      }

      if (selectedItem.label) {
        itemModal.querySelector('.inputGaugeLabel').value = selectedItem.label;
      } else {
        itemModal.querySelector('.inputGaugeLabel').value = '';
      }

      if (selectedItem.min != null) {
        itemModal.querySelector('.inputMin').value = selectedItem.min;
      }

      if (selectedItem.max != null) {
        itemModal.querySelector('.inputMax').value = selectedItem.max;
      }

      if (selectedItem.hiddenWhen) {
        itemModal.querySelector('.inputHiddenWhen').value = selectedItem.hiddenWhen;
      } else {
        itemModal.querySelector('.inputHiddenWhen').value = '';
      }

      if (selectedItem.title) {
        itemModal.querySelector('.inputGaugeTitle').value = selectedItem.title;
      } else {
        itemModal.querySelector('.inputGaugeTitle').value = '';
      }

      //Button save 
      $('.saveChangeButton').on('click', function (event) {

        selectedItem.style.width = itemModal.querySelector('.inputWidth').value + 'px';
        selectedItem.style.height = itemModal.querySelector('.inputHeight').value + 'px';
        selectedItem.type = (itemModal.querySelector('[name = gaugeType]').value == 'true');
        selectedItem.format = Number(itemModal.querySelector('[name=gaugeFormat]').value);
        selectedItem.gaugeWidth = itemModal.querySelector('.inputGaugeWidth').value;
        selectedItem.usePointer = itemModal.querySelector('#gaugeUsePointerCheckbox').checked;
        selectedItem.gaugeColor = itemModal.querySelector('.inputGaugeColor').value;
        selectedItem.levelColor = [itemModal.querySelector('.inputLevelColor').value];
        selectedItem.fontColor = itemModal.querySelector('.inputFontColor').value;
        selectedItem.pointerColor = itemModal.querySelector('.inputPointerColor').value;
        selectedItem.tag = itemModal.querySelector('.inputValue').value;
        selectedItem.label = itemModal.querySelector('.inputGaugeLabel').value;
        selectedItem.min = Number(itemModal.querySelector('.inputMin').value);
        selectedItem.max = Number(itemModal.querySelector('.inputMax').value);
        selectedItem.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;
        selectedItem.title = itemModal.querySelector('.inputGaugeTitle').value;

        var _foundIndex = findElementHTMLById(selectedItem.id);
        if (_foundIndex != -1) {
          elementHTML[_foundIndex].properties[0].value = selectedItem.tag;
          elementHTML[_foundIndex].properties[1].value = selectedItem.hiddenWhen;
          elementHTML[_foundIndex].properties[2].value = selectedItem.type;
          elementHTML[_foundIndex].properties[3].value = selectedItem.gaugeColor;
          elementHTML[_foundIndex].properties[4].value = [selectedItem.levelColor];
          elementHTML[_foundIndex].properties[5].value = selectedItem.fontColor;
          elementHTML[_foundIndex].properties[6].value = selectedItem.gaugeWidth;
          elementHTML[_foundIndex].properties[7].value = selectedItem.usePointer;
          elementHTML[_foundIndex].properties[8].value = selectedItem.pointerColor;
          elementHTML[_foundIndex].properties[9].value = selectedItem.format;
          elementHTML[_foundIndex].properties[10].value = selectedItem.label;
          elementHTML[_foundIndex].properties[11].value = selectedItem.min;
          elementHTML[_foundIndex].properties[12].value = selectedItem.max;
          elementHTML[_foundIndex].properties[13].value = selectedItem.title;
        }

        var foundGaugeIndex = findGaugeById(selectedItem.id);
        if (foundGaugeIndex != -1) {
          var gaugeItem = arrGauge[foundGaugeIndex].node;
          var gaugeConfig = JSON.parse(JSON.stringify(gaugeItem.config));
          var gaugeId = arrGauge[foundGaugeIndex].id;

          //Update config 
          gaugeConfig.donut = selectedItem.type;
          gaugeConfig.gaugeColor = selectedItem.gaugeColor;
          gaugeConfig.levelColors = [selectedItem.levelColor];
          gaugeConfig.labelFontColor = selectedItem.fontColor;
          gaugeConfig.valueFontColor = selectedItem.fontColor;
          gaugeConfig.gaugeWidthScale = selectedItem.gaugeWidth;
          gaugeConfig.pointer = selectedItem.usePointer;
          gaugeConfig.pointerOptions.color = selectedItem.pointerColor;
          gaugeConfig.decimals = selectedItem.format;
          gaugeConfig.label = selectedItem.label;
          gaugeConfig.title = selectedItem.title;

          //Remove current svg object
          $('#' + gaugeId).find('svg').remove();

          //Create new gauge
          var newGauge = new JustGage(gaugeConfig);

          //Update arrGauge
          arrGauge[foundGaugeIndex].node = newGauge;

        }
      });

      //Button Value browse tag
      $('.btnValueTag').on('click', function (valueEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputValue').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

      $('.btnHiddenWhen').on('click', function (valueEvent) {
        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
            itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
          }
        });
      });

    });

    $('#gaugeModal').one('hide.bs.modal', function (hideEvent) {
      $('.saveChangeButton').off('click');
      $('.btnValueTag').off('click');
      $('.btnHiddenWhen').off('click');
    });

    $('#gaugeModal').modal();
  });


  shapes[index] = gaugeDiv;
  index++;
  nameIndex++;

  //Add draggable feature
  // draggable = new PlainDraggable(progressbar, { leftTop: true });
  // draggable.autoScroll = true;
  // draggable.containment = document.getElementById('mainPage1');
  // draggableObjects.push(draggable);

  gaugeDiv.classList.add('draggable2');
  $('.draggable2').draggable({
    refreshPositions: true,
    containment: $('#dashboard'),
  });


}

//Show all hidden element 
function showHiddenItems() {
  for (var i = 0; i < elementHTML.length; i++) {
    if (elementHTML[i].type != 'verticalslider') {
      if (elementHTML[i].type == 'chart') $(document.getElementById(elementHTML[i].id).parentNode).show();
      else $('#' + elementHTML[i].id).show();
    }
  }
}

//Enable all element
function enableAllItems() {
  for (var i = 0; i < elementHTML.length; i++) {
    if (elementHTML[i].type == 'switch' || elementHTML[i].type == 'checkbox') {
      // console.log( $(document.getElementById(elementHTML[i].id).parentNode).find('input'))
      $(document.getElementById(elementHTML[i].id).parentNode).find('input').prop('disabled', false);
    } else $('#' + elementHTML[i].id).prop('disabled', false);
  }
}




//Add 100px to the left of all elements
function addPixel() {
  for (var i = 0; i < elementHTML.length; i++) {
    var element = document.getElementById(elementHTML[i].id);

    switch (elementHTML[i].type) {
      case 'svg': {
        $(element).attr({
          transform: 'translate(' + $leftOffset + ',0)'
        });
        break;
      };
      case 'switch': {
        var label = $(element).closest('label')[0];
        if (label) {
          var labelLeft = label.style.left;
          if (labelLeft) {
            labelLeft = labelLeft.replace('px', '');
            var newLeft = (Number(labelLeft) + $leftOffset) + 'px';
            label.style.left = newLeft;
          }
        }
        break;
      }
      case 'checkbox':
      case 'chart':
      case 'verticalslider': {
        var divNode = element.parentNode;
        var divLeft = divNode.style.left;
        if (divLeft) {
          divLeft = divLeft.replace('px', '');
          divNode.style.left = (Number(divLeft) + $leftOffset) + 'px';
        }
        break;
      }
      default: {
        var currentLeft = element.style.left;
        if (currentLeft) {
          currentLeft = currentLeft.replace('px', '');
          element.style.left = (Number(currentLeft) + $leftOffset) + 'px';
        }
        break;
      }
    }
  }
}

//Save current design page
function saveDesign(_socket) {
  $('#btnSaveSuccess').click(function() {
    window.location.reload();
  })
  //Turn off save modal
  $('#saveModal').modal('hide');

  var mainPage1 = document.getElementById('mainPage1').innerHTML;
  var dashboard = document.getElementById('dashboard').innerHTML;

  var _sendObject = {
    user: user,
    deviceID: deviceID,
    html: mainPage1,
    dashboard: dashboard,
    elements: elementHTML,
    //variableList: variableList
  }

  var mainPageColor = $('#mainPage1')[0].style.background;
  if (mainPageColor) mainPageColor = rgb2hex(mainPageColor);

  var alarmPageColor = $('#alarm')[0].style.background;
  if (alarmPageColor) alarmPageColor = rgb2hex(alarmPageColor);

  var historyPageColor = $('#history')[0].style.background;
  if (historyPageColor) historyPageColor = rgb2hex(historyPageColor);

  var dashboardPageColor = $('#dashboard')[0].style.background;
  if (dashboardPageColor) dashboardPageColor = rgb2hex(dashboardPageColor);

  var backgroundObject = {
    mainPage: mainPageColor,
    alarmPage: alarmPageColor,
    historyPage: historyPageColor,
    dashboardPage: dashboardPageColor
  }

  var fileList = {
    designFile: $('#inputSaveFilename').val() + '.json',
    elementFile: $('#inputSaveFilename').val() + '_Elements.json',
    backgroundFile: $('#inputSaveFilename').val() + '_Background.json'
  }

  _socket.emit('/save', _sendObject, backgroundObject, fileList);
  $('#spinnerSaveModal').modal('show');
  _socket.on('/' + deviceID + '/saveSuccess', function (data) {
    setTimeout(function () {
      $('#spinnerSaveModal').modal('hide');
      $('#successSaveModal').modal('show');
      _socket.off('/' + deviceID + '/saveSuccess');
    }, 2000);
  });
}

//Open a desgin
function openDesign(_socket) {
  var isContinue = confirm('Do you want to continue?');
  if (isContinue) {
    $('#mainPage1').empty();
    $('#dashboard').empty();
    shapes.splice(0, shapes.length);
    arrChartJS.splice(0, arrChartJS.length);
    arrGauge.splice(0, arrGauge.length);
    elementHTML = [];
    draggableObjects.splice(0, draggableObjects.length);

    var fileName = openTable.$('tr.table-selected')[0].cells[0].innerText;
    _socket.emit('/reqDesign', { user: user, deviceID: deviceID, fileName: fileName });
    _socket.on('/' + deviceID + '/resDesign', function (data) {
      _socket.off('/' + deviceID + '/resDesign');
      $('#mainPage1').append($.parseHTML(data.design.mainPage1));
      $('#dashboard').append($.parseHTML(data.design.dashboard));
      var oldSvg = $('#mainPage1').find('svg')[0];
      var svgObjects = $(oldSvg).contents();
      $(oldSvg).remove();
      draw = SVG('mainPage1');
      $(draw.node).append(svgObjects);

      //Modify array elementHTML
      elementHTML = data.element;
      elementHTML.forEach(element => {
        var elementDOM = document.getElementById(element.id);
        var isMainpage = $.contains(document.getElementById('mainPage1'), elementDOM);
        //Init HTML properties
        if (elementDOM) {
          for (j = 0; j < element.properties.length; j++) {
            elementDOM[element.properties[j].name] = element.properties[j].value;
          }
        }


        $('.draggable').draggable({
          refreshPositions: true,
          containment: $('#mainPage1'),
          cancel: false
        });

        $('.draggable2').draggable({
          refreshPositions: true,
          containment: $('#dashboard'),
          cancel: false
        });


        switch (element.type.toLowerCase()) {
          case 'switch': {
            shapes.push(elementDOM.parentNode);
            // if (isMainpage) elementDOM.parentNode.classList.add('draggable');
            // else elementDOM.parentNode.classList.add('draggable2');
            $(elementDOM.parentNode).on('dblclick', function (mouseEvent) {
              $('#switchModal').one('show.bs.modal', function (showEvent) {
                var itemModal = $('#switchModal')[0];

                if (mouseEvent.target.onCommand) {
                  itemModal.querySelector('.inputOnCommand').value = mouseEvent.target.onCommand;
                }
                else {
                  itemModal.querySelector('.inputOnCommand').value = '';
                }

                if (mouseEvent.target.offCommand) {
                  itemModal.querySelector('.inputOffCommand').value = mouseEvent.target.offCommand;
                }
                else {
                  itemModal.querySelector('.inputOffCommand').value = '';
                }

                if (mouseEvent.target.disableWhen) {
                  itemModal.querySelector('.inputDisableWhen').value = mouseEvent.target.disableWhen;
                }
                else {
                  itemModal.querySelector('.inputDisableWhen').value = '';
                }

                $('.saveChangeButton').on('click', function (event) {
                  mouseEvent.target.onCommand = itemModal.querySelector('.inputOnCommand').value;
                  mouseEvent.target.offCommand = itemModal.querySelector('.inputOffCommand').value;
                  mouseEvent.target.disableWhen = itemModal.querySelector('.inputDisableWhen').value;


                  var _foundIndex = findElementHTMLById(mouseEvent.target.id);
                  if (_foundIndex != -1) {
                    elementHTML[_foundIndex].properties[0].value = mouseEvent.target.onCommand;
                    elementHTML[_foundIndex].properties[1].value = mouseEvent.target.offCommand;
                    elementHTML[_foundIndex].properties[2].value = mouseEvent.target.disableWhen;
                  }

                });

                $('.btnOnCommand').on('click', function (onConditionClickEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputOnCommand').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

                $('.btnOffCommand').on('click', function (onConditionClickEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputOffCommand').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

                $('.btnDisableWhen').on('click', function (onConditionClickEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputDisableWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

              });

              $('#switchModal').one('hide.bs.modal', function (hideEvent) {
                $('.saveChangeButton').off('click');
                $('.btnOnCommand').off('click');
                $('.btnOffCommand').off('click');
                $('.btnDisableWhen').off('click');
              });

              $('#switchModal').modal();
            });
            break;
          }
          case 'checkbox': {
            shapes.push(elementDOM.parentNode);
            // if (isMainpage) elementDOM.parentNode.classList.add('draggable');
            // else elementDOM.parentNode.classList.add('draggable2');

            $(elementDOM.parentNode).on('dblclick', function (mouseEvent) {
              $('#checkboxModal').one('show.bs.modal', function (showEvent) {

                var itemModal = $('#checkboxModal')[0];
                itemModal.querySelector('.textContent').value = mouseEvent.target.innerText;

                if (mouseEvent.target.checkedCommand) {
                  itemModal.querySelector('.inputChecked').value = mouseEvent.target.checkedCommand;
                }
                else {
                  itemModal.querySelector('.inputChecked').value = '';
                }

                if (mouseEvent.target.unCheckedCommand) {
                  itemModal.querySelector('.inputUnchecked').value = mouseEvent.target.unCheckedCommand;
                }
                else {
                  itemModal.querySelector('.inputUnchecked').value = '';
                }

                if (mouseEvent.target.disableWhen) {
                  itemModal.querySelector('.inputDisableWhen').value = mouseEvent.target.disableWhen;
                }
                else {
                  itemModal.querySelector('.inputDisableWhen').value = '';
                }

                $('.saveChangeButton').on('click', function (event) {
                  mouseEvent.target.innerHTML = itemModal.querySelector('.textContent').value;
                  mouseEvent.target.checkedCommand = itemModal.querySelector('.inputChecked').value;
                  mouseEvent.target.unCheckedCommand = itemModal.querySelector('.inputUnchecked').value;
                  mouseEvent.target.disableWhen = itemModal.querySelector('.inputDisableWhen').value;

                  var _foundIndex = findElementHTMLById(mouseEvent.target.id);
                  if (_foundIndex != -1) {
                    elementHTML[_foundIndex].properties[0].value = mouseEvent.target.checkedCommand;
                    elementHTML[_foundIndex].properties[1].value = mouseEvent.target.unCheckedCommand;
                    elementHTML[_foundIndex].properties[2].value = mouseEvent.target.disableWhen;
                  }
                });

                $('.btnChecked').on('click', function (onConditionClickEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputChecked').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

                $('.btnUnchecked').on('click', function (onConditionClickEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputUnchecked').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

                $('.btnDisableWhen').on('click', function (onConditionClickEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputDisableWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

              });

              $('#checkboxModal').one('hide.bs.modal', function (hideEvent) {
                $('.saveChangeButton').off('click');
                $('.btnChecked').off('click');
                $('.btnUnchecked').off('click');
                $('.btnDisableWhen').off('click');
              });

              $('#checkboxModal').modal();
            });
            break;
          }
          case 'chart': {
            shapes.push(elementDOM.parentNode);
            // if (isMainpage) elementDOM.parentNode.classList.add('draggable');
            // else elementDOM.parentNode.classList.add('draggable2');
            //Canvas = elementDOM
            var width = elementDOM.width;
            var height = elementDOM.height;
            var ctx1 = elementDOM.getContext('2d');
            var newChart = new Chart(ctx1, {
              // The type of chart we want to create
              type: 'line',
              // The data for our dataset
              data: {
                labels: [],
                datasets: [{
                  steppedLine: false,
                  backgroundColor: 'rgba(57,172,180 , 0.8)',
                  hoverBackgroundColor: 'rgba(57,172,180 , 0.3)',
                  data: [],
                  label: 'Value',
                  // backgroundColor: 'rgb(255, 255, 255, 0.2)',
                  borderColor: 'rgb(0,102,10)',
                  borderWidth: 2,
                  pointRadius: 0,
                }]
              },

              // Configuration options go here
              options: {
                legend: false,
                responsive: true,
                maintainAspectRatio: false,
                title: {
                  display: false,
                  // text: option.title,
                  // fontColor: 'white',
                  // fontSize: 20
                },
                tooltips: {
                  mode: 'index',
                  intersect: false,
                  titleFontSize: 16,
                  bodyFontSize: 16
                },
                hover: {
                  mode: 'nearest',
                  intersect: true
                },
                scales: {
                  xAxes: [{
                    display: true,
                    // type : 'realtime',
                    scaleLabel: {
                      display: true,
                      labelString: elementDOM.xLabel || 'Time',
                    },
                  }],
                  yAxes: [{
                    ticks: {
                      beginAtZero: true
                    },
                    display: true,
                    gridLines: {
                      color: '#282525'
                    },
                    scaleLabel: {
                      display: true,
                      labelString: elementDOM.yLabel || 'Value',
                    }
                  }]
                },

              }
            });
            if (!isMainpage) {
              elementDOM.style.width = width + 'px';
              elementDOM.style.height = height + 'px';
            }
            arrChartJS.push({ id: element.id, node: newChart });

            $(elementDOM).on('dblclick', function (mouseEvent) {
              $('#chartModal').one('show.bs.modal', function (showEvent) {

                var selectedItem = mouseEvent.target; //Canvas selected
                var elemWidth, elemHeight;

                elemWidth = parseInt(selectedItem.style.width, 10);
                elemHeight = parseInt(selectedItem.style.height, 10);

                var itemModal = $('#chartModal')[0];
                itemModal.querySelector('.inputWidth').value = elemWidth;
                itemModal.querySelector('.inputHeight').value = elemHeight;

                if (selectedItem.tag) {
                  itemModal.querySelector('.inputValue').value = selectedItem.tag;
                }
                else {
                  itemModal.querySelector('.inputValue').value = '';
                }

                if (selectedItem.xLabel) {
                  itemModal.querySelector('.inputXLabel').value = selectedItem.xLabel;
                }
                else {
                  itemModal.querySelector('.inputXLabel').value = '';
                }

                if (selectedItem.yLabel) {
                  itemModal.querySelector('.inputYLabel').value = selectedItem.yLabel;
                }
                else {
                  itemModal.querySelector('.inputYLabel').value = '';
                }

                // if (selectedItem.timeRange) {
                //   itemModal.querySelector('.inputTimeRange').value = selectedItem.timeRange;
                // }
                // else {
                //   itemModal.querySelector('.inputTimeRange').value = '';
                // }

                if (selectedItem.hiddenWhen) {
                  itemModal.querySelector('.inputHiddenWhen').value = selectedItem.hiddenWhen;
                }
                else {
                  itemModal.querySelector('.inputHiddenWhen').value = '';
                }


                //Button save 
                $('.saveChangeButton').on('click', function (event) {

                  selectedItem.style.width = itemModal.querySelector('.inputWidth').value + 'px';
                  selectedItem.style.height = itemModal.querySelector('.inputHeight').value + 'px';
                  selectedItem.tag = itemModal.querySelector('.inputValue').value;
                  selectedItem.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;
                  selectedItem.xLabel = itemModal.querySelector('.inputXLabel').value;
                  selectedItem.yLabel = itemModal.querySelector('.inputYLabel').value;
                  //selectedItem.timeRange = itemModal.querySelector('.inputTimeRange').value;

                  var _foundIndex = findElementHTMLById(selectedItem.id);
                  if (_foundIndex != -1) {
                    elementHTML[_foundIndex].properties[0].value = selectedItem.tag;
                    elementHTML[_foundIndex].properties[1].value = selectedItem.hiddenWhen;
                    elementHTML[_foundIndex].properties[2].value = selectedItem.xLabel;
                    elementHTML[_foundIndex].properties[3].value = selectedItem.yLabel;
                    // elementHTML[_foundIndex].properties[4].value = selectedItem.timeRange;
                  }

                  var foundChartIndex = findChartById(selectedItem.id);
                  if (foundChartIndex != -1) {
                    arrChartJS[foundChartIndex].node.options.scales.xAxes[0].scaleLabel.labelString = selectedItem.xLabel;
                    arrChartJS[foundChartIndex].node.options.scales.yAxes[0].scaleLabel.labelString = selectedItem.yLabel;
                    arrChartJS[foundChartIndex].node.update();
                  }
                });

                //Button Value browse tag
                $('.btnValueTag').on('click', function (valueEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputValue').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

                $('.btnHiddenWhen').on('click', function (valueEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

              });

              $('#chartModal').one('hide.bs.modal', function (hideEvent) {
                $('.saveChangeButton').off('click');
                $('.btnValueTag').off('click');
                $('.btnHiddenWhen').off('click');
              });

              $('#chartModal').modal();
            });
            break;
          }
          case 'gauge': {
            shapes.push(elementDOM);
            if (isMainpage) elementDOM.classList.add('draggable');
            else elementDOM.classList.add('draggable2');
            $(elementDOM).find('svg').remove();
            var newGauge = new JustGage({
              id: elementDOM.id,
              value: 50,
              decimals: elementDOM.format || 2,
              title: elementDOM.title || 'Gauge',
              min: elementDOM.min || 0,
              max: elementDOM.max || 100,
              label: elementDOM.label || 'RPM',
              labelFontColor: elementDOM.fontColor || '#000000',
              donut: elementDOM.type || false,
              relativeGaugeSize: true,
              valueFontColor: elementDOM.fontColor || '#000000',
              valueFontSize: '10px',
              gaugeColor: elementDOM.gaugeColor || 'rgba(255,255,255,0.5)',
              levelColors: elementDOM.levelColor || ['#00660a'],
              pointer: elementDOM.usePointer || true,
              pointerOptions: {
                toplength: 8,
                bottomlength: -20,
                bottomwidth: 6,
                color: elementDOM.pointerColor || '#00800d',
              },
              gaugeWidthScale: elementDOM.gaugeWidth || 0.2,
              counter: true,
            });
            arrGauge.push({ id: elementDOM.id, node: newGauge });
            elementDOM.style.cursor = 'pointer';  //Fix pointer when mouse over INPUT
            $(elementDOM).on('dblclick', function (mouseEvent) {
              $('#gaugeModal').one('show.bs.modal', function (showEvent) {

                var selectedItem = mouseEvent.target; //Canvas selected
                switch (selectedItem.tagName) {
                  case 'svg': {
                    selectedItem = selectedItem.parentNode;
                    break;
                  }
                  case 'path': {
                    selectedItem = selectedItem.parentNode.parentNode;
                    break;
                  }
                  case 'tspan': {
                    selectedItem = selectedItem.parentNode.parentNode.parentNode;
                    break;
                  }
                }

                var elemWidth, elemHeight;

                elemWidth = parseInt(selectedItem.style.width, 10);
                elemHeight = parseInt(selectedItem.style.height, 10);

                var itemModal = $('#gaugeModal')[0];
                itemModal.querySelector('.inputWidth').value = elemWidth;
                itemModal.querySelector('.inputHeight').value = elemHeight;

                if (selectedItem.type) {
                  itemModal.querySelector('[name = gaugeType]').value = "true";
                } else {
                  itemModal.querySelector('[name = gaugeType]').value = "false";
                }

                if (selectedItem.format) {
                  itemModal.querySelector('[name = gaugeFormat]').value = selectedItem.format;
                }

                if (selectedItem.gaugeWidth) {
                  itemModal.querySelector('.inputGaugeWidth').value = selectedItem.gaugeWidth;
                }

                if (selectedItem.usePointer) {
                  itemModal.querySelector('#gaugeUsePointerCheckbox').checked = true;
                } else {
                  itemModal.querySelector('#gaugeUsePointerCheckbox').checked = false;
                }

                if (selectedItem.gaugeColor) {
                  itemModal.querySelector('.inputGaugeColor').value = selectedItem.gaugeColor;
                }

                if (selectedItem.levelColor) {
                  itemModal.querySelector('.inputLevelColor').value = selectedItem.levelColor[0];
                }

                if (selectedItem.fontColor) {
                  itemModal.querySelector('.inputFontColor').value = selectedItem.fontColor;
                }

                if (selectedItem.pointerColor) {
                  itemModal.querySelector('.inputPointerColor').value = selectedItem.pointerColor;
                }

                if (selectedItem.tag) {
                  itemModal.querySelector('.inputValue').value = selectedItem.tag;
                } else {
                  itemModal.querySelector('.inputValue').value = '';
                }

                if (selectedItem.label) {
                  itemModal.querySelector('.inputGaugeLabel').value = selectedItem.label;
                } else {
                  itemModal.querySelector('.inputGaugeLabel').value = '';
                }

                if (selectedItem.min != null) {
                  itemModal.querySelector('.inputMin').value = selectedItem.min;
                }

                if (selectedItem.max != null) {
                  itemModal.querySelector('.inputMax').value = selectedItem.max;
                }

                if (selectedItem.hiddenWhen) {
                  itemModal.querySelector('.inputHiddenWhen').value = selectedItem.hiddenWhen;
                } else {
                  itemModal.querySelector('.inputHiddenWhen').value = '';
                }

                if (selectedItem.title) {
                  itemModal.querySelector('.inputGaugeTitle').value = selectedItem.title;
                } else {
                  itemModal.querySelector('.inputGaugeTitle').value = '';
                }

                //Button save 
                $('.saveChangeButton').on('click', function (event) {

                  selectedItem.style.width = itemModal.querySelector('.inputWidth').value + 'px';
                  selectedItem.style.height = itemModal.querySelector('.inputHeight').value + 'px';
                  selectedItem.type = (itemModal.querySelector('[name = gaugeType]').value == 'true');
                  selectedItem.format = Number(itemModal.querySelector('[name=gaugeFormat]').value);
                  selectedItem.gaugeWidth = itemModal.querySelector('.inputGaugeWidth').value;
                  selectedItem.usePointer = itemModal.querySelector('#gaugeUsePointerCheckbox').checked;
                  selectedItem.gaugeColor = itemModal.querySelector('.inputGaugeColor').value;
                  selectedItem.levelColor = [itemModal.querySelector('.inputLevelColor').value];
                  selectedItem.fontColor = itemModal.querySelector('.inputFontColor').value;
                  selectedItem.pointerColor = itemModal.querySelector('.inputPointerColor').value;
                  selectedItem.tag = itemModal.querySelector('.inputValue').value;
                  selectedItem.label = itemModal.querySelector('.inputGaugeLabel').value;
                  selectedItem.min = Number(itemModal.querySelector('.inputMin').value);
                  selectedItem.max = Number(itemModal.querySelector('.inputMax').value);
                  selectedItem.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;
                  selectedItem.title = itemModal.querySelector('.inputGaugeTitle').value;

                  var _foundIndex = findElementHTMLById(selectedItem.id);
                  if (_foundIndex != -1) {
                    elementHTML[_foundIndex].properties[0].value = selectedItem.tag;
                    elementHTML[_foundIndex].properties[1].value = selectedItem.hiddenWhen;
                    elementHTML[_foundIndex].properties[2].value = selectedItem.type;
                    elementHTML[_foundIndex].properties[3].value = selectedItem.gaugeColor;
                    elementHTML[_foundIndex].properties[4].value = [selectedItem.levelColor];
                    elementHTML[_foundIndex].properties[5].value = selectedItem.fontColor;
                    elementHTML[_foundIndex].properties[6].value = selectedItem.gaugeWidth;
                    elementHTML[_foundIndex].properties[7].value = selectedItem.usePointer;
                    elementHTML[_foundIndex].properties[8].value = selectedItem.pointerColor;
                    elementHTML[_foundIndex].properties[9].value = selectedItem.format;
                    elementHTML[_foundIndex].properties[10].value = selectedItem.label;
                    elementHTML[_foundIndex].properties[11].value = selectedItem.min;
                    elementHTML[_foundIndex].properties[12].value = selectedItem.max;
                    elementHTML[_foundIndex].properties[13].value = selectedItem.title;
                  }

                  var foundGaugeIndex = findGaugeById(selectedItem.id);
                  if (foundGaugeIndex != -1) {
                    var gaugeItem = arrGauge[foundGaugeIndex].node;
                    var gaugeConfig = JSON.parse(JSON.stringify(gaugeItem.config));
                    var gaugeId = arrGauge[foundGaugeIndex].id;

                    //Update config 
                    gaugeConfig.donut = selectedItem.type;
                    gaugeConfig.gaugeColor = selectedItem.gaugeColor;
                    gaugeConfig.levelColors = [selectedItem.levelColor];
                    gaugeConfig.labelFontColor = selectedItem.fontColor;
                    gaugeConfig.valueFontColor = selectedItem.fontColor;
                    gaugeConfig.gaugeWidthScale = selectedItem.gaugeWidth;
                    gaugeConfig.pointer = selectedItem.usePointer;
                    gaugeConfig.pointerOptions.color = selectedItem.pointerColor;
                    gaugeConfig.decimals = selectedItem.format;
                    gaugeConfig.label = selectedItem.label;
                    gaugeConfig.title = selectedItem.title;

                    //Remove current svg object
                    $('#' + gaugeId).find('svg').remove();

                    //Create new gauge
                    var newGauge = new JustGage(gaugeConfig);

                    //Update arrGauge
                    arrGauge[foundGaugeIndex].node = newGauge;
                  }
                });

                //Button Value browse tag
                $('.btnValueTag').on('click', function (valueEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputValue').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

                $('.btnHiddenWhen').on('click', function (valueEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

              });

              $('#gaugeModal').one('hide.bs.modal', function (hideEvent) {
                $('.saveChangeButton').off('click');
                $('.btnValueTag').off('click');
                $('.btnHiddenWhen').off('click');
              });

              $('#gaugeModal').modal();
            });
            break;
          }
          case 'svg': {
            shapes.push(elementDOM);
            var draggable = new PlainDraggable(elementDOM, { leftTop: true });
            draggable.autoScroll = true;
            draggable.containment = document.getElementById('mainPage1');
            draggableObjects.push(draggable);

            var svgModalDOM;
            switch (elementDOM.tagName) {
              case 'line': {
                //svgModalDOM = document.getElementById(lineModal);
                $(elementDOM).on('dblclick', function (mouseEvent) {
                  $('#lineModal').one('show.bs.modal', function (showEvent) {
                    var htmlElement = mouseEvent.target.getBoundingClientRect();
                    var svgOffset = mouseEvent.target.parentNode.getBoundingClientRect();
                    var elemX1 = $(elementDOM).attr('x1'),
                      elemY1 = $(elementDOM).attr('y1'),
                      elemX2 = $(elementDOM).attr('x2'),
                      elemY2 = $(elementDOM).attr('y2'),
                      elemWidth = $(elementDOM).attr('stroke-width'),
                      elemLinecap = $(elementDOM).attr('stroke-linecap'),
                      elemColor = $(elementDOM).attr('stroke');
                    var itemModal = document.getElementById('lineModal')
                    itemModal.querySelector('#inputX1').value = elemX1;
                    itemModal.querySelector('#inputY1').value = elemY1;
                    itemModal.querySelector('#inputX2').value = elemX2;
                    itemModal.querySelector('#inputY2').value = elemY2;
                    itemModal.querySelector('#inputStrokeWidth').value = elemWidth;
                    itemModal.querySelector('#inputColor').value = elemColor;
                    itemModal.querySelector('#inputLinecap').value = elemLinecap;
                    if (mouseEvent.target.hiddenWhen) {
                      itemModal.querySelector('.inputHiddenWhen').value = mouseEvent.target.hiddenWhen;
                    }
                    else {
                      itemModal.querySelector('.inputHiddenWhen').value = '';
                    }
                    $('.saveChangeButton').on('click', function (event) {
                      $(elementDOM).attr({
                        'stroke-width': itemModal.querySelector('#inputStrokeWidth').value,
                        'stroke-linecap': itemModal.querySelector('#inputLinecap').value,
                        'stroke': itemModal.querySelector('#inputColor').value,
                        'x1': itemModal.querySelector('#inputX1').value,
                        'y1': itemModal.querySelector('#inputY1').value,
                        'x2': itemModal.querySelector('#inputX2').value,
                        'y2': itemModal.querySelector('#inputY2').value,
                        'transform': 'translate(0,0)',
                      });
                      mouseEvent.target.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;
                      var _foundIndex = findElementHTMLById(mouseEvent.target.id);
                      if (_foundIndex != -1) elementHTML[_foundIndex].properties[0].value = mouseEvent.target.hiddenWhen;
                      for (draggableItem of draggableObjects) {
                        if (draggableItem.element.id == elementDOM.id) {
                          draggableObjects.splice(draggableObjects.indexOf(draggableItem), 1);
                          break;
                        }
                      }
                      draggable = new PlainDraggable(elementDOM, { leftTop: true });
                      draggable.autoScroll = true;
                      draggable.containment = document.getElementById('mainPage1');
                      draggableObjects.push(draggable);
                    });

                    $('.btnHiddenWhen').on('click', function (onConditionClickEvent) {
                      $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                        if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                          itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                        }
                      });
                    });
                  });

                  $('#lineModal').one('hide.bs.modal', function (hideEvent) {
                    $('.saveChangeButton').off('click');
                    $('.btnHiddenWhen').off('click');
                  });

                  $('#lineModal').modal();
                });
                break;
              }
              case 'ellipse': {
                $(elementDOM).on('dblclick', function (mouseEvent) {
                  var htmlElement = mouseEvent.target.getBoundingClientRect();
                  var svgOffset = mouseEvent.target.parentNode.getBoundingClientRect();
                  $('#ellipseModal').one('show.bs.modal', function (showEvent) {
                    var elemCx = Math.round(htmlElement.left - svgOffset.left + (htmlElement.right - htmlElement.left) / 2),
                      elemCy = Math.round(htmlElement.top - svgOffset.top + (htmlElement.bottom - htmlElement.top) / 2),
                      elemRadiusX = parseInt($(elementDOM).attr('rx'), 10),
                      elemRadiusY = parseInt($(elementDOM).attr('ry'), 10),
                      elemLineWidth = parseInt($(elementDOM).attr('stroke-width'), 10),
                      elemColor = $(elementDOM).attr('stroke');

                    var elemIsFilled = false;
                    if ($(elementDOM).attr('fill-opacity') != 0 || $(elementDOM).attr('fill-opacity') != '0') elemIsFilled = true;

                    var itemModal = $('#ellipseModal')[0];

                    itemModal.querySelector('#inputRadiusX').value = elemRadiusX;
                    itemModal.querySelector('#inputRadiusY').value = elemRadiusY;
                    itemModal.querySelector('#inputPositionX').value = elemCx;
                    itemModal.querySelector('#inputPositionY').value = elemCy;
                    itemModal.querySelector('#inputShapeLineWidth').value = elemLineWidth;
                    itemModal.querySelector('#inputShapeColor').value = elemColor;
                    itemModal.querySelector('#fillEllipseCheckbox').checked = elemIsFilled;
                    itemModal.querySelector('#inputFillShapeColor').value = $(elementDOM).attr('fill');

                    if (mouseEvent.target.hiddenWhen) {
                      itemModal.querySelector('.inputHiddenWhen').value = mouseEvent.target.hiddenWhen;
                    }
                    else {
                      itemModal.querySelector('.inputHiddenWhen').value = '';
                    }

                    $('.saveChangeButton').on('click', function (event) {
                      $(elementDOM).attr({
                        'stroke-width': itemModal.querySelector('#inputShapeLineWidth').value,
                        'stroke': itemModal.querySelector('#inputShapeColor').value,
                        'cx': itemModal.querySelector('#inputPositionX').value,
                        'cy': itemModal.querySelector('#inputPositionY').value,
                        'transform': 'translate(0 0)',
                        'rx': itemModal.querySelector('#inputRadiusX').value,
                        'ry': itemModal.querySelector('#inputRadiusY').value,
                        'fill-opacity': Number(itemModal.querySelector('#fillEllipseCheckbox').checked),
                        'fill': itemModal.querySelector('#inputFillShapeColor').value,
                      });

                      mouseEvent.target.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;

                      var _foundIndex = findElementHTMLById(mouseEvent.target.id);
                      if (_foundIndex != -1) elementHTML[_foundIndex].properties[0].value = mouseEvent.target.hiddenWhen;

                      for (draggableItem of draggableObjects) {
                        if (draggableItem.element.id == elementDOM.id) {
                          draggableObjects.splice(draggableObjects.indexOf(draggableItem), 1);
                          break;
                        }
                      }
                      draggable = new PlainDraggable(elementDOM, { leftTop: true });
                      draggable.autoScroll = true;
                      draggable.containment = document.getElementById('mainPage1');
                      draggableObjects.push(draggable);
                    });

                    $('.btnHiddenWhen').on('click', function (onConditionClickEvent) {
                      $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                        if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                          itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                        }
                      });
                    });
                  });

                  $('#ellipseModal').one('hide.bs.modal', function (hideEvent) {
                    $('.saveChangeButton').off('click');
                    $('.btnHiddenWhen').off('click');
                  });

                  $('#ellipseModal').modal();
                });
                break;
              }
              case 'circle': {
                $(elementDOM).on('dblclick', function (mouseEvent) {
                  var htmlElement = mouseEvent.target.getBoundingClientRect();
                  var svgOffset = mouseEvent.target.parentNode.getBoundingClientRect();
                  $('#circleModal').one('show.bs.modal', function (showEvent) {
                    var elemCx = Math.round(htmlElement.left - svgOffset.left + (htmlElement.right - htmlElement.left) / 2),
                      elemCy = Math.round(htmlElement.top - svgOffset.top + (htmlElement.bottom - htmlElement.top) / 2),
                      elemRadius = parseInt($(elementDOM).attr('r'), 10),
                      elemLineWidth = parseInt($(elementDOM).attr('stroke-width'), 10),
                      elemColor = $(elementDOM).attr('stroke');

                    var elemIsFilled = false;
                    if ($(elementDOM).attr('fill-opacity') != 0) elemIsFilled = true;

                    var itemModal = $('#circleModal')[0];

                    itemModal.querySelector('#inputRadius').value = elemRadius;
                    itemModal.querySelector('#inputPositionX').value = elemCx;
                    itemModal.querySelector('#inputPositionY').value = elemCy;
                    itemModal.querySelector('#inputShapeLineWidth').value = elemLineWidth;
                    itemModal.querySelector('#inputShapeColor').value = elemColor;
                    itemModal.querySelector('#fillCircleCheckbox').checked = elemIsFilled;
                    itemModal.querySelector('#inputFillShapeColor').value = $(elementDOM).attr('fill');

                    if (mouseEvent.target.hiddenWhen) {
                      itemModal.querySelector('.inputHiddenWhen').value = mouseEvent.target.hiddenWhen;
                    }
                    else {
                      itemModal.querySelector('.inputHiddenWhen').value = '';
                    }

                    $('.saveChangeButton').on('click', function (event) {
                      $(elementDOM).attr({
                        'r': itemModal.querySelector('#inputRadius').value,
                        'stroke-width': itemModal.querySelector('#inputShapeLineWidth').value,
                        'stroke': itemModal.querySelector('#inputShapeColor').value,
                        'cx': itemModal.querySelector('#inputPositionX').value,
                        'cy': itemModal.querySelector('#inputPositionY').value,
                        'transform': 'translate(0 0)',
                        'fill-opacity': Number(itemModal.querySelector('#fillCircleCheckbox').checked),
                        'fill': itemModal.querySelector('#inputFillShapeColor').value,
                      });

                      mouseEvent.target.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;

                      var _foundIndex = findElementHTMLById(mouseEvent.target.id);
                      if (_foundIndex != -1) elementHTML[_foundIndex].properties[0].value = mouseEvent.target.hiddenWhen;

                      for (draggableItem of draggableObjects) {
                        if (draggableItem.element.id == elementDOM.id) {
                          draggableObjects.splice(draggableObjects.indexOf(draggableItem), 1);
                          break;
                        }
                      }
                      draggable = new PlainDraggable(elementDOM, { leftTop: true });
                      draggable.autoScroll = true;
                      draggable.containment = document.getElementById('mainPage1');
                      draggableObjects.push(draggable);
                    });

                    $('.btnHiddenWhen').on('click', function (onConditionClickEvent) {
                      $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                        if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                          itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                        }
                      });
                    });
                  });

                  $('#circleModal').one('hide.bs.modal', function (hideEvent) {
                    $('.saveChangeButton').off('click');
                    $('.btnHiddenWhen').off('click');
                  });

                  $('#circleModal').modal();
                });
                break;
              }
              case 'rect': {
                if (!$(elementDOM).attr('rx')) {
                  $(elementDOM).on('dblclick', function (mouseEvent) {
                    var htmlElement = mouseEvent.target.getBoundingClientRect();
                    var svgOffset = mouseEvent.target.parentNode.getBoundingClientRect();
                    $('#rectModal').one('show.bs.modal', function (showEvent) {
                      var elemWidth = parseInt($(elementDOM).attr('width'), 10),
                        elemHeight = parseInt($(elementDOM).attr('height'), 10),
                        elemPositionX = Math.round(htmlElement.left - svgOffset.left),
                        elemPositionY = Math.round(htmlElement.top - svgOffset.top),
                        elemLineWidth = $(elementDOM).attr('stroke-width'),
                        elemColor = $(elementDOM).attr('stroke');


                      var itemModal = $('#rectModal')[0];

                      itemModal.querySelector('#inputWidth').value = elemWidth;
                      itemModal.querySelector('#inputHeight').value = elemHeight;
                      itemModal.querySelector('#inputPositionX').value = elemPositionX;
                      itemModal.querySelector('#inputPositionY').value = elemPositionY;
                      itemModal.querySelector('#inputShapeLineWidth').value = elemLineWidth;
                      itemModal.querySelector('#inputLineColor').value = elemColor;
                      itemModal.querySelector('#fillRectCheckbox').checked = $(elementDOM).attr('fill-opacity') != 0 || $(elementDOM).attr('fill-opacity') != '0';
                      itemModal.querySelector('#inputFillRectColor').value = $(elementDOM).attr('fill');
                      if (mouseEvent.target.hiddenWhen) {
                        itemModal.querySelector('.inputHiddenWhen').value = mouseEvent.target.hiddenWhen;
                      }
                      else {
                        itemModal.querySelector('.inputHiddenWhen').value = '';
                      }

                      $('.saveChangeButton').on('click', function (event) {
                        $(elementDOM).attr({
                          'stroke-width': itemModal.querySelector('#inputShapeLineWidth').value,
                          'stroke': itemModal.querySelector('#inputLineColor').value,
                          'width': itemModal.querySelector('#inputWidth').value,
                          'height': itemModal.querySelector('#inputHeight').value,
                          'x': itemModal.querySelector('#inputPositionX').value,
                          'y': itemModal.querySelector('#inputPositionY').value,
                          'transform': 'translate(0 0)',
                          'fill-opacity': Number(itemModal.querySelector('#fillRectCheckbox').checked),
                          'fill': itemModal.querySelector('#inputFillRectColor').value,
                        });

                        mouseEvent.target.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;

                        var _foundIndex = findElementHTMLById(mouseEvent.target.id);
                        if (_foundIndex != -1) elementHTML[_foundIndex].properties[0].value = mouseEvent.target.hiddenWhen;

                        for (draggableItem of draggableObjects) {
                          if (draggableItem.element.id == elementDOM.id) {
                            draggableObjects.splice(draggableObjects.indexOf(draggableItem), 1);
                            break;
                          }
                        }
                        draggable = new PlainDraggable(elementDOM, { leftTop: true });
                        draggable.autoScroll = true;
                        draggable.containment = document.getElementById('mainPage1');
                        draggableObjects.push(draggable);
                      });

                      $('.btnHiddenWhen').on('click', function (onConditionClickEvent) {
                        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                            itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                          }
                        });
                      });
                    });

                    $('#rectModal').one('hide.bs.modal', function (hideEvent) {
                      $('.saveChangeButton').off('click');
                      $('.btnHiddenWhen').off('click');
                    });

                    $('#rectModal').modal();
                  });
                  break;
                } else {
                  $(elementDOM).on('dblclick', function (mouseEvent) {
                    var htmlElement = mouseEvent.target.getBoundingClientRect();
                    var svgOffset = mouseEvent.target.parentNode.getBoundingClientRect();
                    $('#roundRectModal').one('show.bs.modal', function (showEvent) {
                      var elemWidth = parseInt($(elementDOM).attr('width'), 10),
                        elemHeight = parseInt($(elementDOM).attr('height'), 10),
                        elemPositionX = Math.round(htmlElement.left - svgOffset.left),
                        elemPositionY = Math.round(htmlElement.top - svgOffset.top),
                        elemRadiusX = parseInt($(elementDOM).attr('rx'), 10),
                        elemRadiusY = parseInt($(elementDOM).attr('ry'), 10),
                        elemLineWidth = $(elementDOM).attr('stroke-width'),
                        elemColor = $(elementDOM).attr('stroke');

                      var itemModal = $('#roundRectModal')[0];

                      itemModal.querySelector('#inputWidth').value = elemWidth;
                      itemModal.querySelector('#inputHeight').value = elemHeight;
                      itemModal.querySelector('#inputPositionX').value = elemPositionX;
                      itemModal.querySelector('#inputPositionY').value = elemPositionY;
                      itemModal.querySelector('#inputRadiusX').value = elemRadiusX;
                      itemModal.querySelector('#inputRadiusY').value = elemRadiusY;
                      itemModal.querySelector('#inputShapeLineWidth').value = elemLineWidth;
                      itemModal.querySelector('#inputShapeColor').value = elemColor;
                      itemModal.querySelector('#fillRoundRectCheckbox').checked = $(elementDOM).attr('fill-opacity') != 0 || $(elementDOM).attr('fill-opacity') != '0';
                      itemModal.querySelector('#inputFillShapeColor').value = $(elementDOM).attr('fill');

                      if (mouseEvent.target.hiddenWhen) {
                        itemModal.querySelector('.inputHiddenWhen').value = mouseEvent.target.hiddenWhen;
                      }
                      else {
                        itemModal.querySelector('.inputHiddenWhen').value = '';
                      }

                      $('.saveChangeButton').on('click', function (event) {
                        $(elementDOM).attr({
                          'stroke-width': itemModal.querySelector('#inputShapeLineWidth').value,
                          'stroke': itemModal.querySelector('#inputShapeColor').value,
                          'width': itemModal.querySelector('#inputWidth').value,
                          'height': itemModal.querySelector('#inputHeight').value,
                          'x': itemModal.querySelector('#inputPositionX').value,
                          'y': itemModal.querySelector('#inputPositionY').value,
                          'rx': itemModal.querySelector('#inputRadiusX').value,
                          'ry': itemModal.querySelector('#inputRadiusY').value,
                          'transform': 'translate(0 0)',
                          'fill-opacity': Number(itemModal.querySelector('#fillRoundRectCheckbox').checked),
                          'fill': itemModal.querySelector('#inputFillShapeColor').value,
                        });

                        mouseEvent.target.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;

                        var _foundIndex = findElementHTMLById(mouseEvent.target.id);
                        if (_foundIndex != -1) elementHTML[_foundIndex].properties[0].value = mouseEvent.target.hiddenWhen;

                        for (draggableItem of draggableObjects) {
                          if (draggableItem.element.id == elementDOM.id) {
                            draggableObjects.splice(draggableObjects.indexOf(draggableItem), 1);
                            break;
                          }
                        }
                        draggable = new PlainDraggable(elementDOM, { leftTop: true });
                        draggable.autoScroll = true;
                        draggable.containment = document.getElementById('mainPage1');
                        draggableObjects.push(draggable);
                      });

                      $('.btnHiddenWhen').on('click', function (onConditionClickEvent) {
                        $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                          if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                            itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                          }
                        });
                      });
                    });

                    $('#roundRectModal').one('hide.bs.modal', function (hideEvent) {
                      $('.saveChangeButton').off('click');
                      $('.btnHiddenWhen').off('click');
                    });

                    $('#roundRectModal').modal();
                  });
                  break;
                }
              }
              case 'polyline': {
                $(elementDOM).on('dblclick', function (mouseEvent) {
                  var htmlElement = mouseEvent.target.getBoundingClientRect();
                  var svgOffset = mouseEvent.target.parentNode.getBoundingClientRect();
                  $('#polylineModal').one('show.bs.modal', function (showEvent) {
                    var elemWidth = $(elementDOM).attr('stroke-width'),
                      elemColor = $(elementDOM).attr('stroke');

                    var itemModal = $('#polylineModal')[0];

                    itemModal.querySelector('#inputWidth').value = elemWidth;
                    itemModal.querySelector('#inputColor').value = elemColor;

                    if (mouseEvent.target.hiddenWhen) {
                      itemModal.querySelector('.inputHiddenWhen').value = mouseEvent.target.hiddenWhen;
                    }
                    else {
                      itemModal.querySelector('.inputHiddenWhen').value = '';
                    }

                    $('.saveChangeButton').on('click', function (event) {
                      $(elementDOM).attr({
                        'stroke-width': itemModal.querySelector('#inputWidth').value,
                        'stroke': itemModal.querySelector('#inputColor').value,
                      });

                      mouseEvent.target.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;

                      var _foundIndex = findElementHTMLById(mouseEvent.target.id);
                      if (_foundIndex != -1) elementHTML[_foundIndex].properties[0].value = mouseEvent.target.hiddenWhen;
                    });

                    $('.btnHiddenWhen').on('click', function (onConditionClickEvent) {
                      $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                        if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                          itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                        }
                      });
                    });
                  });

                  $('#polylineModal').one('hide.bs.modal', function (hideEvent) {
                    $('.saveChangeButton').off('click');
                    $('.btnHiddenWhen').off('click');
                  });

                  $('#polylineModal').modal();
                });
                break;
              }
              case 'polygon': {
                $(elementDOM).on('dblclick', function (mouseEvent) {
                  var htmlElement = mouseEvent.target.getBoundingClientRect();
                  var svgOffset = mouseEvent.target.parentNode.getBoundingClientRect();
                  $('#polygonModal').one('show.bs.modal', function (showEvent) {
                    var elemWidth = $(elementDOM).attr('stroke-width'),
                      elemColor = $(elementDOM).attr('stroke');


                    var itemModal = $('#polygonModal')[0];

                    itemModal.querySelector('#inputShapeLineWidth').value = elemWidth;
                    itemModal.querySelector('#inputShapeColor').value = elemColor;

                    itemModal.querySelector('#fillPolygonCheckbox').checked = $(elementDOM).attr('fill-opacity') != 0 || $(elementDOM).attr('fill-opacity') != '0';
                    itemModal.querySelector('#inputFillShapeColor').value = $(elementDOM).attr('fill');

                    if (mouseEvent.target.hiddenWhen) {
                      itemModal.querySelector('.inputHiddenWhen').value = mouseEvent.target.hiddenWhen;
                    }
                    else {
                      itemModal.querySelector('.inputHiddenWhen').value = '';
                    }

                    $('.saveChangeButton').on('click', function (event) {
                      $(elementDOM).attr({
                        'stroke-width': itemModal.querySelector('#inputShapeLineWidth').value,
                        'stroke': itemModal.querySelector('#inputShapeColor').value,
                        'fill-opacity': Number(itemModal.querySelector('#fillPolygonCheckbox').checked),
                        'fill': itemModal.querySelector('#inputFillShapeColor').value,
                      });

                      mouseEvent.target.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;

                      var _foundIndex = findElementHTMLById(mouseEvent.target.id);
                      if (_foundIndex != -1) elementHTML[_foundIndex].properties[0].value = mouseEvent.target.hiddenWhen;

                    });

                    $('.btnHiddenWhen').on('click', function (onConditionClickEvent) {
                      $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                        if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                          itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                        }
                      });
                    });

                  });

                  $('#polygonModal').one('hide.bs.modal', function (hideEvent) {
                    $('.saveChangeButton').off('click');
                    $('.btnHiddenWhen').off('click');
                  });

                  $('#polygonModal').modal();
                });
                break;
              }
            }
            break;
          }
          case 'input': {
            elementDOM.style.cursor = 'pointer';  //Fix pointer when mouse over INPUT
            shapes.push(elementDOM);
            $(elementDOM).on('dblclick', function (mouseEvent) {
              $('#inputModal').one('show.bs.modal', function (showEvent) {
                var elemStyle = mouseEvent.target.style;
                var elemId = mouseEvent.target.id;
                var elemBound = mouseEvent.target.getBoundingClientRect();

                var elemWidth = parseInt(elemStyle.width, 10),
                  elemHeight = Math.round(elemBound.bottom - elemBound.top);
                elemType = mouseEvent.target.type;

                var itemModal = $('#inputModal')[0];
                itemModal.querySelector('.inputWidth').value = elemWidth;
                itemModal.querySelector('.inputHeight').value = elemHeight;
                itemModal.querySelector('.inputType').value = elemType;

                if (mouseEvent.target.tag) {
                  itemModal.querySelector('.inputTag').value = mouseEvent.target.tag;
                }
                else {
                  itemModal.querySelector('.inputTag').value = '';
                }

                if (mouseEvent.target.disableWhen) {
                  itemModal.querySelector('.inputDisableWhen').value = mouseEvent.target.disableWhen;
                }
                else {
                  itemModal.querySelector('.inputDisableWhen').value = '';
                }

                $('.saveChangeButton').on('click', function (event) {
                  document.getElementById(elemId).style.width = itemModal.querySelector('.inputWidth').value + 'px';
                  document.getElementById(elemId).style.height = itemModal.querySelector('.inputHeight').value + 'px';
                  mouseEvent.target.tag = itemModal.querySelector('.inputTag').value;
                  mouseEvent.target.disableWhen = itemModal.querySelector('.inputDisableWhen').value;
                  mouseEvent.target.type = itemModal.querySelector('.inputType').value;

                  var _foundIndex = findElementHTMLById(elemId);
                  if (_foundIndex != -1) {
                    elementHTML[_foundIndex].properties[0].value = mouseEvent.target.tag;
                    elementHTML[_foundIndex].properties[1].value = mouseEvent.target.disableWhen;
                  }
                });

                $('.btnTag').on('click', function (onConditionClickEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputTag').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

                $('.btnDisableWhen').on('click', function (onConditionClickEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputDisableWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

              });

              $('#inputModal').one('hide.bs.modal', function (hideEvent) {
                $('.saveChangeButton').off('click');
                $('.btnTag').off('click');
                $('.btnDisableWhen').off('click');
              });

              $('#inputModal').modal();
            });
            break;
          }
          case 'text': {
            shapes.push(elementDOM);
            // if (isMainpage) elementDOM.classList.add('draggable');
            // else elementDOM.classList.add('draggable2');
            $(elementDOM).on('dblclick', function (mouseEvent) {
              $('#textModal').one('show.bs.modal', function (showEvent) {
                var elemStyle = mouseEvent.target.style;
                var elemId = mouseEvent.target.id;
                var elemFontsize = parseInt(elemStyle.fontSize, 10).toString(),
                  elemFontstyle = elemStyle.fontStyle,
                  elemFontFamily = elemStyle.fontFamily.replace(/["']/g, ""), //Replace double quote from font with WHITESPACE
                  elemColor = rgb2hex(elemStyle.color),
                  elemText = mouseEvent.target.innerText;

                var itemModal = $('#textModal')[0];

                itemModal.querySelector('#inputFontSize').value = elemFontsize;
                itemModal.querySelector('#fontPicker').value = elemFontFamily;
                itemModal.querySelector('#fontStyleForm').value = elemFontstyle;
                itemModal.querySelector('#inputTextColor').value = elemColor;
                itemModal.querySelector('#textContent').value = elemText;
                if (mouseEvent.target.hiddenWhen) {
                  itemModal.querySelector('.inputHiddenWhen').value = mouseEvent.target.hiddenWhen;
                }
                else {
                  itemModal.querySelector('.inputHiddenWhen').value = '';
                }


                $('.saveChangeButton').on('click', function (event) {
                  document.getElementById(elemId).style.fontSize = itemModal.querySelector('#inputFontSize').value + 'px';
                  document.getElementById(elemId).style.fontFamily = itemModal.querySelector('#fontPicker').value;
                  document.getElementById(elemId).style.color = itemModal.querySelector('#inputTextColor').value;
                  document.getElementById(elemId).style.fontStyle = itemModal.querySelector('#fontStyleForm').value;
                  document.getElementById(elemId).innerHTML = itemModal.querySelector('#textContent').value;
                  mouseEvent.target.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;

                  var _foundIndex = findElementHTMLById(elemId);
                  if (_foundIndex != -1) elementHTML[_foundIndex].properties[0].value = mouseEvent.target.hiddenWhen;
                });

                $('.btnHiddenWhen').on('click', function (onConditionClickEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

              });

              $('#textModal').one('hide.bs.modal', function (hideEvent) {
                $('.saveChangeButton').off('click');
                $('.btnHiddenWhen').off('click');
              });

              $('#textModal').modal();
            });
            break;
          }
          case 'img': {
            shapes.push(elementDOM);
            // if (isMainpage) elementDOM.classList.add('draggable');
            // else elementDOM.classList.add('draggable2');
            $(elementDOM).on('dblclick', function (mouseEvent) {
              $('#imageModal').one('show.bs.modal', function (showEvent) {

                var elem = document.getElementById(mouseEvent.target.id);

                var elemStyle = elem.style;

                var elemWidth = parseInt(elemStyle.width, 10),
                  elemHeight = parseInt(elemStyle.height, 10),
                  elemPositionX = parseInt(elemStyle.left, 10),
                  elemPositionY = parseInt(elemStyle.top, 10),
                  elemSource = elem.src;

                var itemModal = document.getElementById('imageModal');
                itemModal.querySelector('#inputWidth').value = elemWidth;
                itemModal.querySelector('#inputHeight').value = elemHeight;
                itemModal.querySelector('#inputPositionX').value = elemPositionX;
                itemModal.querySelector('#inputPositionY').value = elemPositionY;
                itemModal.querySelector('.inputImageSource').value = elemSource;

                if (mouseEvent.target.hiddenWhen) {
                  itemModal.querySelector('.inputHiddenWhen').value = mouseEvent.target.hiddenWhen;
                }
                else {
                  itemModal.querySelector('.inputHiddenWhen').value = '';
                }

                //Button save 
                $('.saveChangeButton').on('click', function (event) {
                  elemStyle.width = imageModal.querySelector('#inputWidth').value + 'px';
                  elemStyle.height = imageModal.querySelector('#inputHeight').value + 'px';
                  elemStyle.left = imageModal.querySelector('#inputPositionX').value + 'px';
                  elemStyle.top = imageModal.querySelector('#inputPositionY').value + 'px';
                  mouseEvent.target.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;
                  mouseEvent.target.src = itemModal.querySelector('.inputImageSource').value;

                  var _foundIndex = findElementHTMLById(mouseEvent.target.id);
                  if (_foundIndex != -1) elementHTML[_foundIndex].properties[0].value = mouseEvent.target.hiddenWhen;

                });

                $('.btnHiddenWhen').on('click', function (onConditionClickEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

              });

              $('#imageModal').one('hide.bs.modal', function (hideEvent) {
                $('.saveChangeButton').off('click');
                $('.btnHiddenWhen').off('click');
                $('.btnSelect').off('click');
              });

              $('#chooseImageModal').one('show.bs.modal', function (event) {
                $('.btnSelect').on('click', function (btnEvent) {
                  if ($("[name=symbol]").is(":checked"))
                    $('.inputImageSource').val($('[name=symbol]:checked').val());
                  $('#chooseImageModal').modal('toggle');
                });
              });

              $('#imageModal').modal();
            });

            break;
          }
          case 'displayvalue': {
            shapes.push(elementDOM);
            // if (isMainpage) elementDOM.classList.add('draggable');
            // else elementDOM.classList.add('draggable2');
            $(elementDOM).on('dblclick', function (mouseEvent) {
              $('#displayValueModal').one('show.bs.modal', function (showEvent) {
                var elemStyle = mouseEvent.target.style;
                var elemId = mouseEvent.target.id;
                var elemFontsize = parseInt(elemStyle.fontSize, 10).toString(),
                  elemFontstyle = elemStyle.fontStyle,
                  elemFontFamily = elemStyle.fontFamily.replace(/["']/g, ""), //Replace double quote from font with WHITESPACE
                  elemColor = rgb2hex(elemStyle.color),
                  elemText = mouseEvent.target.innerText;
                elemFormat = mouseEvent.target.format;

                var itemModal = $('#displayValueModal')[0];

                itemModal.querySelector('#inputFontSize').value = elemFontsize;
                itemModal.querySelector('#fontPicker').value = elemFontFamily;
                itemModal.querySelector('#fontStyleForm').value = elemFontstyle;
                itemModal.querySelector('#inputTextColor').value = elemColor;
                itemModal.querySelector('#textContent').value = elemText;
                if (elemFormat) itemModal.querySelector('#displayFormat').value = elemFormat;
                else itemModal.querySelector('#displayFormat').value = 3;

                if (mouseEvent.target.hiddenWhen) {
                  itemModal.querySelector('.inputHiddenWhen').value = mouseEvent.target.hiddenWhen;
                }
                else {
                  itemModal.querySelector('.inputHiddenWhen').value = '';
                }

                if (mouseEvent.target.tag) {
                  itemModal.querySelector('.inputTag').value = mouseEvent.target.tag;
                }
                else {
                  itemModal.querySelector('.inputTag').value = '';
                }

                $('.saveChangeButton').on('click', function (event) {
                  document.getElementById(elemId).style.fontSize = itemModal.querySelector('#inputFontSize').value + 'px';
                  document.getElementById(elemId).style.fontFamily = itemModal.querySelector('#fontPicker').value;
                  document.getElementById(elemId).style.color = itemModal.querySelector('#inputTextColor').value;
                  document.getElementById(elemId).style.fontStyle = itemModal.querySelector('#fontStyleForm').value;
                  document.getElementById(elemId).innerHTML = itemModal.querySelector('#textContent').value;
                  mouseEvent.target.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;
                  mouseEvent.target.tag = itemModal.querySelector('.inputTag').value;
                  mouseEvent.target.format = itemModal.querySelector('#displayFormat').value;

                  var _foundIndex = findElementHTMLById(elemId);
                  if (_foundIndex != -1) {
                    elementHTML[_foundIndex].properties[0].value = mouseEvent.target.tag;
                    elementHTML[_foundIndex].properties[1].value = mouseEvent.target.format;
                    elementHTML[_foundIndex].properties[2].value = mouseEvent.target.hiddenWhen;
                  }

                });

                $('.btnTag').on('click', function (onConditionClickEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputTag').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

                $('.btnHiddenWhen').on('click', function (onConditionClickEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

              });

              $('#displayValueModal').one('hide.bs.modal', function (hideEvent) {
                $('.saveChangeButton').off('click');
                $('.btnTag').off('click');
                $('.btnHiddenWhen').off('click');
              });

              $('#displayValueModal').modal();
            });
            break;
          }
          case 'button': {
            shapes.push(elementDOM);
            // if (isMainpage) elementDOM.classList.add('draggable');
            // else elementDOM.classList.add('draggable2');
            $(elementDOM).on('dblclick', function (mouseEvent) {
              $('#buttonModal').one('show.bs.modal', function (showEvent) {
                var elemStyle = mouseEvent.target.style;
                var elemId = mouseEvent.target.id;

                var htmlElement = mouseEvent.target.getBoundingClientRect();
                var svgOffset = mouseEvent.target.parentNode.getBoundingClientRect();

                var elemFontsize = parseInt(elemStyle.fontSize, 10).toString(),
                  elemFontstyle = elemStyle.fontStyle,
                  elemFontFamily = elemStyle.fontFamily.replace(/["']/g, ""), //Replace double quote from font with WHITESPACE
                  elemColor = rgb2hex(elemStyle.color),
                  elemBackground = rgb2hex(elemStyle.background),
                  elemWidth = Math.round(htmlElement.right - htmlElement.left),
                  elemHeight = Math.round(htmlElement.bottom - htmlElement.top),
                  elemPositionX = Math.round(htmlElement.left - svgOffset.left),
                  elemPositionY = Math.round(htmlElement.top - svgOffset.top),
                  elemText = mouseEvent.target.innerText;


                var itemModal = $('#buttonModal')[0];

                itemModal.querySelector('#inputFontSize').value = elemFontsize;
                itemModal.querySelector('#fontPicker').value = elemFontFamily;
                itemModal.querySelector('#fontStyleForm').value = elemFontstyle;
                itemModal.querySelector('#inputTextColor').value = elemColor;
                itemModal.querySelector('#inputBackgroundColor').value = elemBackground;
                itemModal.querySelector('#textContent').value = elemText;
                itemModal.querySelector('#inputWidth').value = elemWidth;
                itemModal.querySelector('#inputHeight').value = elemHeight;
                itemModal.querySelector('#inputPositionX').value = elemPositionX;
                itemModal.querySelector('#inputPositionY').value = elemPositionY;

                if (mouseEvent.target.command) {
                  itemModal.querySelector('.inputCommand').value = mouseEvent.target.command;
                }
                else {
                  itemModal.querySelector('.inputCommand').value = '';
                }

                if (mouseEvent.target.disableWhen) {
                  itemModal.querySelector('.inputDisableWhen').value = mouseEvent.target.disableWhen;
                }
                else {
                  itemModal.querySelector('.inputDisableWhen').value = '';
                }

                $('.saveChangeButton').on('click', function (event) {
                  document.getElementById(elemId).style.fontSize = itemModal.querySelector('#inputFontSize').value + 'px';
                  document.getElementById(elemId).style.fontFamily = itemModal.querySelector('#fontPicker').value;
                  document.getElementById(elemId).style.color = itemModal.querySelector('#inputTextColor').value;
                  document.getElementById(elemId).style.background = itemModal.querySelector('#inputBackgroundColor').value;
                  document.getElementById(elemId).style.fontStyle = itemModal.querySelector('#fontStyleForm').value;
                  document.getElementById(elemId).innerHTML = itemModal.querySelector('#textContent').value;
                  document.getElementById(elemId).style.left = itemModal.querySelector('#inputPositionX').value + 'px';
                  document.getElementById(elemId).style.top = Number(itemModal.querySelector('#inputPositionY').value) + 43 + 'px';
                  document.getElementById(elemId).style.width = itemModal.querySelector('#inputWidth').value + 'px';
                  document.getElementById(elemId).style.height = itemModal.querySelector('#inputHeight').value + 'px';
                  mouseEvent.target.command = itemModal.querySelector('.inputCommand').value;
                  mouseEvent.target.disableWhen = itemModal.querySelector('.inputDisableWhen').value;

                  var _foundIndex = findElementHTMLById(elemId);
                  if (_foundIndex != -1) {
                    elementHTML[_foundIndex].properties[0].value = mouseEvent.target.command;
                    elementHTML[_foundIndex].properties[1].value = mouseEvent.target.disableWhen;
                  }

                  // var html = document.getElementById(elemId);
                  // for (draggableItem of draggableObjects) {
                  //   if (draggableItem.element.id == html.id) {
                  //     draggableObjects.splice(draggableObjects.indexOf(draggableItem), 1);
                  //     break;
                  //   }
                  // }
                  // draggable = new PlainDraggable(html, { leftTop: true });
                  // draggable.autoScroll = true;
                  // draggable.containment = document.getElementById('mainPage1');
                  // draggableObjects.push(draggable);
                });

                $('.btnCommand').on('click', function (onConditionClickEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputCommand').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

                $('.btnDisableWhen').on('click', function (onConditionClickEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputDisableWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

              });

              $('#buttonModal').one('hide.bs.modal', function (hideEvent) {
                $('.saveChangeButton').off('click');
                $('.btnCommand').off('click');
                $('.btnDisableWhen').off('click');
              });

              $('#buttonModal').modal();
            });
            break;
          }
          case 'slider': {
            shapes.push(elementDOM);
            // if (isMainpage) elementDOM.classList.add('draggable');
            // else elementDOM.classList.add('draggable2');
            $(elementDOM).on('dblclick', function (mouseEvent) {
              $('#sliderModal').one('show.bs.modal', function (showEvent) {

                var elem = document.getElementById(mouseEvent.target.id);
                var elemStyle = elem.style;

                var elemWidth = parseInt(elemStyle.width, 10);

                var itemModal = $('#sliderModal')[0];
                itemModal.querySelector('.inputWidth').value = elemWidth;

                if (mouseEvent.target.tag) {
                  itemModal.querySelector('.inputValue').value = mouseEvent.target.tag;
                }
                else {
                  itemModal.querySelector('.inputValue').value = '';
                }

                if (mouseEvent.target.minTag) {
                  itemModal.querySelector('.inputMinTag').value = mouseEvent.target.minTag;
                }
                else {
                  itemModal.querySelector('.inputMinTag').value = '';
                }

                if (mouseEvent.target.minValue) {
                  itemModal.querySelector('.inputMinValue').value = mouseEvent.target.minValue;
                }
                else {
                  itemModal.querySelector('.inputMinValue').value = '';
                }

                if (mouseEvent.target.maxTag) {
                  itemModal.querySelector('.inputMaxTag').value = mouseEvent.target.maxTag;
                }
                else {
                  itemModal.querySelector('.inputMaxTag').value = '';
                }

                if (mouseEvent.target.maxValue) {
                  itemModal.querySelector('.inputMaxValue').value = mouseEvent.target.maxValue;
                }
                else {
                  itemModal.querySelector('.inputMaxValue').value = '';
                }

                if (mouseEvent.target.disableWhen) {
                  itemModal.querySelector('.inputDisableWhen').value = mouseEvent.target.disableWhen;
                }
                else {
                  itemModal.querySelector('.inputDisableWhen').value = '';
                }

                //Button save 
                $('.saveChangeButton').on('click', function (event) {
                  elemStyle.width = itemModal.querySelector('.inputWidth').value + 'px';
                  mouseEvent.target.tag = itemModal.querySelector('.inputValue').value;
                  mouseEvent.target.minTag = itemModal.querySelector('.inputMinTag').value;
                  mouseEvent.target.minValue = itemModal.querySelector('.inputMinValue').value;
                  mouseEvent.target.maxTag = itemModal.querySelector('.inputMaxTag').value;
                  mouseEvent.target.maxValue = itemModal.querySelector('.inputMaxValue').value;
                  mouseEvent.target.disableWhen = itemModal.querySelector('.inputDisableWhen').value;

                  if (itemModal.querySelector('.inputMinTag').value)
                    mouseEvent.target.isMinTag = true;
                  else mouseEvent.target.isMinTag = false;

                  if (itemModal.querySelector('.inputMaxTag').value)
                    mouseEvent.target.isMaxTag = true;
                  else mouseEvent.target.isMaxTag = false;

                  var _foundIndex = findElementHTMLById(mouseEvent.target.id);
                  if (_foundIndex != -1) {
                    elementHTML[_foundIndex].properties[0].value = mouseEvent.target.tag;
                    elementHTML[_foundIndex].properties[1].value = mouseEvent.target.minTag;
                    elementHTML[_foundIndex].properties[2].value = mouseEvent.target.minValue;
                    elementHTML[_foundIndex].properties[3].value = mouseEvent.target.maxTag;
                    elementHTML[_foundIndex].properties[4].value = mouseEvent.target.maxValue;
                    elementHTML[_foundIndex].properties[5].value = mouseEvent.target.isMinTag;
                    elementHTML[_foundIndex].properties[6].value = mouseEvent.target.isMaxTag;
                    elementHTML[_foundIndex].properties[7].value = mouseEvent.target.disableWhen;
                  }
                });

                //Browse button
                $('.btnValue').on('click', function (onConditionClickEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputValue').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

                $('.btnMinTag').on('click', function (onConditionClickEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputMinTag').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

                $('.btnMaxTag').on('click', function (onConditionClickEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputMaxTag').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

                $('.btnDisableWhen').on('click', function (onConditionClickEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputDisableWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

              });

              $('#sliderModal').one('hide.bs.modal', function (hideEvent) {
                $('.saveChangeButton').off('click');
                $('.btnValue').off('click');
                $('.btnMinTag').off('click');
                $('.btnMaxTag').off('click');
                $('.btnDisableWhen').off('click');
              });

              $('#sliderModal').modal();
            });
            break;
          }
          case 'verticalslider': {
            var min, max, height;
            if (element.properties[5].value) min = eval(element.properties[1].value);
            else if (element.properties[2].value) min = element.properties[2].value;
            else {
              min = 0;
              elementDOM.minValue = min;
            }

            if (element.properties[6].value) max = eval(element.properties[3].value);
            else if (element.properties[4].value) max = element.properties[4].value;
            else {
              max = 100;
              elementDOM.maxValue = max;
            }

            console.log('Min: ', min);
            console.log('Max: ', max);

            height = $(elementDOM).siblings('.slider')[0].style.height;

            var htmlObj = document.getElementById(elementDOM.id).cloneNode(true);
            htmlObj.min = min;
            htmlObj.max = max;
            htmlObj.minValue = elementDOM.minValue;
            htmlObj.maxValue = elementDOM.maxValue;
            var topDiv = elementDOM.parentNode.style.top;
            var leftDiv = elementDOM.parentNode.style.left;
            console.log('Vertical slider tag: ', htmlObj.tag);
            //Remove current slider
            $(elementDOM.parentNode).remove();

            //Create new slider
            var verticalSliderDiv = document.createElement('div');
            verticalSliderDiv.style.position = 'absolute';
            verticalSliderDiv.style.top = topDiv;
            verticalSliderDiv.style.left = leftDiv;
            verticalSliderDiv.append(htmlObj);
            $('#mainPage1').append(verticalSliderDiv);
            //Create vertical slider
            $(htmlObj).bootstrapSlider({
              min: Number(min),
              max: Number(max),
              value: (Number(min) + Number(max)) / 2,
              orientation: 'vertical',
              tooltip_position: 'left',
              reversed: true,
            });
            $(htmlObj).siblings('.slider')[0].style.height = height;
            fixTooltip(htmlObj.id);
            shapes.push(htmlObj);
            $(htmlObj).bootstrapSlider('disable');

            //Re-init HTML properties

            for (j = 0; j < element.properties.length; j++) {
              htmlObj[element.properties[j].name] = element.properties[j].value;
            }
            // if (isMainpage) elementDOM.classList.add('draggable');
            // else elementDOM.classList.add('draggable2');
            $(htmlObj.parentNode).on('dblclick', function (mouseEvent) {
              var elem = $(mouseEvent.target).closest('.slider')[0];
              $('#verticalSliderModal').one('show.bs.modal', function (showEvent) {

                var elemHeight = elem.style.height;
                if (elemHeight) elemHeight = parseInt(elemHeight, 10);

                var _input = $(elem).siblings('input')[0];

                var itemModal = $('#verticalSliderModal')[0];
                itemModal.querySelector('.inputWidth').value = elemHeight;

                if (_input.tag) {
                  itemModal.querySelector('.inputValue').value = _input.tag;
                }
                else {
                  itemModal.querySelector('.inputValue').value = '';
                }

                if (_input.minTag) {
                  itemModal.querySelector('.inputMinTag').value = _input.minTag;
                }
                else {
                  itemModal.querySelector('.inputMinTag').value = '';
                }

                if (_input.minValue) {
                  itemModal.querySelector('.inputMinValue').value = _input.minValue;
                }
                else {
                  itemModal.querySelector('.inputMinValue').value = '';
                }

                if (_input.maxTag) {
                  itemModal.querySelector('.inputMaxTag').value = _input.maxTag;
                }
                else {
                  itemModal.querySelector('.inputMaxTag').value = '';
                }

                if (_input.maxValue) {
                  itemModal.querySelector('.inputMaxValue').value = _input.maxValue;
                }
                else {
                  itemModal.querySelector('.inputMaxValue').value = '';
                }

                if (_input.disableWhen) {
                  itemModal.querySelector('.inputDisableWhen').value = _input.disableWhen;
                }
                else {
                  itemModal.querySelector('.inputDisableWhen').value = '';
                }

                //Button save 
                $('.saveChangeButton').on('click', function (event) {
                  elem.style.height = itemModal.querySelector('.inputWidth').value + 'px';
                  _input.tag = itemModal.querySelector('.inputValue').value;
                  _input.minTag = itemModal.querySelector('.inputMinTag').value;
                  _input.minValue = itemModal.querySelector('.inputMinValue').value;
                  _input.maxTag = itemModal.querySelector('.inputMaxTag').value;
                  _input.maxValue = itemModal.querySelector('.inputMaxValue').value;
                  _input.disableWhen = itemModal.querySelector('.inputDisableWhen').value;

                  if (itemModal.querySelector('.inputMinTag').value)
                    _input.isMinTag = true;
                  else _input.isMinTag = false;

                  if (itemModal.querySelector('.inputMaxTag').value)
                    _input.isMaxTag = true;
                  else _input.isMaxTag = false;

                  var _foundIndex = findElementHTMLById(_input.id);
                  if (_foundIndex != -1) {
                    elementHTML[_foundIndex].properties[0].value = _input.tag;
                    elementHTML[_foundIndex].properties[1].value = _input.minTag;
                    elementHTML[_foundIndex].properties[2].value = _input.minValue;
                    elementHTML[_foundIndex].properties[3].value = _input.maxTag;
                    elementHTML[_foundIndex].properties[4].value = _input.maxValue;
                    elementHTML[_foundIndex].properties[5].value = _input.isMinTag;
                    elementHTML[_foundIndex].properties[6].value = _input.isMaxTag;
                    elementHTML[_foundIndex].properties[7].value = _input.disableWhen;
                  }
                });

                //Browse button
                $('.btnValue').on('click', function (onConditionClickEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputValue').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

                $('.btnMinTag').on('click', function (onConditionClickEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputMinTag').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

                $('.btnMaxTag').on('click', function (onConditionClickEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputMaxTag').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

                $('.btnDisableWhen').on('click', function (onConditionClickEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputDisableWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

              });

              $('#verticalSliderModal').one('hide.bs.modal', function (hideEvent) {
                $('.saveChangeButton').off('click');
                $('.btnValue').off('click');
                $('.btnMinTag').off('click');
                $('.btnMaxTag').off('click');
                $('.btnDisableWhen').off('click');
              });

              $('#verticalSliderModal').modal();
            });

            break;
          }
          case 'progressbar': {
            shapes.push(elementDOM);
            // if (isMainpage) elementDOM.classList.add('draggable');
            // else elementDOM.classList.add('draggable2');
            $(elementDOM).on('dblclick', function (mouseEvent) {
              $('#progressBarModal').one('show.bs.modal', function (showEvent) {

                var selectedItem = mouseEvent.target;
                var elemWidth, elemHeight;
                var progressElement;
                var isHideLabel = false;
                var isRawValue = false;

                if (selectedItem.id) { //Progress is chosen
                  progressElement = selectedItem;
                  elemWidth = parseInt(selectedItem.style.width, 10);
                  elemHeight = Math.round(selectedItem.getBoundingClientRect().bottom - selectedItem.getBoundingClientRect().top);
                }
                else { //Bar is chosen
                  progressElement = selectedItem.parentNode;
                  elemWidth = parseInt(selectedItem.parentNode.style.width, 10);
                  elemHeight = Math.round(selectedItem.getBoundingClientRect().bottom - selectedItem.getBoundingClientRect().top);
                }
                isHideLabel = progressElement.isHideLabel;
                isRawValue = progressElement.isRawValue;

                var itemModal = $('#progressBarModal')[0];
                itemModal.querySelector('.inputWidth').value = elemWidth;
                itemModal.querySelector('.inputHeight').value = elemHeight;
                itemModal.querySelector('#hideLabelCheckbox').checked = isHideLabel;
                itemModal.querySelector('#rawValueCheckbox').checked = isRawValue;

                if (progressElement.tag) {
                  itemModal.querySelector('.inputValue').value = progressElement.tag;
                }
                else {
                  itemModal.querySelector('.inputValue').value = '';
                }

                if (progressElement.minTag) {
                  itemModal.querySelector('.inputMinTag').value = progressElement.minTag;
                }
                else {
                  itemModal.querySelector('.inputMinTag').value = '';
                }

                if (progressElement.minValue) {
                  itemModal.querySelector('.inputMinValue').value = progressElement.minValue;
                }
                else {
                  itemModal.querySelector('.inputMinValue').value = '';
                }

                if (progressElement.maxTag) {
                  itemModal.querySelector('.inputMaxTag').value = progressElement.maxTag;
                }
                else {
                  itemModal.querySelector('.inputMaxTag').value = '';
                }

                if (progressElement.maxValue) {
                  itemModal.querySelector('.inputMaxValue').value = progressElement.maxValue;
                }
                else {
                  itemModal.querySelector('.inputMaxValue').value = '';
                }

                if (progressElement.hiddenWhen) {
                  itemModal.querySelector('.inputHiddenWhen').value = progressElement.hiddenWhen;
                }
                else {
                  itemModal.querySelector('.inputHiddenWhen').value = '';
                }


                //Button save 
                $('.saveChangeButton').on('click', function (event) {
                  if (selectedItem.id) { //Progress is chosen
                    selectedItem.style.width = itemModal.querySelector('.inputWidth').value + 'px';
                    selectedItem.style.height = itemModal.querySelector('.inputHeight').value + 'px';
                  }
                  else {  //Bar is chosen
                    selectedItem.parentNode.style.width = itemModal.querySelector('.inputWidth').value + 'px';
                    selectedItem.parentNode.style.height = itemModal.querySelector('.inputHeight').value + 'px';
                  }

                  progressElement.tag = itemModal.querySelector('.inputValue').value;
                  progressElement.minTag = itemModal.querySelector('.inputMinTag').value;
                  progressElement.minValue = itemModal.querySelector('.inputMinValue').value;
                  progressElement.maxTag = itemModal.querySelector('.inputMaxTag').value;
                  progressElement.maxValue = itemModal.querySelector('.inputMaxValue').value;
                  progressElement.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;
                  progressElement.isHideLabel = itemModal.querySelector('#hideLabelCheckbox').checked;
                  progressElement.isRawValue = itemModal.querySelector('#rawValueCheckbox').checked;


                  if (itemModal.querySelector('.inputMinTag').value)
                    progressElement.isMinTag = true;
                  else progressElement.isMinTag = false;

                  if (itemModal.querySelector('.inputMaxTag').value)
                    progressElement.isMaxTag = true;
                  else progressElement.isMaxTag = false;

                  var _bar = $(progressElement).find('.progress-bar')[0];
                  if (progressElement.isHideLabel) _bar.innerText = '';
                  else _bar.innerText = _bar.style.width;

                  var _foundIndex = findElementHTMLById(progressElement.id);
                  if (_foundIndex != -1) {
                    elementHTML[_foundIndex].properties[0].value = progressElement.tag;
                    elementHTML[_foundIndex].properties[1].value = progressElement.minTag;
                    elementHTML[_foundIndex].properties[2].value = progressElement.minValue;
                    elementHTML[_foundIndex].properties[3].value = progressElement.maxTag;
                    elementHTML[_foundIndex].properties[4].value = progressElement.maxValue;
                    elementHTML[_foundIndex].properties[5].value = progressElement.isMinTag;
                    elementHTML[_foundIndex].properties[6].value = progressElement.isMaxTag;
                    elementHTML[_foundIndex].properties[7].value = progressElement.hiddenWhen;
                    elementHTML[_foundIndex].properties[8].value = progressElement.isHideLabel;
                  }
                });

                //Button Value browse tag
                $('.btnValueTag').on('click', function (valueEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputValue').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

                $('.btnMinTag').on('click', function (valueEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputMinTag').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

                $('.btnMaxTag').on('click', function (valueEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputMaxTag').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

                $('.btnHiddenWhen').on('click', function (valueEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

              });

              $('#progressBarModal').one('hide.bs.modal', function (hideEvent) {
                $('.saveChangeButton').off('click');
                $('.btnValueTag').off('click');
                $('.btnMinTag').off('click');
                $('.btnMaxTag').off('click');
                $('.btnHiddenWhen').off('click');
              });

              $('#progressBarModal').modal();
            });
            break;
          }
          case 'verticalprogressbar': {
            shapes.push(elementDOM);
            // if (isMainpage) elementDOM.classList.add('draggable');
            // else elementDOM.classList.add('draggable2');
            $(elementDOM).on('dblclick', function (mouseEvent) {
              $('#verticalProgressBarModal').one('show.bs.modal', function (showEvent) {

                var selectedItem = mouseEvent.target;
                var elemWidth, elemHeight;
                var progressElement;
                var isHideLabel = false;
                var isRawValue = false;

                if (selectedItem.id) { //Progress is chosen
                  progressElement = selectedItem;
                  elemWidth = parseInt(selectedItem.style.width, 10);
                  elemHeight = Math.round(selectedItem.getBoundingClientRect().bottom - selectedItem.getBoundingClientRect().top);
                }
                else { //Bar is chosen
                  progressElement = selectedItem.parentNode;
                  elemWidth = parseInt(selectedItem.parentNode.style.width, 10);
                  elemHeight = Math.round(selectedItem.parentNode.getBoundingClientRect().bottom - selectedItem.parentNode.getBoundingClientRect().top);
                }
                isHideLabel = progressElement.isHideLabel;
                isRawValue = progressElement.isRawValue;

                var itemModal = $('#verticalProgressBarModal')[0];
                itemModal.querySelector('.inputWidth').value = elemWidth;
                itemModal.querySelector('.inputHeight').value = elemHeight;
                itemModal.querySelector('#hideVerticalLabelCheckbox').checked = isHideLabel;
                itemModal.querySelector('#rawVerticalValueCheckbox').checked = isRawValue;

                if (progressElement.tag) {
                  itemModal.querySelector('.inputValue').value = progressElement.tag;
                }
                else {
                  itemModal.querySelector('.inputValue').value = '';
                }

                if (progressElement.minTag) {
                  itemModal.querySelector('.inputMinTag').value = progressElement.minTag;
                }
                else {
                  itemModal.querySelector('.inputMinTag').value = '';
                }

                if (progressElement.minValue) {
                  itemModal.querySelector('.inputMinValue').value = progressElement.minValue;
                }
                else {
                  itemModal.querySelector('.inputMinValue').value = '';
                }

                if (progressElement.maxTag) {
                  itemModal.querySelector('.inputMaxTag').value = progressElement.maxTag;
                }
                else {
                  itemModal.querySelector('.inputMaxTag').value = '';
                }

                if (progressElement.maxValue) {
                  itemModal.querySelector('.inputMaxValue').value = progressElement.maxValue;
                }
                else {
                  itemModal.querySelector('.inputMaxValue').value = '';
                }

                if (progressElement.hiddenWhen) {
                  itemModal.querySelector('.inputHiddenWhen').value = progressElement.hiddenWhen;
                }
                else {
                  itemModal.querySelector('.inputHiddenWhen').value = '';
                }


                //Button save 
                $('.saveChangeButton').on('click', function (event) {
                  if (selectedItem.id) { //Progress is chosen
                    selectedItem.style.width = itemModal.querySelector('.inputWidth').value + 'px';
                    selectedItem.style.height = itemModal.querySelector('.inputHeight').value + 'px';
                  }
                  else {  //Bar is chosen
                    selectedItem.parentNode.style.width = itemModal.querySelector('.inputWidth').value + 'px';
                    selectedItem.parentNode.style.height = itemModal.querySelector('.inputHeight').value + 'px';
                  }

                  progressElement.tag = itemModal.querySelector('.inputValue').value;
                  progressElement.minTag = itemModal.querySelector('.inputMinTag').value;
                  progressElement.minValue = itemModal.querySelector('.inputMinValue').value;
                  progressElement.maxTag = itemModal.querySelector('.inputMaxTag').value;
                  progressElement.maxValue = itemModal.querySelector('.inputMaxValue').value;
                  progressElement.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;
                  progressElement.isHideLabel = itemModal.querySelector('#hideVerticalLabelCheckbox').checked;
                  progressElement.isRawValue = itemModal.querySelector('#rawVerticalValueCheckbox').checked;


                  if (itemModal.querySelector('.inputMinTag').value)
                    progressElement.isMinTag = true;
                  else progressElement.isMinTag = false;

                  if (itemModal.querySelector('.inputMaxTag').value)
                    progressElement.isMaxTag = true;
                  else progressElement.isMaxTag = false;

                  var _bar = $(progressElement).find('.progress-bar')[0];
                  if (progressElement.isHideLabel) _bar.innerText = '';
                  else _bar.innerText = _bar.style.width;

                  var _foundIndex = findElementHTMLById(progressElement.id);
                  if (_foundIndex != -1) {
                    elementHTML[_foundIndex].properties[0].value = progressElement.tag;
                    elementHTML[_foundIndex].properties[1].value = progressElement.minTag;
                    elementHTML[_foundIndex].properties[2].value = progressElement.minValue;
                    elementHTML[_foundIndex].properties[3].value = progressElement.maxTag;
                    elementHTML[_foundIndex].properties[4].value = progressElement.maxValue;
                    elementHTML[_foundIndex].properties[5].value = progressElement.isMinTag;
                    elementHTML[_foundIndex].properties[6].value = progressElement.isMaxTag;
                    elementHTML[_foundIndex].properties[7].value = progressElement.hiddenWhen;
                    elementHTML[_foundIndex].properties[8].value = progressElement.isHideLabel;
                    elementHTML[_foundIndex].properties[9].value = progressElement.isRawValue;
                  }
                });

                //Button Value browse tag
                $('.btnValueTag').on('click', function (valueEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputValue').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

                $('.btnMinTag').on('click', function (valueEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputMinTag').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

                $('.btnMaxTag').on('click', function (valueEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputMaxTag').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

                $('.btnHiddenWhen').on('click', function (valueEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

              });

              $('#verticalProgressBarModal').one('hide.bs.modal', function (hideEvent) {
                $('.saveChangeButton').off('click');
                $('.btnValueTag').off('click');
                $('.btnMinTag').off('click');
                $('.btnMaxTag').off('click');
                $('.btnHiddenWhen').off('click');
              });

              $('#verticalProgressBarModal').modal();
            });
            break;
          }
          case 'symbolset': {
            shapes.push(elementDOM);
            // if (isMainpage) elementDOM.classList.add('draggable');
            // else elementDOM.classList.add('draggable2');
            $(elementDOM).on('dblclick', function (mouseEvent) {
              $('#symbolSetModal').one('show.bs.modal', function (showEvent) {

                var elem = document.getElementById(mouseEvent.target.id);
                var elemStyle = elem.style;

                var elemWidth = parseInt(elemStyle.width, 10),
                  elemHeight = parseInt(elemStyle.height, 10),
                  elemPositionX = parseInt(elemStyle.left, 10),
                  elemPositionY = parseInt(elemStyle.top, 10),
                  elemOnSymbol = elem.onSymbol,
                  elemOffSymbol = elem.offSymbol;

                var itemModal = $('#symbolSetModal')[0];
                itemModal.querySelector('.inputWidth').value = elemWidth;
                itemModal.querySelector('.inputHeight').value = elemHeight;
                itemModal.querySelector('.inputPositionX').value = elemPositionX;
                itemModal.querySelector('.inputPositionY').value = elemPositionY;
                itemModal.querySelector('.inputOnImageSource').value = elemOnSymbol;
                itemModal.querySelector('.inputOffImageSource').value = elemOffSymbol;

                if (mouseEvent.target.onCondition) {
                  itemModal.querySelector('.inputOnCondition').value = mouseEvent.target.onCondition;
                }
                else {
                  itemModal.querySelector('.inputOnCondition').value = '';
                }

                if (mouseEvent.target.hiddenWhen) {
                  itemModal.querySelector('.inputHiddenWhen').value = mouseEvent.target.hiddenWhen;
                }
                else {
                  itemModal.querySelector('.inputHiddenWhen').value = '';
                }

                //Button save 
                $('.saveChangeButton').on('click', function (event) {
                  elemStyle.width = itemModal.querySelector('.inputWidth').value + 'px';
                  elemStyle.height = itemModal.querySelector('.inputHeight').value + 'px';
                  elemStyle.left = itemModal.querySelector('.inputPositionX').value + 'px';
                  elemStyle.top = itemModal.querySelector('.inputPositionY').value + 'px';
                  mouseEvent.target.onCondition = itemModal.querySelector('.inputOnCondition').value;
                  mouseEvent.target.hiddenWhen = itemModal.querySelector('.inputHiddenWhen').value;
                  mouseEvent.target.onSymbol = itemModal.querySelector('.inputOnImageSource').value;
                  mouseEvent.target.offSymbol = itemModal.querySelector('.inputOffImageSource').value;
                  mouseEvent.target.src = mouseEvent.target.offSymbol;

                  var _foundIndex = findElementHTMLById(mouseEvent.target.id);
                  if (_foundIndex != -1) {
                    elementHTML[_foundIndex].properties[0].value = mouseEvent.target.onCondition;
                    elementHTML[_foundIndex].properties[1].value = mouseEvent.target.onSymbol;
                    elementHTML[_foundIndex].properties[2].value = mouseEvent.target.offSymbol;
                    elementHTML[_foundIndex].properties[3].value = mouseEvent.target.hiddenWhen;
                  }
                });

                //Browse Tag button
                $('#btnOnCondition').on('click', function (onConditionClickEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputOnCondition').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

                //Browse Tag button
                $('.btnHiddenWhen').on('click', function (onHiddenWhenClickEvent) {
                  $('#tagModal').one('hide.bs.modal', function (modalHideEvent) {
                    if ($('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked')) {
                      itemModal.querySelector('.inputHiddenWhen').value += $('#tagModal')[0].querySelector('input[name="rdoChoseTag"]:checked').value;
                    }
                  });
                });

              });

              $('#symbolSetModal').one('hide.bs.modal', function (hideEvent) {
                $('.saveChangeButton').off('click');
                $('#btnOnCondition').off('click');
                $('.btnHiddenWhen').off('click');
                $('.btnSelect').off('click');
              });

              $('#chooseImageModal').on('show.bs.modal', function (event) {
                var _target = event.relatedTarget.id;
                $('.btnSelect').one('click', function (btnEvent) {
                  if ($("[name=symbol]").is(":checked")) {
                    if (_target == 'btnOnSymbol')
                      $('.inputOnImageSource').val($('[name=symbol]:checked').val());
                    else
                      $('.inputOffImageSource').val($('[name=symbol]:checked').val());
                  }
                  $('#chooseImageModal').modal('hide');
                });
              });

              $('#symbolSetModal').modal();
            });
            break;
          }
        }

      });
      addContextMenu();
    });
  }
}