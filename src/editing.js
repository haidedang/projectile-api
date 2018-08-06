'use strict';

$(document).ready(function() {

  let packageList = '';
  let noOfBookingEntries = 0;
  let valuesBeforeChange = {};

  /**
   *  load package list into custom-select
   */
  (function() {
    // get projektliste - nötig für Editier-Änderungen
    $.ajax({ url: '//localhost:3000/showListProjectile/',
      cache: false,
      contentType: false,
      processData: false,
      type: 'get',
      success: function(response, status){ // eslint-disable-line
        packageList = response;
        // adde options!
        /*
        const options = $('#inputGroupSelect01').prop('options');
        // $('option', '#inputGroupSelect01').remove();
        $.each(response, function(val, text) {
          options[options.length] = new Option(text.name, text.no);
        }); */
      },
      dataType: 'json'});
    /* voerst nur ein einzelner Tag abrufbar
    $('#startDate').val(new Date().toISOString().substr(0, 10));
    $('#endDate').val(new Date().toISOString().substr(0, 10));
    */
    $('#date').val(new Date().toISOString().substr(0, 10));
  })();

  /**
   *  Book helper function - normalize duration to x.xx
   */
  function buildSelect(id, selectedId) {
    let packageSelect = '<select id="packageNo' + id + '" name="packageNo' + id + '" class="form-control col-md-3">';
    $.each(packageList, function(val, text) {
      if (val === selectedId) {
        packageSelect = packageSelect + '<option value="' + text.no + '" selected>' + text.name + '</option>';
      } else {
        packageSelect = packageSelect + '<option value="' + text.no + '">' + text.name + '</option>';
      }
    });
    packageSelect = packageSelect + '</select>';
    return packageSelect;
  }

  /**
   *  Book helper function - normalize duration to x.xx
   */
  function normalizeDuration(time) {
    time = time.toString();
    if (time.includes(':')) {
      const tmp = time.split(':');
      let tmp2 = parseFloat('0.' + tmp[1]) * (100 / 60);
      tmp2 = tmp2.toString();
      const tmp3 = tmp2.split('.')[1];
      time = tmp[0] + (tmp3 ? '.' + tmp3 : '');
    } else if (time.includes(',')) {
      time = time.replace(',', '.');
    }
    return parseFloat(time); // FIXME same for booking.js?
  }

  /**
   *  Book helper function - prettify duration to x:xx
   */
  function prettyDuration(time) {
    console.log(time);
    const tmp = time.toString().split('.');
    let tmp2 = '00';
    if (tmp.length > 1) {
      tmp2 = '0.' + tmp[1];
      // tmp2 = (parseInt('0.' + tmp[1]) * 60) / 100;
      tmp2 = (parseFloat(tmp2).toPrecision(2) * 60 / 100).toFixed(2).split('.')[1]; // x.xx to x:xx
    }
    time = tmp[0] + ':' + tmp2;
    return time;
  }


  /**
   *  getList
   */
  $('#buttonGetList').click(function(e) {
    $('.syncOutput').remove();
    /* vorerst nur einen Tag abrufen! einfachere Logik
    const startDate = $('#startDate').val() ? $('#startDate').val() : new Date().toISOString().substr(0, 10);
    const endDate = $('#endDate').val() ? $('#endDate').val() : new Date().toISOString().substr(0, 10);
    */
    const startDate = $('#date').val() ? $('#date').val() : new Date().toISOString().substr(0, 10);
    const endDate = startDate;

    jQuery.ajax ({
      url: '//localhost:{port}/bookingslist/' + startDate + '/' + endDate,
      type: 'GET',
      contentType: 'application/json; charset=utf-8',
      success: function(data){
        // safe the original values
        valuesBeforeChange = data.values;

        if (data) {
          let count = 0;
          let packageSelectTmp = '';
          // process each booking entry
          data.values.forEach(function(item){
            // create packagelist for each booking entry with fitting preselected package
            $.each(packageList, function(val, text) {
              if (text.no === item.packageNo) {
                // set select here
                packageSelectTmp = buildSelect(count, val);
              }
              // options[options.length] = new Option(text.name, text.no);
            });

            $('#results').append('<li class="list-group-item list-group-item-success syncOutput"><div class="row">' +
'<input type="date" class="form-control col-md-2" id="date' + count + '" aria-describedby="date" value=' + item.date + ' disabled>' +
'<input type="text" class="form-control col-md-2" id="duration' + count + '" aria-describedby="duration" value=' + prettyDuration(item.duration) + '>' +
packageSelectTmp +
'<input type="text" class="form-control col-md" id="comment' + count + '" aria-describedby="comment" value="' + item.comment + '">' +
'</div></div></li>');
            // '<div class="col-md-3">' + item.date + '</div>' +
            // '<div class="col-md-2">' + item.duration + '</div>' +
            // '<div class="col-md-2">' + item.packageNo + '</div>' +
            // '<div class="col-md">' + item.comment + '</div></div></li>');
            // let packageSelectTmp = packageSelect;
            count++;
          });
          noOfBookingEntries = count;
        }
      }
    });

    /**
     *  updateList
     */
    $('#buttonUpdateList').click(function(e) {
      // collect data
      // iterate through table!
      // TODO nur wenn noOfBookingEntries > 0! -> bei leerer Übersicht nichts tun!

      let bookingArray = [];
      let currentJson = {
        valuesBeforeChange: [],
        valuesAfterChange: []
      };

      for (let i = 0; i < noOfBookingEntries; i++) {
        // build array
        let obj = {};
        obj.date = $('#date' + i).val();
        obj.duration = normalizeDuration($('#duration' + i).val());
        obj.packageNo = $('#packageNo' + i).val();
        obj.comment = $('#comment' + i).val();
        obj.line = valuesBeforeChange[i].line;
        obj.status = '';
        bookingArray.push(obj);
        console.log(obj);
      }
      currentJson.valuesAfterChange = bookingArray;
      currentJson.valuesBeforeChange = valuesBeforeChange;

      for (let i = 0; i < currentJson.valuesAfterChange; i++) {
        // check for changes or deletion
        if (JSON.stringify(currentJson.valuesAfterChange[i]) !== JSON.stringify(currentJson.valuesBeforeChange[i])) {
          currentJson.valuesAfterChange[i].status = 'changed'; // changed / deleted
        }
        /*
        if (deletion flag is set) {

        } */
      }

      // mark changed values?!
      if (JSON.stringify(currentJson.valuesAfterChange) === JSON.stringify(currentJson.valuesBeforeChange)) {
        console.log('No changes detected.');
        currentJson.changes = false;
      } else {
        currentJson.changes = true;
      }
      console.log(JSON.stringify(currentJson, null, 2));

      // TODO helper JS class for repeated functions! - prettyDuration, normalizeDuration,  ...
      // TODO Post data to server, handle changes there!


      // post data to server!
      $.post('//localhost:{port}/editing/', currentJson, function(data) {
        console.log('Posted to /editing - Server replied:');
        console.log(data);
        if (data.returnValue) {
          if (!document.getElementById('updateInfo')) {
            $('<div class="col" id="updateInfo">' +
            '<span class=\"badge badge-success\">Successfully updated booking entries</span>' +
            '</div>').insertBefore('#bookingslist').delay(5000).fadeOut(function() {
              // $(this).html('');
              $(this).remove();
              // $(this).show();
            });
          }
        } else {
          if (!document.getElementById('updateInfo')) {
            $('<div class="col" id="updateInfo">' +
            '<span class=\"badge badge-warning\">Unsuccessfully in updating booking entries - one or more entries ' +
            'failed</span>' +
            '</div>').insertBefore('#bookingslist').delay(5000).fadeOut(function() {
              $(this).html('');
              $(this).show();
            });
          }
        }
      });


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
