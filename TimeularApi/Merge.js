
const rp = require('request-promise');
const winston = require('winston');

class Merge {
  constructor(month, monthCleaned, apiToken) {
    this.apiToken = apiToken;
    this.month = month;
    this.monthCleaned = monthCleaned;
    this.timeList = '';
  }

  getTimeList() {
    return this.timeList;
  }

  getMonth() {
    return this.month;
  }

  getMonthCleaned() {
    return this.monthCleaned;
  }

  async fetchTimeList(startDate, endDate) {
    let timeperiod = startDate + 'T00:00:00.000/' + endDate + 'T23:59:59.999';
    // get timeular entries
    let result = await rp({
      method: 'GET',
      uri: 'https://api.timeular.com/api/v2/time-entries/' + timeperiod,
      resolveWithFullResponse: true,
      headers: {
        Authorization: 'Bearer ' + this.apiToken,
        Accept: 'application/json;charset=UTF-8'
      }
    })
    this.timeList = JSON.parse(result.body)
    return result;
  }

  sort(timeList) {
    timeList.timeEntries.sort(function(a, b) { return (new Date(a.duration.startedAt) - new Date(b.duration.startedAt)) });
    this.timeList = timeList; //this is a side effect
    return this.timeList;
  }

  format(timeList) {
    for (let i = 0; i < timeList.timeEntries.length; i++) {
      let day = {};
      day["StartDate"] = timeList.timeEntries[i].duration.startedAt.substring(0, timeList.timeEntries[i].duration.startedAt.indexOf("T"));
      /*
      timestamp from timeular is not accurate. sometimes 2h = 120min has a value thats != 120min. To solve that I cut the
      seconds and milliseconds from the timestamp. Decreases precision --> alternative would be to round values
      */
      day["Duration"] = ((Date.parse(timeList.timeEntries[i].duration.stoppedAt.substring(0, timeList.timeEntries[i].duration.stoppedAt.lastIndexOf(":"))) - Date.parse(timeList.timeEntries[i].duration.startedAt.substring(0, timeList.timeEntries[i].duration.startedAt.lastIndexOf(":")))) / 60000) / 60;
      // get projectile packagename from timeular activity name e.g. "name": "Interne Organisation 2018 [2759-62]"
      day["Activity"] = timeList.timeEntries[i].activity.name.substring(timeList.timeEntries[i].activity.name.lastIndexOf("[") + 1, timeList.timeEntries[i].activity.name.lastIndexOf("]"));
      // collision detection through improved Notes containing timeular id of entry
      if (timeList.timeEntries[i].note.text !== null) {
        day["Note"] = timeList.timeEntries[i].note.text; // add timeular id of entry here
        day["Note"] = day["Note"] + ' #[' + timeList.timeEntries[i].id + ']'; // creating new style note entries for collision detecting
      } else {
        day["Note"] = '';
      }
      // keep the original complete date, to provide improved sorting of results for frontend
      day["startedAt"] = timeList.timeEntries[i].duration.startedAt;

      // "normalize" note - Q'n'D fix for projectile.js to avoid malformed characters in projectile
      // !!! TODO CHECK - final clean solution in saveEntry necessary!
      day["Note"] = day["Note"].replace(/ä/g, "ae").replace(/Ä/g, "Ae").replace(/ü/g, "ue").replace(/Ü/g, "Ue").replace(/ö/g, "oe").replace(/Ö/g, "Oe").replace(/ß/g, "ss");
      // remove newlines,... \n \r from notes
      day["Note"] = day["Note"].replace(/\r?\n|\r/g, " ");
      // end
      this.month.push(day);
    }
    return this.month;
  }

  mergeDurationTime(month) {
    for (var i = 0; i < month.length; i++) {
      for (var j = i + 1; j < month.length; j++) { // j = i + 1 because .csv is sorted!
        // winston.debug( i + "#" + j);
        if ((month[i]["StartDate"] === month[j]["StartDate"]) && (month[i]["Note"].substring(0, month[i]["Note"].lastIndexOf(" #[")) === month[j]["Note"].substring(0, month[j]["Note"].lastIndexOf(" #["))) && (month[i]["Activity"] === month[j]["Activity"])) {
          month[i]["Duration"] = (month[i]["Duration"] * 60 + month[j]["Duration"] * 60) / 60;
          // add new extended note to "new" merged entry
          let monthIId = month[i]["Note"].substring(month[i]["Note"].lastIndexOf(' #[') + 3, month[i]["Note"].lastIndexOf(']'));
          let monthJId = month[j]["Note"].substring(month[j]["Note"].lastIndexOf(' #[') + 3, month[j]["Note"].lastIndexOf(']'));
          month[i]["Note"] = month[i]["Note"].substring(0, month[i]["Note"].lastIndexOf(' #['));
          month[i]["Note"] = month[i]["Note"] + ' #[' + monthIId + ',' + monthJId + ']';
          // all fine?
          winston.debug('Merge (Range) -> merging bookings --> new Note: ' + month[i]["Note"] + ' for ', month[i]["StartDate"], month[i]["Activity"], month[i]["Duration"]);
          // winston.debug("merging durations, compare activity: " + month[i]["Activity"] + " " + month[j]["Activity"] + " " + month[i]["Note"]);
          month.splice(j, 1); // remove merged entry from original array, to avoid recounting them in next i increment
          j--; // as one entry is spliced, the next candidate has the same j index number!
        } else if (month[i]["StartDate"] !== month[j]["StartDate"]) {
          break; // Date matches no longer? input is sorted, break the comparison loop
        }
      }
      this.monthCleaned.push(month[i]); // output the merged day entry to clean array
    }
    return this.monthCleaned;
  }

  cleanArray(timeList) {
    this.sort(timeList);
    let month = this.format(timeList);
    this.monthCleaned = this.mergeDurationTime(month);
    return this.monthCleaned;
  }

}

module.exports = Merge;

