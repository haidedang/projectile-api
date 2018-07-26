'use strict';

$(document).ready(function() {

  // check if projectile server is available and place a badge in case of error
  let projectileStatus = false;

  (function checkProjectileStatus() {
    $.ajax({ url: "//localhost:{port}/projectileStatus",
    cache: false,
    contentType: false,
    processData: false,
    type: 'get',
    success: function(response, status){
      // console.log('DEBUG: projectileStatus: ' + response.projectileStatus);

      projectileStatus = response.projectileStatus;

      if (!response.projectileStatus){
        // set badge
        if (!document.getElementById("headerWarning")) {
          $( '<div class="row" id="headerWarning"><div class="col" id="headerInfoText">' +
          '<span class=\"badge badge-warning\">The projectile server seems to be unreachable. Please check your ' +
          'network connection. Do you have access to the Sevenval network?</span>' +
          '</div></div>' ).insertAfter( "#header" );
        }
      } else {
        $('#headerWarning').remove();
      }
    }, dataType: "json"});
    setTimeout(checkProjectileStatus, 3000);
  })();



  // check if credentials are present in api service or show info box with link to /start to set them
  // stops cycle once creds are present
  (function checkCredsStatus() {
    $.ajax({ url: "//localhost:{port}/credsStatus",
    cache: false,
    contentType: false,
    processData: false,
    type: 'get',
    success: function(response, status){
      console.log('DEBUG: Credential status: ' + response.credsPresent);
      if (!response.credsPresent && projectileStatus){
        // set badge
        if (!document.getElementById("headerInfo")) {
          $( '<div class="col" id="headerInfo">' +
          '<span class=\"badge badge-warning\">No sufficient credentials available, please visit <a ' +
          'href="//localhost:{port}/start">http://localhost:{port}/start</a></span>' +
          '</div>' ).insertAfter( "#headerText" );
        }
        // Setup the next poll recursively, only while credsPresent is false!
        setTimeout(checkCredsStatus, 1000);
      } else {
        $('#headerInfo').remove();
      }
    }, dataType: "json"});
  })();

  // clean results in general
  function cleanResults() {
    $('.syncOutput').remove();
    $('#headerInfo').remove();
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
          // generate Error messages badges
          let errors = '';
          if (value.Errors) {
            $.each(value.Errors, function(key, value) {
              // "message":"Die Daten wurden nicht gespeichert","severity":"Warning"
              console.log(value.severity + ' -> ' + value.message);
              errors = errors + '<span class=\"badge badge-warning text-left\" style=\"white-space: normal\">' + value.severity + ' -> ' + value.message + '</span>';
            });
          }

          $('#results').append('<li class="list-group-item list-group-item-warning syncOutput"><div class="row">' +
          '<div class="col-md-3">' + value.StartDate + '</div>' +
            '<div class="col-md-2">' + value.Duration.toString().substring(0, 6) + '</div>' +
            '<div class="col-md-2">' + (value.Activity === ""?"-":value.Activity) + '</div>' +
            '<div class="col-md">' + (value.Note === ""?"-":value.Note) + '</div></div>' +
            '<div class="row"><div class="col">' +
            (value.Activity === ""?"<span class=\"badge badge-warning\">no matching projectile package - Timeular only</span>":""  ) +
            (value.Note === ""?"<span class=\"badge badge-warning\">Note missing - not synchronized</span>":"") +
            (value.LimitHit === "yes"?"<span class=\"badge badge-warning\">Package limit hit - not synchronized</span>":"") +
            (errors !== ''?errors:"") +
            '</div></div>' + '</li>');
        } else {
          $('#results').append('<li class="list-group-item list-group-item-success syncOutput"><div class="row">' +
            '<div class="col-md-3">' + value.StartDate + '</div>' +
            '<div class="col-md-2">' + value.Duration.toString().substring(0, 6) + '</div>' +
            '<div class="col-md-2">' + value.Activity + '</div>' +
            '<div class="col-md">' + value.Note + '</div></div></li>');
        }
      });

    } else {
      console.log("nothing to do");
      $('#results').append('<li class="list-group-item list-group-item-success syncOutput"><div class="row"><div ' +
      'class="col">nothing to do' +
      '</div></div></li>');
    }
  }

  /**
   *  open modal, set interval
   */
  $('#setSync').click(function () {
    // set interval
    $.ajax({ url: "//localhost:{port}/syncinterval",
    cache: false,
    contentType: false,
    processData: false,
    type: 'get',
    success: function(response, status){
      console.log('DEBUG: retrieved current sync interval value: ' + response + ' status: ' + status);
      if (response){
        $('#syncInterval').val(response);
      }
      // open modal
      $('#setIntervalModal').modal();
    }, dataType: "json"});
  });

  /**
   *  sync today
   */
  $('#buttonSyncToday, #buttonSyncWeek, #buttonSyncMonth').click(function (e) {
    var target = $('#' + this.id).data("target");
    console.log('DEBUG: Sync ' + target);
    //check if target valid?
    cleanResults();
    $('#syncChoiceInfo').html('<span class="badge badge-info">Synchronizing started...</span>');

    $.ajax({
      url: '//localhost:{port}/syncbookings/' + target,
      cache: false,
      contentType: false,
      processData: false,
      //data: form_data,
      type: 'get',
      success: function(response, status){
        console.log('DEBUG: Response: ' + response + ' status: ' + status);

        // fadeout of info badge
        $('#syncChoiceInfo').fadeOut(function() {
          $(this).html('');
          $(this).show();
        });

        // output to results div table
        outputResults(response);
      },
      error : function(error) {
        // foobar handle bad reply
        console.log(error);
        $('#syncChoiceInfo').html('<span class="badge badge-warning">Synchronizing currently not possible...</span>').delay(5000).fadeOut(function() {
          $(this).html('');
          $(this).show();
        });
      }
    });
  });

  /**
   *  sync range
   */
  $('#buttonSyncRange').click(function () {
    var startDate = $('#startDate').val();
    var endDate = $('#endDate').val();

    if (startDate && endDate) {
      console.log('Syncing range from ' + startDate + ' to ' + endDate);
      //check if target valid?
      cleanResults();
      $('#syncRangeInfo').html('<span class="badge badge-info">Synchronizing within range started...</span>');

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

          // fadeout of info badge
          $('#syncRangeInfo').fadeOut(function() {
            $(this).html('');
            $(this).show();
          });
        },
        error : function(error) {
          //show error here
          console.log(error);
          if (error.status !== 504) {
            $('#syncRangeInfo').html('<span class="badge badge-warning">Couldn\'t sync in range from ' + startDate +
            ' to ' + endDate + '</span>').delay(5000).fadeOut(function() {
              $(this).html('');
              $(this).show();
            });
          } else {
            $('#syncRangeInfo').html('<span class="badge badge-warning">Synchronizing currently not possible...</span>').delay(5000).fadeOut(function() {
              $(this).html('');
              $(this).show();
            });
          }
        }
      });
    } else {
      $('#syncRangeInfo').html('<span class="badge badge-warning">Couldn\'t sync, no range given.</span>').delay(5000).fadeOut(function() {
        $(this).html('');
        $(this).show();
      });
    }
  });

  /**
   *  sync activities
   */
  $('#buttonSyncActivities').click(function () {
    cleanResults();
    $('#syncActInfo').html('<span class="badge badge-success">Projectile packages sychronized with Timeular ' +
    'activities.</span>');

    $.ajax({
      url: '//localhost:{port}/syncactivities',
      cache: false,
      contentType: false,
      processData: false,
      //data: form_data,
      type: 'get',
      success: function(response, status){
        console.log(response, status);
        $('#syncActInfo').fadeOut(function() {
          $(this).html('');
          $(this).show();
        });
      },
      error : function(error) {
        //show error here
        console.log(error);
        $('#syncActInfo').html('<span class="badge badge-warning">Projectile packages not sychronized with Timeular ' +
        'activities. An Error occured</span>').delay(5000).fadeOut(function() {
          $(this).html('');
          $(this).show();
        });
      }
    });
  });

  /**
   *  set sync interval
   */
  $('#buttonSetSyncInterval').click(function () {
    if ($('#syncInterval').val() >= 1){
      $.ajax({
        url: '//localhost:{port}/syncinterval/' + $('#syncInterval').val(),
        cache: false,
        contentType: false,
        processData: false,
        //data: form_data,
        type: 'get',
        success: function(response, status){
          console.log('Setting sync interval returned: ' + response, status);
        },
        error : function(error) {
          //show error here
          console.log('Something went wrong while setting new sync interval:', error);
          setIntervalField();
        }
      });
    }
  });


// master end
});
