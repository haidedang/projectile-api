'use strict';

$(document).ready(function() {
  // var $jsonGetInfo;

  /**
   *  create initial mandator list for #mandatorList
   */
  function initialList() {
    $.getJSON( "//{{host}}{{basePath}}/editor/getinfo", function( data ) {
      var $selectMandator = $('#mandatorList');
      $selectMandator.find('option').remove();
      $('<option>').val(-1).text('please select').appendTo($selectMandator);
      $.each(data, function(key, value) {
        $('<option>').val(key).text(value.mandator).appendTo($selectMandator);
      });
      var $selectFileList = $('#fileList');
      $selectFileList.find('option').remove();
      $('<option>').val(-1).text('not available').appendTo($('#fileList'));
      $('<option>').val(-1).text('not available').appendTo($('#assetFileList'));
      $jsonGetInfo = data;
    });
  }

  // run initial List when page is loaded
//  initialList();


/*
{ posResult:
   [ { StartDate: '2018-03-14',
       Duration: 3,
       Activity: '2759-62',
       Note: 'TESTING' } ],
  negResult: [] }
*/




  /**
   *  sync today
   */
  $('#buttonSyncToday, #buttonSyncWeek, #buttonSyncMonth').click(function (e) {
    var target = $('#' + this.id).data("target");
    console.log('DEBUG: Sync ' + target);
    //check if target valid?

    $.ajax({
      url: '//localhost:3000/syncbookings/' + target,
      cache: false,
      contentType: false,
      processData: false,
      //data: form_data,
      type: 'get',
      success: function(response, status){
        console.log('DEBUG: Rsponse: ' + response + ' status: ' + status);
        let responseJSON = JSON.parse(response);

        // output to results div table
        $('#tmp').remove(); // working with duplicate ids is bad practise

        if (response !== '""') {  // change that weird response!
          $.each(responseJSON.negResult, function(key, value) {
            console.log(key, JSON.stringify( value, null, 2 ));
            // $('#results').val(key + ' ' + value);
            $('#results').append('<li class="list-group-item list-group-item-warning" id="tmp"><div class="row"><div class="col-2">' + value.StartDate + '</div>' +
            '<div class="col-2">' + value.Duration + '</div>' +
            '<div class="col-2">' + value.Activity + '</div>' +
            '<div class="col"><span class="badge badge-warning">Note missing - cannot be synchronized</span></div></div></li>');
          });
          $.each(responseJSON.posResult, function(key, value) {
            console.log(key, JSON.stringify( value, null, 2 ));
            // $('#results').val(key + ' ' + value);
            $('#results').append('<li class="list-group-item list-group-item-success" id="tmp"><div class="row"><div class="col-2">' + value.StartDate + '</div>' +
            '<div class="col-2">' + value.Duration + '</div>' +
            '<div class="col-2">' + value.Activity + '</div>' +
            '<div class="col">' + value.Note + '</div></div></li>');
          });
        } else {
          console.log("nothing to do");
          $('#results').append('<li class="list-group-item list-group-item-success" id="tmp"><div class="row"><div class="col">nothing to do' +
          '</div></div></li>');
        }

      }
    });
  });

  /**
   *  sync range
   */
  $('#buttonSyncRange').click(function () {
    var startDate = $('#startDate').val();
    var endDate = $('#endDate').val();

    console.log('Sync ' + startDate + ' to ' + endDate);
    //check if target valid?

    $.ajax({
      url: '//localhost:3000/syncbookings/' + startDate + '/' + endDate,
      cache: false,
      contentType: false,
      processData: false,
      //data: form_data,
      type: 'get',
      success: function(response, status){
        console.log('Sync bookings with range: ' + response, status);
        let responseJSON = JSON.parse(response);

        // output to results div table
        $('#tmp').remove(); // working with duplicate ids is bad practise

        if (response !== '""') {  // change that weird response!
          $.each(responseJSON.negResult, function(key, value) {
            console.log(key, JSON.stringify( value, null, 2 ));
            // $('#results').val(key + ' ' + value);
            $('#results').append('<li class="list-group-item list-group-item-warning" id="tmp"><div class="row"><div class="col-2">' + value.StartDate + '</div>' +
            '<div class="col-2">' + value.Duration + '</div>' +
            '<div class="col-2">' + value.Activity + '</div>' +
            '<div class="col"><span class="badge badge-secondary">Note missing - cannot be synchronized</span></div></div></li>');
          });
          $.each(responseJSON.posResult, function(key, value) {
            console.log(key, JSON.stringify( value, null, 2 ));
            // $('#results').val(key + ' ' + value);
            $('#results').append('<li class="list-group-item list-group-item-success" id="tmp"><div class="row"><div class="col-2">' + value.StartDate + '</div>' +
            '<div class="col-2">' + value.Duration + '</div>' +
            '<div class="col-2">' + value.Activity + '</div>' +
            '<div class="col">' + value.Note + '</div></div></li>');
          });
        } else {
          console.log("nothing to do");
          $('#results').append('<li class="list-group-item list-group-item-success" id="tmp"><div class="row"><div class="col">nothing to do' +
          '</div></div></li>');
        }

      }
    });
  });

  /**
   *  sync activities
   */
  $('#buttonSyncActivities').click(function () {
    $.ajax({
      url: '//localhost:3000/syncactivities',
      cache: false,
      contentType: false,
      processData: false,
      //data: form_data,
      type: 'get',
      success: function(response, status){
        console.log(response, status);
/*
        if(status) {
          $('#syncResponse').val('SUCCESS').text('SUCCESS');
        } else {
          $('#syncResponse').val('FAILED').text('FAILED');
        }
*/
      }
    });
  });


// master end
});
