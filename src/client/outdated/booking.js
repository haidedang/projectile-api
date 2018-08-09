'use strict';

$(document).ready(function() {

  /**
   *  load package list into custom-select
   */
  (function() {
    $.ajax({ url: '//localhost:3000/showListProjectile/',
      cache: false,
      contentType: false,
      processData: false,
      type: 'get',
      success: function(response) {
        // adde options!
        const options = $('#inputGroupSelect01').prop('options');
        // $('option', '#inputGroupSelect01').remove();
        $.each(response, function(val, text) {
          options[options.length] = new Option(text.name, text.no);
        });
      },
      dataType: 'json'});
    $('#Date').val(new Date().toISOString().substr(0, 10));
  })();

  /**
   *  Book helper function
   */
  function normalizeDuration(time) {
    if (time.includes(':')) {
      const tmp = time.split(':');
      const tmp2 = (parseInt(tmp[1]) / 60) * 100;
      time = tmp[0] + '.' + tmp2;
    } else if (time.includes(',')) {
      time = time.replace(',', '.');
    }
    return time;
  }

  /**
   *  Book
   */
  $('#buttonBook').click(function() {
    $('.syncOutput').remove();
    const date = $('#Date').val() ? $('#Date').val() : new Date().toISOString().substr(0, 10);
    let duration = $('#Duration').val();
    duration = normalizeDuration(duration);
    const packageNo = $('#inputGroupSelect01').val();
    let comment = $('#Comment').val();
    // comment = comment.replace(/ä/g, 'ae').replace(/Ä/g, 'Ae').replace(/ü/g, 'ue').replace(/Ü/g, 'Ue')
    //  .replace(/ö/g, 'oe').replace(/Ö/g, 'Oe').replace(/ß/g, 'ss');

    console.log($('#Date').val());
    console.log($('#Duration').val());
    console.log($('#inputGroupSelect01').val());
    console.log($('#Comment').val());
    const url = '//localhost:3000/book/' + date + '/' + duration + '/' + packageNo + '/' + comment;
    console.log(url);

    let $currentJson = {
      projectileOnly: false,
      date,
      duration,
      packageNo,
      comment
    };

    jQuery.ajax ({
      url: '//localhost:{port}/book/',
      type: 'POST',
      data: JSON.stringify($currentJson),
      dataType: 'json',
      contentType: 'application/json; charset=utf-8',
      success: function(data){
        if (data) {
          $('#results').append('<li class="list-group-item list-group-item-success syncOutput"><div class="row">' +
            '<div class="col-md-3">' + date + '</div>' +
            '<div class="col-md-2">' + duration + '</div>' +
            '<div class="col-md-2">' + packageNo + '</div>' +
            '<div class="col-md">' + comment + '</div></div></li>');
        }
      }
    });

    /*
    $.post('//localhost:{port}/book/', $currentJson, function(data) {
      console.log(data);
    }); */
    /*
    $.ajax({
      url,
      cache: false,
      contentType: false,
      processData: false,
      // data: form_data,
      type: 'get',
      success: function(response, status){ // eslint-disable-line
        $('.syncOutput').remove();

        console.log('DEBUG: Response: ' + response + ' status: ' + status);
        console.log(response.returnValue);
        if (response.errors) {
          $.each(response.errors, function(val, text) {
            console.log(text.severity + ': ' + text.message);
          });
        }
        console.log(JSON.stringify(response, null, 2));


        // kopiert von /index
        if (response.returnValue === false) {
          // generate Error messages badges
          let errors = '';
          if (response.errors) {
            $.each(response.errors, function(key, value) {
              // "message":"Die Daten wurden nicht gespeichert","severity":"Warning"
              console.log(value.severity + ' -> ' + value.message);
              errors = errors + '<span class=\"badge badge-warning text-left\" style=\"white-space: normal\">' +
                value.severity + ' -> ' + value.message + '</span>';
            });
          }

          $('#results').append('<li class="list-group-item list-group-item-warning syncOutput"><div class="row">' +
          '<div class="col-md-2">' + date + '</div>' +
            '<div class="col-md-2">' + duration + '</div>' +
            '<div class="col-md-3">' + $('#inputGroupSelect01 option:selected').text() + '</div>' +
            '<div class="col-md">' + comment + '</div></div>' +
            '<div class="row"><div class="col">' +
            (packageNo === '' ? '<span class=\"badge badge-warning\">No package selected!</span>' : '') +
            (comment === '' ? '<span class=\"badge badge-warning\">Comment missing, can\'t book!</span>' : '') +
            (duration === '' ? '<span class=\"badge badge-warning\">Duration not set, can\'t book!</span>' : '') +
            (errors !== '' ? errors : '') +
            '</div></div></li>');
        } else {
          $('#results').append('<li class="list-group-item list-group-item-success syncOutput"><div class="row">' +
            '<div class="col-md-2">' + date + '</div>' +
            '<div class="col-md-2">' + duration + '</div>' +
            '<div class="col-md-3">' + $('#inputGroupSelect01 option:selected').text() + '</div>' +
            '<div class="col-md">' + comment + '</div></div></li>');
        }

      },
      error : function(error) { // eslint-disable-line
        // foobar handle bad reply
        console.log(error);
        $('#results').append(error);

      }
    }); */
  });

});
