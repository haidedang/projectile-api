const request = require('request');
const rp = require('request-promise');
const projectile = require('./projectileAPI.js');
const fs = require('fs');

const util = require('util'); // for Debug only --> util.inspect()

const winston = require('winston');
// winston.level = 'debug';
// error > warn > info > verbose > debug > silly

let token;
exports.initializeToken = async (tokenApi) => {
  try {
    token = tokenApi;
  } catch (e) {
    winston.error('timeularAPI No token file seems to be available. Please run "node getTimularToken.js" to create a token file.');
    // process.exit();
  }
}
/* OLD APPROACH
let token;
try {
  token = JSON.parse(fs.readFileSync('timeularToken.txt'));
} catch (e) {
  winston.error('timeularAPI No token file seems to be available. Please run "node getTimularToken.js" to create a token file.');
  // process.exit();
}
*/
/*
let listentry = 0;
let month = [];
let monthCleaned = []; */


/**
 *
 * requests a list of available activities from timeular for a specific account
 * @returns JSON with acitivties available on timeular
 *
 */
exports.getActivities = async () => {
  let result = await rp({
    method: 'GET',
    uri: 'https://api.timeular.com/api/v2/activities',
    resolveWithFullResponse: true,
    headers: {
      Authorization:'Bearer ' + token.apiToken,
      Accept: 'application/json;charset=UTF-8'
    }
  }).then(function (res) {
      if (res.statusCode === 200) {
        return JSON.parse(res.body);
      }
  }).catch(function (err) {
      throw new Error("An error occured. ", err);
      return res.body;
  });
  return result;
}


/**
 *
 * requests a list of packages / activities from projectile and timeular for a specific account sorted by to archive
 * in timeular and to create in timeular
 * @returns two arrays listing what packages have to be created in timeular and what activities have to be archived
 *
 */
async function compareActivities() {
  let timeularActivities = await exports.getActivities();
  let projectileJobList = await projectile.fetchNewJobList();
  let timeularHasProjectileNot = []; // List what activities to archive in timeular
  let projectileHasTimeularNot = []; // List what activities to create in timeular

  // to archive
  winston.debug('starting comparing.....');
  let activityList = await exports.getActivities();
  activityList.activities.forEach((item) => {
    let matchChecker = false;
    let entryObj = {};
    projectileJobList.forEach((item2) => {
      let timeularActivityID = item.name.substring(item.name.lastIndexOf("[") + 1, item.name.lastIndexOf("]"));
      let projectilePackageID = item2.no;
      // winston.debug('testing: ' + timeularActivityID, projectilePackageID);
      if (timeularActivityID === projectilePackageID) {
        matchChecker = true;
        // winston.debug('match: ' + timeularActivityID, projectilePackageID);
      }
    })
    if (!matchChecker) {
      timeularHasProjectileNot.push(item);  // to archive!!
    }
  })
  // winston.debug('to archive: ' + util.inspect(timeularHasProjectileNot));

  // to create
  projectileJobList.forEach((item) => {
    let missingChecker = true;
    let entryObj = {};
    activityList.activities.forEach((item2) => {
      let timeularActivityID = item2.name.substring(item2.name.lastIndexOf("[") + 1, item2.name.lastIndexOf("]"));
      let projectilePackageID = item.no;
      // winston.debug('testing: ' + timeularActivityID, projectilePackageID);
      if (timeularActivityID === projectilePackageID) {
        missingChecker = false;
        // winston.debug('match: ' + timeularActivityID, projectilePackageID);
      }
    })
    if (missingChecker) {
      projectileHasTimeularNot.push(item);  // to archive!!
    }
  })
  // winston.debug('to create: ' + util.inspect(projectileHasTimeularNot));
  let result = {
    projectileHasTimeularNot: projectileHasTimeularNot,
    timeularHasProjectileNot: timeularHasProjectileNot
  };
  return result;
}


/**
 *
 * package activity list retrieves activities from timeular and matches them against the param id to return the matching activity or package id pair
 * @param {id} id is either an activity id or a package id
 * @returns returns a fitting pair of activity and package id
 *
 */
exports.packageActivityList = async (id) => {
  // collect activities (and package names) from timeular
  let timeularActivities = await exports.getActivities();
  let packageActivity = [];
  timeularActivities.activities.forEach((item) => {
    let obj = {};
    obj["Activity"] = item.id;
    obj["Package"] = item.name.substring(item.name.lastIndexOf("[") + 1, item.name.lastIndexOf("]"));
    packageActivity.push(obj);
  })
  // find fitting id's and return them
  let activtiyId = '';
  let packageId = '';
  if (id.includes('-')) { // projectile package format --> translate to activity
    packageId = id;
    packageActivity.forEach((item) => {
      if (item.Package === packageId) {
        activityId = item.Activity;
      }
    })
  } else { // timeular package format --> translate to package
    activityId = id;
    packageActivity.forEach((item) => {
      if (item.Activity === activityId) {
        packageId = item.Package;
      }
    })
  }
  return {
    'Activity': activityId,
    'Package': packageId
  }
}

/**
 *
 * execute creation and archiving of activities in timeular based on results of compareActivities()
 * @param {create} create controlls whether activities are created or not
 * @param {archive} archive controlls whether activities are archived or not
 * @returns true or false for success of updating activities
 *
 */
exports.updateActivities = async (create, archive) => {
  let resultState = true;
  // compare jobList and activityList
  let result = await compareActivities();

  // create - contains projectile objects -> convert and create
  if (create) {
    result.projectileHasTimeularNot.forEach((item) => {
      winston.debug('Starting creating activities...', item.name, item.no);
      if (!createActivity(item.name, item.no)) {
        winston.error('Error: Creating activity for ' + item.name, item.no + ' failed.');
        resultState = false;
      }
    });
  }
  // archive - contains timeular objects -> archive those
  if (archive) {
    result.timeularHasProjectileNot.forEach((item) => {
      winston.debug('Starting archiving activities...', item.name, item.id);
      if (!archiveActivity(item.id)) {
        winston.error('Error: Archiving of activity ' + item.name, item.id + ' failed.');
        resultState = false;
      }
    });
  }
  return (resultState);
}

/**
 *
 * create new activity
 * @param {name} name to use for new activity
 * @param {no} no to use for new activity
 * @returns true or false for success of creating activity
 *
 */
async function createActivity(name, no) {
  let activityName = name + ' [' + no + ']';
  // generate color dynamically
  let color = '#' + Math.floor((Math.random() * 255) + 1).toString(16) + Math.floor((Math.random() * 255) + 1).toString(16) + Math.floor((Math.random() * 255) + 1).toString(16);

  let result = await rp({
    method: 'POST',
    uri: 'https://api.timeular.com/api/v2/activities',
    resolveWithFullResponse: true,
    headers: {
      Authorization:'Bearer ' + token.apiToken,
      Accept: 'application/json;charset=UTF-8',
      'content-type': 'application/json;charset=UTF-8'
    },
    json: {
        "name": activityName,
        "color": color,
        "integration": "zei"
    }
  }).then(function (res) {
        if (res.statusCode === '201' || res.statusCode === 201) {
        return true;
      }
  }).catch(function (err) {
      throw new Error("An error occured. ", err);
      return false;
  });
}

/**
 *
 * archive activity
 * @param {activityId} activityId to use for archiving activity
 * @returns true or false for success of archiving activity
 *
 */
async function archiveActivity(activityId) {
  let result = await rp({
    method: 'DELETE',
    uri: 'https://api.timeular.com/api/v2/activities/' + activityId,
    resolveWithFullResponse: true,
    headers: {
      Authorization:'Bearer ' + token.apiToken,
      Accept: 'application/json;charset=UTF-8',
    }
  }).then(function (res) {
        if (res.statusCode === '200' || res.statusCode === 200) {
        return true;
      }
  }).catch(function (err) {
      throw new Error("An error occured. ", err, res.body.errors);
      return false;
  });
}


/**
 *
 * book an activity in timeular
 * @returns success true or false
 * @param {date} date to use for booking
 * @param {duration} duration to use for booking
 * @param {activity} activity to use for booking
 * @param {note} note to use for booking
 *
 *   // OBSOLETE? currently not used! bookActivityNG is used!
 */  // WIP!!! Alternative with time like 9:00 as minimum start time?!
exports.bookActivity = async (date, duration, activityId, note) => {
  // get all entries for date
  let startTime = date + 'T00:00:00.000'; // set minimum time here :)
  let endTime = date + 'T23:59:59.999';
  await request.get('https://api.timeular.com/api/v2/time-entries/' + startTime + '/' + endTime,{
    headers: {
      Authorization:'Bearer ' + token.apiToken,
      Accept: 'application/json;charset=UTF-8'
    }
  }, (err, res) => {
    let timeEntries = JSON.parse(res.body).timeEntries;

    // get last Entry of day, get stoppedAt time, use as new startedAt - if there is no entry for date, startedAt = 9:00
    let latestStoppedAt = new Date(startTime + 'Z');
    if (timeEntries && timeEntries.length > 0) {
      timeEntries.forEach((item) => {
        if (new Date(item.duration.stoppedAt + 'Z') > latestStoppedAt) {
          winston.debug('Debug bookActivity -> lastestStoppedAt -> neuer gefunden!');
          latestStoppedAt = new Date(item.duration.stoppedAt + 'Z');
        }
      });
    }
    // normalize duration (get sum of minutes): valid input x:xx and x,xx and x.xx
    let sumMinutes = 0;
    if (duration.includes(":")) {
      let durSplit = duration.split(":");
      let durHours = parseInt(durSplit[0]);
      let durMinutes = 0;
      if (durSplit[1].length === 2) {
        durMinutes = parseInt(durSplit[1]);
      }
      sumMinutes = durHours * 60 + durMinutes;
    } else if (duration.includes(",")) {
      let durSplit = duration.split(",");
      let durHours = parseInt(durSplit[0]);
      let durMinutes = parseFloat('0.' + parseInt(durSplit[1]))*60;
      sumMinutes = durHours * 60 + durMinutes
    } else if (duration.includes(".")) {
      let durSplit = duration.split(".");
      let durHours = parseInt(durSplit[0]);
      let durMinutes = parseFloat('0.' + parseInt(durSplit[1]))*60;
      sumMinutes = durHours * 60 + durMinutes
    } else {
      sumMinutes = duration * 60;  // asuming flat hours are provided
      // throw new Error('bookActivity - duration argument seems broken! ' + duration);
    }
    // create timeEntry and post it
    // latestStoppedAt = new Date(latestStoppedAt.setMinutes(latestStoppedAt.getMinutes() + 60)); // NOTE +60 due to timezone issues, in timeluar then offset of 60mins... weird!
    let newStoppedAt = new Date(latestStoppedAt);
    newStoppedAt = new Date(newStoppedAt.setMinutes(newStoppedAt.getMinutes() + sumMinutes));
    winston.debug(latestStoppedAt.toISOString().substr(0,23), newStoppedAt.toISOString().substr(0,23) );
    // remove z from end of date string!
    let timeEntry = {
      "activityId": activityId, // id of activity to book on.
      "startedAt": latestStoppedAt.toISOString().substr(0,23),  // hard to create automatically....depends on other activities of the day --> calculate from duration
      "stoppedAt": newStoppedAt.toISOString().substr(0,23),
      "note": {
        "text": note,
        "tags": [],
        "mentions": []
      }
    };

    request.post('https://api.timeular.com/api/v2/time-entries',{
      headers: {
        Authorization:'Bearer ' + token.apiToken,
        Accept: 'application/json;charset=UTF-8',
        'content-type': 'application/json;charset=UTF-8'
      },
      json: timeEntry
    }, (err, res) => {
      winston.debug(res.body, res.statusCode);
      if (err) {
        throw new Error("An error occured. ", err);
        return false;
      }
      if (res.statusCode == '201' || res.statusCode == 201) {
        return true;
      }
      return false;
    });

  })
}

// WIP - successor to bookActivity
exports.bookActivityNG = async (date, duration, activityId, note) => {
  // get all entries for date
  let startTime = date + 'T00:00:00.000'; // set minimum time here :)
  let endTime = date + 'T23:59:59.999';

  async function book1(timeEntry) {
    let statusCode = '';
    await rp({
      method: 'POST',
      uri: 'https://api.timeular.com/api/v2/time-entries',
      resolveWithFullResponse: true,
      headers: {
        Authorization:'Bearer ' + token.apiToken,
        Accept: 'application/json;charset=UTF-8',
        'content-type': 'application/json;charset=UTF-8'
      },
      json: timeEntry
    }).then(function (res) {
      statusCode = res.statusCode;
    });
    return statusCode;
  }

  async function book0(date, duration, activityId, note, startTime, endTime) {
    let antwort = '';
    await rp({
      method: 'GET',
      uri: 'https://api.timeular.com/api/v2/time-entries/' + startTime + '/' + endTime,
      resolveWithFullResponse: true,
      headers: {
        Authorization:'Bearer ' + token.apiToken,
        Accept: 'application/json;charset=UTF-8'
      }
    }).then(function (res) {
      antwort = res.body;
    });
    return antwort;
  }

  let antwort2 = await book0(date, duration, activityId, note, startTime, endTime);
  let timeEntries = JSON.parse(antwort2).timeEntries;

  // get last Entry of day, get stoppedAt time, use as new startedAt - if there is no entry for date, startedAt = 9:00
  let latestStoppedAt = new Date(startTime + 'Z');
  if (timeEntries && timeEntries.length > 0) {
    timeEntries.forEach((item) => {
      if (new Date(item.duration.stoppedAt + 'Z') > latestStoppedAt) {
        winston.debug('Debug bookActivity -> lastestStoppedAt -> neuer gefunden!');
        latestStoppedAt = new Date(item.duration.stoppedAt + 'Z');
      }
    });
  }
  // normalize duration (get sum of minutes): valid input x:xx and x,xx and x.xx
  let sumMinutes = 0;
  if (duration.includes(":")) {
    let durSplit = duration.split(":");
    let durHours = parseInt(durSplit[0]);
    let durMinutes = 0;
    if (durSplit[1].length === 2) {
      durMinutes = parseInt(durSplit[1]);
    }
    sumMinutes = durHours * 60 + durMinutes;
  } else if (duration.includes(",")) {
    let durSplit = duration.split(",");
    let durHours = parseInt(durSplit[0]);
    let durMinutes = parseFloat('0.' + parseInt(durSplit[1]))*60;
    sumMinutes = durHours * 60 + durMinutes
  } else if (duration.includes(".")) {
    let durSplit = duration.split(".");
    let durHours = parseInt(durSplit[0]);
    let durMinutes = parseFloat('0.' + parseInt(durSplit[1]))*60;
    sumMinutes = durHours * 60 + durMinutes
  } else {
    sumMinutes = duration * 60;  // asuming flat hours are provided
    // throw new Error('bookActivity - duration argument seems broken! ' + duration);
  }
  // create timeEntry and post it
  // latestStoppedAt = new Date(latestStoppedAt.setMinutes(latestStoppedAt.getMinutes() + 60)); // NOTE +60 due to timezone issues, in timeluar then offset of 60mins... weird!
  let newStoppedAt = new Date(latestStoppedAt);
  newStoppedAt = new Date(newStoppedAt.setMinutes(newStoppedAt.getMinutes() + sumMinutes));
  winston.debug(latestStoppedAt.toISOString().substr(0,23), newStoppedAt.toISOString().substr(0,23) );
  // remove z from end of date string!
  let timeEntry = {
    "activityId": activityId, // id of activity to book on.
    "startedAt": latestStoppedAt.toISOString().substr(0,23),  // hard to create automatically....depends on other activities of the day --> calculate from duration
    "stoppedAt": newStoppedAt.toISOString().substr(0,23),
    "note": {
      "text": note,
      "tags": [],
      "mentions": []
    }
  };

  let antwort = await book1(timeEntry);
  if (antwort === 201 || antwort === '201') {
    return true;
  }
  return false;
}


// ehemals exports.main //  better naming of funct?
// synchronize/merge timeular bookings to projectile withing a date range. date -> YYYY-MM-DD
exports.merge = async (startDate, endDate) => {
    let returnResponse = '';
    let listentry = 0;
    let month = [];
    let monthCleaned = [];
    // timeperiod structure --> 2017-01-01T00:00:00.000/2018-01-31T00:00:00.000
    let timeperiod = startDate + 'T00:00:00.000/' + endDate + 'T23:59:59.999';
    // get timeular entries
    let result = await rp({
      method: 'GET',
      uri: 'https://api.timeular.com/api/v2/time-entries/' + timeperiod,
      resolveWithFullResponse: true,
      headers: {
          Authorization:'Bearer ' + token.apiToken,
          Accept: 'application/json;charset=UTF-8'
      }
    }).then(function (res) {
      let timeList = JSON.parse(res.body);
      winston.debug('Merge -> timeList: ', JSON.stringify( timeList, null, 2 ));

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
            day["Note"] = day["Note"] + ' #['  + timeList.timeEntries[i].id + ']'; // creating new style note entries for collision detecting
          } else {
            day["Note"] = '';
          }

          // "normalize" note - Q'n'D fix for projectile.js to avoid malformed characters in projectile
          // !!! TODO CHECK - final clean solution in saveEntry necessary!
          day["Note"] = day["Note"].replace(/ä/g, "ae").replace(/Ä/g, "Ae").replace(/ü/g, "ue").replace(/Ü/g, "Ue").replace(/ö/g, "oe").replace(/Ö/g, "Oe").replace(/ß/g, "ss");
          // remove newlines,... \n \r
          day["Note"] = day["Note"].replace(/\r?\n|\r/g, " ");
          // end
          month.push(day);
      }
      winston.debug('month size: ' + month.length);

      // sort the MonthList with Timular Entries after ascending dates --> easier handling from now on
      month.sort(function (a, b) { return (a.StartDate > b.StartDate) ? 1 : 0 });

      winston.debug("month before merge: " + JSON.stringify(month, null, 2));

      // merging Duration time of dup Note lines for entries from same day
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
                  winston.debug('merging bookings --> new Note: ' + month[i]["Note"] + ' for ', month[i]["StartDate"], month[i]["Activity"], month[i]["Duration"]);
                  // winston.debug("merging durations, compare activity: " + month[i]["Activity"] + " " + month[j]["Activity"] + " " + month[i]["Note"]);
                  month.splice(j, 1); // remove merged entry from original array, to avoid recounting them in next i increment
                  j--; // as one entry is spliced, the next candidate has the same j index number!
              } else if (month[i]["StartDate"] !== month[j]["StartDate"]) {
                  break; // Date matches no longer? input is sorted, break the comparison loop
              }
          }
          monthCleaned.push(month[i]); // output the merged day entry to clean array
      }
      winston.debug('monthCleaned size: ' + monthCleaned.length);
    }).catch(function (err) {
      return false; // Crawling failed...
    });

    await normalizeUP(startDate, endDate, monthCleaned).then(async (result) => {
      winston.debug('monthCleaned size in normalizeUP: ' + monthCleaned.length);
      winston.debug('normalizeUP: ');
      winston.debug('Input: ' + util.inspect(result));
      if (result && result.length <= 0) { // nothing to do, no need to call saveToProjectile
        winston.debug('normalized list empty - nothing to do.');
        return ('Nothing to do.');
      }
      returnResponse = await saveToProjectile(result);
    });
    return (returnResponse); // pos und neg results
}


// after that function , monthcleaned contains only limitless packages
// Timelar list will splice every element with limited packages into a seperate array
/**
 *
 * @param {*} limitPackageArrayFromServer  (Array containing the objects with limitedTime)
 *@returns {}
 *
 */
async function timularClient(monthArray, limitPackageArrayFromServer) {
    let packageReply = {};
    let monthLimitPackage = [];
    // Check every element of Timular list for the packages and split them into a seperate array.
    for (var i = 0; i < limitPackageArrayFromServer.length; i++) {
        await projectile.joblistLimited(monthArray, "Activity", (item) => {
            return item == limitPackageArrayFromServer[i]["no"];
        }).then((result) => { result.forEach((result) => monthLimitPackage.push(result)) });
    }

    // store the arrays in different object properties
    packageReply.limit = monthLimitPackage;
    packageReply.limitless = monthArray;
    return packageReply;

}

/**
 * splitting the monthCleaned into  seperates arrays to process,
 * synchronous saving of limitless packages
 * synchronous saving of limit packages with checking
 */
async function saveToProjectile(monthArray) {
    // output to frontend
    // let posResult = [];
    // let negResult = [];
    let gesResult = [];
    // Fetch an actual Joblist from the server
    let data = await projectile.fetchNewJobList();
    // return an Array which contains every element with Limited Time
    let limitPackageArrayFromServer = await projectile.joblistLimited(data, "limitTime", (item) => {
        return item > 0;
    });
    // split Timular list into List with limitless and packages with limit
    let packageReply = await timularClient(monthArray, limitPackageArrayFromServer);

    //async saving of packages without limit
    /*  package.limitless.forEach((obj)=>{
         projectile.save(obj["StartDate"], obj["Duration"],  obj["Activity"], obj["Note"]);
     }) */

    // synchronous saving of packages without limit
    // only here can empty activities occur (timeular only entries!)
    async function syncSaving(packageReply) {
        for (var i = 0; i < packageReply.limitless.length; i++) {
            let obj = {};
            if (packageReply.limitless[i]["Activity"] !== "") {
                let response = await projectile.save(packageReply.limitless[i]["StartDate"], packageReply.limitless[i]["Duration"], packageReply.limitless[i]["Activity"], packageReply.limitless[i]["Note"]);
                winston.debug('saving w/o limit: ' + packageReply.limitless[i]["StartDate"], packageReply.limitless[i]["Duration"], packageReply.limitless[i]["Activity"], packageReply.limitless[i]["Note"]);
                winston.debug('response: ' + response);
                // let obj = {};
                obj['LimitHit'] = 'noLimit';
                obj = packageReply.limitless[i];
                if (response) {
                  obj['Result'] = 'positive';
                  // posResult.push(obj);
                } else {
                  obj['Result'] = 'negative';
                  // negResult.push(obj);
                }
                // gesResult.push(obj);
            } else {
              // empty Activity deleteDepreceated - return entry to frontend with notification
              // let obj = {};
              obj = packageReply.limitless[i];
              obj['LimitHit'] = 'noLimit';
              obj['Result'] = 'negative';
              // negResult.push(obj);
            }
            gesResult.push(obj);
        }
        return true;
    }

    // await syncSaving(package);

    //  synchrounously saving and checking packages with limit
    async function syncSavingWithLimit(packageReply) {
        for (var i = 0; i < packageReply.limit.length; i++) {
            // fetch projectile instance of the current project and get the remaining time
            let data = await projectile.fetchNewJobList();
            let projectileObject = await projectile.joblistLimited(data, "no", (item) => {
                return item === packageReply.limit[i]["Activity"];
            });

            winston.debug("Saving entry with package limit.");
            winston.debug("duration of new entry: " + packageReply.limit[i].Duration + " remainingTime in package before add: " + Number(projectileObject[0].remainingTime));
            // compare the timular project time with projectile instance
            // attention: toFixed(5) to avoid comparision issues with rounding errors
            let obj = {};
            obj = packageReply.limit[i];
            obj['LimitHit'] = 'no';

            if (parseFloat(packageReply.limit[i].Duration.toFixed(5)) <= parseFloat(Number(projectileObject[0].remainingTime.toFixed(5)))) {
                let response = await projectile.save(packageReply.limit[i]["StartDate"], parseFloat(packageReply.limit[i]["Duration"].toFixed(5)), packageReply.limit[i]["Activity"], packageReply.limit[i]["Note"]);
                winston.debug('saving w/ limit: ' + packageReply.limit[i]["StartDate"], packageReply.limit[i]["Duration"], packageReply.limit[i]["Activity"], packageReply.limit[i]["Note"]);
                winston.debug('response: ' + response);
                if (response) {
                  obj['Result'] = 'positive';
                  // posResult.push(obj);
                } else {
                  obj['Result'] = 'negative';
                  // negResult.push(obj); // packageReply.limit[i]
                }
            } else {
                obj['LimitHit'] = 'yes';
                obj['Result'] = 'negative';
                winston.debug('Saving package with limit failed! ' + packageReply.limit[i]["StartDate"], packageReply.limit[i]["Duration"], packageReply.limit[i]["Activity"], packageReply.limit[i]["Note"] + ' with remaining time of: ' + Number(projectileObject[0].remainingTime));
                // throw new Error('Remaining Time exceeded.');
                winston.warn('Remaining Time exceeded.');
                // negResult.push(obj);
            }
            gesResult.push(obj);
        }
        return true;
    }

    await syncSaving(packageReply).then(async () => {
      await syncSavingWithLimit(packageReply);
      return true;
    });

    // await syncSavingWithLimit(packageReply);
    // return true;
// TEST THIS RESULT!!! better INFO LimitHit und Result
// return geResult;

    // sort the gesResult Array with results after ascending dates --> easier handling in frontend
    gesResult.sort(function (a, b) { return (a.StartDate > b.StartDate) ? 1 : 0 });

    return ({
      // posResult: posResult,
      // negResult: negResult,
      gesResult: gesResult
    });
}

/**
 *
 * @param {*} startDate
 * @param {*} endDate
 * @returns array with serverdays  [[Day1], [Day2]...]
 */
async function getDistinctProjectileRange(startDate, endDate) {
    try {
        /*  let startDate = MonthCleaned[0].StartDate;
         let endDate = MonthCleaned[MonthCleaned.length-1].StartDate;
          */
        winston.debug("startDate: " + startDate);
        winston.debug("endDate: " + endDate);

        let TimeRangeArray = [];
        let List = await projectile.getallEntriesInTimeFrame(startDate, endDate);
        let obj = List["values"];

        for (key in obj) {
            if (key.match('DayList')) {
                TimeRangeArray.push(obj[key]);
            }
        }
        let temp = [];
        TimeRangeArray.forEach((item) => {
            let entryObj = {};
            entryObj["StartDate"] = item[item.map((item) => item.n).indexOf("Day")]["v"];
            entryObj["Duration"] = item[item.map((item) => item.n).indexOf("Time")]["v"];
            entryObj["Activity"] = item[item.map((item) => item.n).indexOf("What")]["v"];
            entryObj["Note"] = item[item.map((item) => item.n).indexOf("Note")]["v"];
            temp.push(entryObj);
        })

        let serverDays = splitintoSeperateDays(temp);

        return serverDays;

    } catch (err) {
        winston.error(err);
    }

    // winston.debug(TimeRangeArray);

}


// deletes Entries from Projectile and returns Clean MonthArray yet to save!
/**
 *
 * @param {*} startDate
 * @param {*} endDate
 * @param {*} MonthCleaned
 * Compare MonthList with Projectile list , and @return all unsaved Timular entries
 */
async function normalizeUP(startDate, endDate, MonthCleaned) {
    let result = [];
    // sorting is now done right after generating month array

    // group Objects to Array with same Date
    let monthDay = await splitintoSeperateDays(MonthCleaned);
    winston.debug('normalizeUP -> splitintoSeperateDays: ', JSON.stringify(monthDay, null, 2));
    // get DateRange of Projectile  [ [Day1],[Day2] ]
    let serverDays = await getDistinctProjectileRange(startDate, endDate);
    winston.debug('normalizeUP -> getDistinctProjectileRange: ', JSON.stringify(serverDays, null, 2));

    let clientDaysInProjectile = [];

    // get indexes of Serverlist , which has same Date as MonthCleaned
    // filter ServerArray for dates only containing in Timular List
    // clientDaysInProjectile = [1, 3, 4]   => Timular Dates exists in ServerArray at index 1, 3, 4 ;
    monthDay.forEach((item) => { clientDaysInProjectile.push(serverDays.filterAdvanced((obj) => obj[0].StartDate == item[0].StartDate, (temp) => serverDays.indexOf(temp))) });
    winston.debug('normalizeUP -> monthDay.forEach(item): ', JSON.stringify(clientDaysInProjectile, null, 2));
    // split serverArray in 2 Arrays - one containing the client days, one containing everything else
    let obj = await prepareForSaveAndDeleting(serverDays, clientDaysInProjectile);
    winston.debug('normalizeUP -> prepareForSaveAndDeleting: ', JSON.stringify(obj, null, 2));

    // delete the empty slots which are not in date  // what is it good for?
    await deleteProjectileEmptySlots(obj.cleanProjectileList);

    // delete changedayentries from projectile with same day as in timeluar
    // returns all new Entries from Timular, which havent been saved yet
    // winston.debug(monthDay);
    // winston.debug(obj.dayList);

    // obj.dayList, remove all non #[] pattern matching entries! to avoid messing with existing projectile entries, not written by timeular sync

/*    last version.....
      obj.dayList[0] = obj.dayList[0].filter(item => {
      console.log(item["Note"]);
      if (item["Note"] && item["Note"].includes(" #[")) {
        return true;
      } else if (!item["Note"]) {
        return true;
      }
      return false;
    });  // works correctly?... also korrekte Zeile wird erfasst usw?!...obwohl Eintrag gelöscht wurde?!
*/
    // AUF FEHLER TESTEN
    // doesnt work...deletes "dont delete" and inserts duplicate of test entry! :/
    // check logic!

    // iterate through every element of every day, check for Note not NULL and pattern " #[" to be NOT present in a Note
    // --> thats an entry from projectile only! manipulate entry so it doesn't get deleted!
    obj.dayList.forEach(async (day) => {
      day.forEach(async (item) => {
        winston.debug('normalizeUP -> obj.dayList day item: ', item, (item["Note"]?item["Note"].includes(" #["):''));
            if (item["Note"] && !item["Note"].includes(" #[")) {
          winston.debug('normalizeUP -> Item not matching " #[" found! - booking in projectile only: ,  ', item["Note"]);
          // Null everything so it doesn't get deleted in deleteDepreceated() - TODO improve the approach
          item["Duration"] = null;
          item["Activity"] = null;
          item["Note"] = null;
        }
      });
    });

    winston.debug('normalizeUP -> list w/ preserved projectile only entries: ', JSON.stringify(obj.dayList, null, 2));
    result = await deleteDepreceated(monthDay, obj.dayList);
    return result;
}

/**
     * return array with several distinct days
    */
function splitintoSeperateDays(array) {
    try {
        let temp = array.map((item) => item["StartDate"]);
        // unique days;
        let unique = [...new Set(temp)];
        let final = [];
        unique.forEach((item) => final.push(array.filter((obj) => obj["StartDate"] == item)));
        return final;
    } catch (err) {
        winston.error(err);
    }

}

function compareV2(clientArray, serverArray) {
    let arr = [];
    for (let i = 0; i < serverArray.length; i++) {
        arr.push(false);
    }
    // --------DEBUG ----------------
    /* winston.debug("Client" + JSON.stringify(clientArray, null, 2));
    winston.debug("Server" + JSON.stringify(serverArray, null, 2)); */

    try {
        for (var i = 0; i < serverArray.length; i++) {
            /*  if (clientArray.length == 0 || serverArray[i]["Duration"]== null ){
                 break;
             } */
            for (var j = 0; j < clientArray.length; j++) {
              // winston.debug('compareV2 -> Strings getting compared: ', JSON.stringify(clientArray[j]), JSON.stringify(serverArray[i]));
                if (JSON.stringify(clientArray[j]) == JSON.stringify(serverArray[i])) {
                  // winston.debug('compareV2 -> Match: -> arr[] = true ');
                    clientArray.splice(j, 1);
                    j = j - 1;
                    arr[i] = true;
                }
            }
        }
        return arr;
    } catch (err) {
        winston.error(err);
    }
}


Array.prototype.filterAdvanced = function (callback1, callback2) {
    for (let i = 0; i < this.length; i++) {
        if (callback1(this[i])) {
            return callback2(this[i]);
        }
    }
}

/**
   *
   * @param {*} monthDay
   * @param {*} dayList
   * return clean monthDayList yet to Save
   */
async function deleteDepreceated(monthDay, dayList) {
    let finalresult = [];
    try {
        for (let i = 0; i < monthDay.length; i++) {
            let res = compareV2(monthDay[i], dayList[i]);  // returns whats not equal? arra for all days...all false except matches --> true
            // ----------DEBUG --------------
            // winston.debug("result COMPARE: " + JSON.stringify(res, null, 2));
            finalresult.push(monthDay[i]);
            // after one iteration , a day is compared. I need then to delete that shit , get the date
            // delete, when entry exists but is FALSE.
            for (var j = 0; j < res.length; j++) {
                if (res[j] == false && dayList[i][j].Duration !== null) {
                    await projectile.delete(dayList[i][j].StartDate, j);
                    res.splice(j, 1);
                    dayList[i].splice(j, 1);
                    j = j - 1;
                }
            }

        }
        // -------DEBUG-------
        return [].concat.apply([], finalresult);
    } catch (err) {
        winston.error(err);
    }

}

// TODO what is it good for? cleaning before writing the new
async function deleteProjectileEmptySlots(cleanProjectileList) {
    for (var i = 0; i < cleanProjectileList.length; i++) {
        // get indexes of not null
        for (var j = 0; j < cleanProjectileList[i].length; j++) {
            if (cleanProjectileList[i][j].Duration !== null) {
                // DEBUG
                winston.debug("Delete " + cleanProjectileList[i][j].Note );
                await projectile.delete(cleanProjectileList[i][j].StartDate, j);
                cleanProjectileList[i].splice(j, 1);  // isn't it enough to just run through the list and deleting the entries without splice?
                j = j - 1;
            }
        }
    }
}

/**
 *
 * @param {*} serverDays
 * @param {*} serverDaysInProjectile
 * return an obj with 2 properties: one containing clientdays, and one which contains the rest
 */
function prepareForSaveAndDeleting(serverDays, serverDaysInProjectile) {
    let obj = {};
    obj.cleanProjectileList = [];
    obj.dayList = [];

    let Overalllist = [];
    serverDays.forEach((item) => {
        Overalllist.push(false);
    });

    // set Overall list index , where serverDay exists in timular to true !
    //serverDaysInProjectile contains all Indices to Day Arrays which exists in Timular
    serverDaysInProjectile.forEach((item) => Overalllist[item] = true);
    // winston.debug(Overalllist);

    // Push into Projectile List with same days as Timular List , if false push to List to delete out of Projectile
    for (var i = 0; i < Overalllist.length; i++) {
        if (Overalllist[i] == true) {
            obj.dayList.push(serverDays[i]);
        } else {
            obj.cleanProjectileList.push(serverDays[i]);
        }
    }
    return obj;
}
