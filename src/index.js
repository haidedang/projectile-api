'use strict';

$(document).ready(function() {
  // clean results in general
  function cleanResults() {
    $('#tmp').remove(); // working with duplicate ids is bad practise
    $('#syncInfo').html('');
  }

  /**
   *  sync process the results from syncing
   */
  function outputResults(response) {
    let responseJSON = JSON.parse(response);
    cleanResults();

    if (response !== '""') {  // change that weird response!
      $.each(responseJSON.negResult, function(key, value) {
        console.log(key, JSON.stringify( value, null, 2 ));
        // $('#results').val(key + ' ' + value);
        $('#results').append('<li class="list-group-item list-group-item-warning" id="tmp"><div class="row"><div class="col-md-3">' + value.StartDate + '</div>' +
          '<div class="col-md-2">' + value.Duration.toString().substring(0, 6) + '</div>' +
          '<div class="col-md-2">' + value.Activity + '</div>' +
          '<div class="col-md">' + (value.Note === ""?"<span class=\"badge badge-warning\">Note missing - not synchronized</span>": value.Note) + (value.LimitHit === "yes"?"<span class=\"badge badge-warning\">Package limit hit - not synchronized</span>":"") +'</div></div></li>');
        });

      $.each(responseJSON.posResult, function(key, value) {
        console.log(key, JSON.stringify( value, null, 2 ));
        // $('#results').val(key + ' ' + value);
        $('#results').append('<li class="list-group-item list-group-item-success" id="tmp"><div class="row"><div class="col-md-3">' + value.StartDate + '</div>' +
          '<div class="col-md-2">' + value.Duration.toString().substring(0, 6) + '</div>' +
          '<div class="col-md-2">' + value.Activity + '</div>' +
          '<div class="col-md">' + value.Note + '</div></div></li>');
        });
    } else {
      console.log("nothing to do");
      $('#results').append('<li class="list-group-item list-group-item-success" id="tmp"><div class="row"><div class="col">nothing to do' +
      '</div></div></li>');
    }
  }


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
        console.log('DEBUG: Response: ' + response + ' status: ' + status);

        // output to results div table
        outputResults(response);

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

        // output to results div table
        outputResults(response);

      }
    });
  });

  /**
   *  sync activities
   */
  $('#buttonSyncActivities').click(function () {
    cleanResults();

    $.ajax({
      url: '//localhost:3000/syncactivities',
      cache: false,
      contentType: false,
      processData: false,
      //data: form_data,
      type: 'get',
      success: function(response, status){
        console.log(response, status);
        $('#syncInfo').html('<span class="badge badge-success">Projectile packages sychronized with Timeular activities.</span>').delay(5000).fadeOut(function() {
          $(this).html('');
        });
        /*
        .delay(3000).fadeOut(function() {
          $(this).remove();
        }); */
      },
      error : function(error) {
        //show error here
        console.log(error);
        $('#syncInfo').html('<span class="badge badge-warning">Projectile packages not sychronized with Timeular activities. An Error occured</span>').delay(5000).fadeOut(function() {
          $(this).html('');
        });
      }
    });
  });


// master end
});
