'use strict';

$(document).ready(function() {



  /**
   *  sync today
   */
  $('#buttonSetCred').click(function(e) {
    console.log('DEBUG: SetCred ');

    let $currentJson = {
      projectileUser: $('#projectileUser').val(),
      projectilePassword: $('#projectilePassword').val(),
      timeularApiKey: $('#timeularApiKey').val(),
      timeularApiSecret: $('#timeularApiSecret').val()
    };

    $.post("//localhost:{port}/start/", $currentJson, function(data) {
      console.log('data sent.');
      if (data) {
        console.log('Successfully created credentials.');
        $('#results').removeClass( "alert-warning" ).addClass( "alert-success" );
        $('#results').html('Projectile and Timeular credentials were successfully sent and set. You can now open <a href="http://localhost:{port}/">http://localhost:{port}</a> to access the app.');
      } else {
        console.log('Something went wrong while sending and setting credentials.');
        $('#results').removeClass( "alert-success" ).addClass( "alert-warning" );
        $('#results').text('Projectile and Timeular credentials couldn\'t be sent and set.');
      }
    });
  });

// master end
});
