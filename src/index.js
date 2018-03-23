'use strict';

$(document).ready(function() {
  // clean results in general
  function cleanResults() {
    $('.syncOutput').remove();
    // $('#syncActInfo').html(''); // fades out
  }

  /**
   *  sync process the results from syncing
   */
  function outputResults(response) {
    let responseJSON = JSON.parse(response);

    if (response !== '""') {  // change that weird response!
      $.each(responseJSON.gesResult, function(key, value) {
        console.log('gesResult: ' + key, JSON.stringify( value, null, 2 ));
        if (value.Result === 'negative') {
          $('#results').append('<li class="list-group-item list-group-item-warning syncOutput"><div class="row"><div class="col-md-3">' + value.StartDate + '</div>' +
            '<div class="col-md-2">' + value.Duration.toString().substring(0, 6) + '</div>' +
            '<div class="col-md-2">' + (value.Activity === ""?"-":value.Activity) + '</div>' +
            '<div class="col-md">' + (value.Note === ""?"-":value.Note) + '</div></div>' +
            '<div class="row"><div class="col">' +
            (value.Activity === ""?"<span class=\"badge badge-warning\">no matching projectile package - Timeular only</span>":""  ) +
            (value.Note === ""?"<span class=\"badge badge-warning\">Note missing - not synchronized</span>":"") +
            (value.LimitHit === "yes"?"<span class=\"badge badge-warning\">Package limit hit - not synchronized</span>":"") +
            '</div></div>' + '</li>');
        } else {
          $('#results').append('<li class="list-group-item list-group-item-success syncOutput"><div class="row"><div class="col-md-3">' + value.StartDate + '</div>' +
            '<div class="col-md-2">' + value.Duration.toString().substring(0, 6) + '</div>' +
            '<div class="col-md-2">' + value.Activity + '</div>' +
            '<div class="col-md">' + value.Note + '</div></div></li>');
        }
      });

    } else {
      console.log("nothing to do");
      $('#results').append('<li class="list-group-item list-group-item-success syncOutput"><div class="row"><div class="col">nothing to do' +
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
    cleanResults();
    $('#syncChoiceInfo').html('<span class="badge badge-info">Synchronizing started...</span>').delay(4000).fadeOut(function() {
      $(this).html('');
      $(this).show(); // remove display: none
    });

    $.ajax({
      url: '//localhost:{port}/syncbookings/' + target,
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
    cleanResults();
    $('#syncRangeInfo').html('<span class="badge badge-info">Synchronizing within range started...</span>').delay(4000).fadeOut(function() {
      $(this).html('');
      $(this).show();
    });

    $.ajax({
      url: '//localhost:{port}/syncbookings/' + startDate + '/' + endDate,
      cache: false,
      contentType: false,
      processData: false,
      //data: form_data,
      type: 'get',
      success: function(response, status){
        console.log('Sync bookings with range - response + status: ' + response, status);

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
      url: '//localhost:{port}/syncactivities',
      cache: false,
      contentType: false,
      processData: false,
      //data: form_data,
      type: 'get',
      success: function(response, status){
        console.log(response, status);
        $('#syncActInfo').html('<span class="badge badge-success">Projectile packages sychronized with Timeular activities.</span>').delay(5000).fadeOut(function() {
          $(this).html('');
          $(this).show();
        });
        /*
        .delay(3000).fadeOut(function() {
          $(this).remove();
        }); */
      },
      error : function(error) {
        //show error here
        console.log(error);
        $('#syncActInfo').html('<span class="badge badge-warning">Projectile packages not sychronized with Timeular activities. An Error occured</span>').delay(5000).fadeOut(function() {
          $(this).html('');
          $(this).show();
        });
      }
    });
  });


// master end
});
