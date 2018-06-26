const request = require('request');
const rp = require('request-promise');
const projectile = require('./projectileAPI.js');
// const fs = require('fs'); //never used here

// const util = require('util'); // for Debug only --> util.inspect()

const winston = require('winston');
// error > warn > info > verbose > debug > silly

/* TODO seems obsolete, justcopies value locally, not returning a value
let token;
exports.initializeToken = async(tokenApi) => {
  try {
    token = tokenApi;
  } catch (e) {
    winston.error('timeularAPI No token file seems to be available. Please run "hostname:port/start" to create ' +
    'a token file.');
    // process.exit();
  }
};
*/
/* OLD APPROACH
let token;
try {
  token = JSON.parse(fs.readFileSync('timeularToken.txt'));
} catch (e) {
  winston.error('timeularAPI No token file seems to be available. Please run 'node getTimularToken.js' to create a ' +
  'token file.');
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
exports.getActivities = async() => {
  const result = await rp({
    method: 'GET',
    uri: 'https://api.timeular.com/api/v2/activities',
    resolveWithFullResponse: true,
    headers: {
      Authorization:'Bearer ' + token.apiToken,
      Accept: 'application/json;charset=UTF-8'
    }
  }).then(function(res) {
    if (res.statusCode === 200) {
      return JSON.parse(res.body);
    }
  }).catch(function(err) {
    winston.warn('getActivities -> Something went wrong. Here\'s the body: ', res.body);
    throw new Error('An error occured. ', err);
  });
  return result;
};


/**
 *
 * requests a list of packages / activities from projectile and timeular for a specific account sorted by to archive
 * in timeular and to create in timeular
 * @returns two arrays listing what packages have to be created in timeular and what activities have to be archived
 *
 */
async function compareActivities() {
  // const timeularActivities = await exports.getActivities(); FIXME unused here, 7 rows lower same data gets retrieved
  const projectileJobList = await projectile.fetchNewJobList();
  const timeularHasProjectileNot = []; // List what activities to archive in timeular
  const projectileHasTimeularNot = []; // List what activities to create in timeular

  // to archive
  winston.debug('starting comparing.....');
  const activityList = await exports.getActivities();

  activityList.activities.forEach((item) => {
    let matchChecker = false;
    // let entryObj = {}; never used FIXME
    projectileJobList.forEach((item2) => {
      const timeularActivityID = item.name.substring(item.name.lastIndexOf('[') + 1, item.name.lastIndexOf(']'));
      const projectilePackageID = item2.no;
      // winston.debug('testing: ' + timeularActivityID, projectilePackageID);
      if (timeularActivityID === projectilePackageID) {
        matchChecker = true;
        // winston.debug('match: ' + timeularActivityID, projectilePackageID);
      }
    });
    if (!matchChecker) {
      timeularHasProjectileNot.push(item); // to archive!!
    }
  });
  // winston.debug('to archive: ' + util.inspect(timeularHasProjectileNot));

  // to create
  projectileJobList.forEach((item) => {
    let missingChecker = true;
    // const entryObj = {}; unused item FIXME
    activityList.activities.forEach((item2) => {
      const timeularActivityID = item2.name.substring(item2.name.lastIndexOf('[') + 1, item2.name.lastIndexOf(']'));
      const projectilePackageID = item.no;
      // winston.debug('testing: ' + timeularActivityID, projectilePackageID);
      if (timeularActivityID === projectilePackageID) {
        missingChecker = false;
        // winston.debug('match: ' + timeularActivityID, projectilePackageID);
      }
    });
    if (missingChecker) {
      projectileHasTimeularNot.push(item); // to archive!!
    }
  });
  // winston.debug('to create: ' + util.inspect(projectileHasTimeularNot));
  const result = {
    projectileHasTimeularNot,
    timeularHasProjectileNot
  };
  winston.debug('... done comparing.');
  return result;
}


/**
 *
 * package activity list retrieves activities from timeular and matches them against the param id to return the matching
 * activity or package id pair
 * @param {id} id is either an activity id or a package id
 * @returns returns a fitting pair of activity and package id
 *
 */
exports.packageActivityList = async(id) => {
  // collect activities (and package names) from timeular
  const timeularActivities = await exports.getActivities();
  const packageActivity = [];
  timeularActivities.activities.forEach((item) => {
    const obj = {};
    obj['Activity'] = item.id;
    obj['Package'] = item.name.substring(item.name.lastIndexOf('[') + 1, item.name.lastIndexOf(']'));
    packageActivity.push(obj);
  });
  // find fitting id's and return them
  let activityId = '';
  let packageId = '';
  if (id.includes('-')) { // projectile package format --> translate to activity
    packageId = id;
    packageActivity.forEach((item) => {
      if (item.Package === packageId) {
        activityId = item.Activity;
      }
    });
  } else { // timeular package format --> translate to package
    activityId = id;
    packageActivity.forEach((item) => {
      if (item.Activity === activityId) {
        packageId = item.Package;
      }
    });
  }
  return {
    'Activity': activityId,
    'Package': packageId
  };
};

/**
 *
 * execute creation and archiving of activities in timeular based on results of compareActivities()
 * @param {create} create controlls whether activities are created or not
 * @param {archive} archive controlls whether activities are archived or not
 * @returns true or false for success of updating activities
 *
 */
exports.updateActivities = async(create, archive) => {
  let resultState = true;
  // compare jobList and activityList
  const result = await compareActivities();

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
};

/**
 *
 * create new activity
 * @param {name} name to use for new activity
 * @param {no} no to use for new activity
 * @returns true or false for success of creating activity
 *
 */
async function createActivity(name, no) {
  const activityName = name + ' [' + no + ']';
  // generate color dynamically
  const color = '#' + Math.floor((Math.random() * 255) + 1).toString(16) +
    Math.floor((Math.random() * 255) + 1).toString(16) + Math.floor((Math.random() * 255) + 1).toString(16);

  await rp({
    method: 'POST',
    uri: 'https://api.timeular.com/api/v2/activities',
    resolveWithFullResponse: true,
    headers: {
      Authorization:'Bearer ' + token.apiToken,
      Accept: 'application/json;charset=UTF-8',
      'content-type': 'application/json;charset=UTF-8'
    },
    json: {
      'name': activityName,
      color,
      'integration': 'zei'
    }
  }).then(function(res) {
    if (res.statusCode === '201' || res.statusCode === 201) {
      return true;
    }
  }).catch(function(err) {
    winston.error('An error occured: ', err);
    return false;
    // throw new Error('An error occured. ', err);
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
  await rp({
    method: 'DELETE',
    uri: 'https://api.timeular.com/api/v2/activities/' + activityId,
    resolveWithFullResponse: true,
    headers: {
      Authorization:'Bearer ' + token.apiToken,
      Accept: 'application/json;charset=UTF-8',
    }
  }).then(function(res) {
    if (res.statusCode === '200' || res.statusCode === 200) {
      return true;
    }
  }).catch(function(err) {
    winston.error('An error occured: ', err, res.body.errors);
    //  throw new Error('An error occured. ', err, res.body.errors);
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
 *
 */ // WIP!!! Alternative with time like 9:00 as minimum start time?!
// WIP - successor to bookActivity
exports.bookActivityNG = async({date, duration, activityId, note}) => {
  // get all entries for date
  const startTime = date + 'T00:00:00.000'; // set minimum time here :)
  const endTime = date + 'T23:59:59.999';

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
    }).then(function(res) {
      statusCode = res.statusCode;
    });
    return statusCode;
  }

  async function book0(startTime, endTime) {
    let antwort = '';
    await rp({
      method: 'GET',
      uri: 'https://api.timeular.com/api/v2/time-entries/' + startTime + '/' + endTime,
      resolveWithFullResponse: true,
      headers: {
        Authorization:'Bearer ' + token.apiToken,
        Accept: 'application/json;charset=UTF-8'
      }
    }).then(function(res) {
      antwort = res.body;
    });
    return antwort;
  }

  const antwort2 = await book0(startTime, endTime);
  const timeEntries = JSON.parse(antwort2).timeEntries;

  // get last Entry of day, get stoppedAt time, use as new startedAt - if there is no entry for date, startedAt
  // (could be set to 9:00)
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
  async function getSumMinutes(duration) {
    let sumMinutes = 0;
    if (duration.includes(':')) {
      const durSplit = duration.split(':');
      const durHours = parseInt(durSplit[0]);
      let durMinutes = 0;
      if (durSplit[1].length === 2) {
        durMinutes = parseInt(durSplit[1]);
      }
      sumMinutes = durHours * 60 + durMinutes;
    } else if (duration.includes(',')) {
      const durSplit = duration.split(',');
      const durHours = parseInt(durSplit[0]);
      const durMinutes = parseFloat('0.' + parseInt(durSplit[1])) * 60;
      sumMinutes = durHours * 60 + durMinutes;
    } else if (duration.includes('.')) {
      const durSplit = duration.split('.');
      const durHours = parseInt(durSplit[0]);
      const durMinutes = parseFloat('0.' + parseInt(durSplit[1])) * 60;
      sumMinutes = durHours * 60 + durMinutes;
    } else {
      sumMinutes = duration * 60; // asuming flat hours are provided
    }
    return sumMinutes;
  }

  const sumMinutes = await getSumMinutes(duration);

  // create timeEntry and post it
  // latestStoppedAt = new Date(latestStoppedAt.setMinutes(latestStoppedAt.getMinutes() + 60));
  // NOTE +60 due to timezone issues, in timeluar then offset of 60mins... weird!
  let newStoppedAt = new Date(latestStoppedAt);
  newStoppedAt = new Date(newStoppedAt.setMinutes(newStoppedAt.getMinutes() + sumMinutes));
  winston.debug(latestStoppedAt.toISOString().substr(0, 23), newStoppedAt.toISOString().substr(0, 23));
  // remove z from end of date string!
  const timeEntry = {
    activityId, // id of activity to book on.
    'startedAt': latestStoppedAt.toISOString().substr(0, 23),
    // hard to create automatically....depends on other activities of the day --> calculate from duration
    'stoppedAt': newStoppedAt.toISOString().substr(0, 23),
    'note': {
      'text': note,
      'tags': [],
      'mentions': []
    }
  };

  const antwort = await book1(timeEntry);
  if (antwort === 201 || antwort === '201') {
    return true;
  }
  return false;
};


// ehemals exports.main //  better naming of funct?
// synchronize/merge timeular bookings to projectile withing a date range. date -> YYYY-MM-DD
exports.merge = async(startDate, endDate) => {
  let returnResponse = '';
  constlistentry = 0;
  const month = [];
  const monthCleaned = [];
  // timeperiod structure --> 2017-01-01T00:00:00.000/2018-01-31T00:00:00.000
  const timeperiod = startDate + 'T00:00:00.000/' + endDate + 'T23:59:59.999';
  // get timeular entries
  await rp({
    method: 'GET',
    uri: 'https://api.timeular.com/api/v2/time-entries/' + timeperiod,
    resolveWithFullResponse: true,
    headers: {
      Authorization:'Bearer ' + token.apiToken,
      Accept: 'application/json;charset=UTF-8'
    }
  }).then(function(res) {
    const timeList = JSON.parse(res.body);

    winston.debug('Merge (Range, retrieved) -> timeList: ', JSON.stringify(timeList, null, 2));

    // sort retrieved unsorted list of Timular Entries after ascending dates and times --> easier handling from now on
    // (keep the booking order)
    timeList.timeEntries.sort(function(a, b) {
      return (new Date(a.duration.startedAt) - new Date(b.duration.startedAt));
    });

    winston.debug('Merge (Range, sorted) -> timeList: ', JSON.stringify(timeList, null, 2));

    for (let i = 0; i < timeList.timeEntries.length; i++) {
      const day = {};
      day['StartDate'] = timeList.timeEntries[i].duration.startedAt
        .substring(0, timeList.timeEntries[i].duration.startedAt.indexOf('T'));
      /*
      timestamp from timeular is not accurate. sometimes 2h = 120min has value thats != 120min. To solve that I cut the
      seconds and milliseconds from the timestamp. Decreases precision --> alternative would be to round values
      */
      day['Duration'] = ((Date.parse(timeList.timeEntries[i].duration.stoppedAt.substring(0, timeList.timeEntries[i]
        .duration.stoppedAt.lastIndexOf(':'))) - Date.parse(timeList.timeEntries[i].duration.startedAt
        .substring(0, timeList.timeEntries[i].duration.startedAt.lastIndexOf(':')))) / 60000) / 60;
      // get projectile packagename from timeular activity name e.g. 'name': 'Interne Organisation 2018 [2759-62]'
      day['Activity'] = timeList.timeEntries[i].activity.name.substring(timeList.timeEntries[i].activity.name
        .lastIndexOf('[') + 1, timeList.timeEntries[i].activity.name.lastIndexOf(']'));
      // collision detection through improved Notes containing timeular id of entry
      if (timeList.timeEntries[i].note.text !== null) {
        day['Note'] = timeList.timeEntries[i].note.text; // add timeular id of entry here
        day['Note'] = day['Note'] + ' #[' + timeList.timeEntries[i].id + ']';
        // creating new style note entries for collision detecting
      } else {
        day['Note'] = '';
      }
      // keep the original complete date, to provide improved sorting of results for frontend
      day['startedAt'] = timeList.timeEntries[i].duration.startedAt;

      // 'normalize' note - Q'n'D fix for projectile.js to avoid malformed characters in projectile
      // !!! TODO CHECK - final clean solution in saveEntry necessary!
      day['Note'] = day['Note'].replace(/ä/g, 'ae').replace(/Ä/g, 'Ae').replace(/ü/g, 'ue').replace(/Ü/g, 'Ue')
        .replace(/ö/g, 'oe').replace(/Ö/g, 'Oe').replace(/ß/g, 'ss');
      // remove newlines,... \n \r from notes
      day['Note'] = day['Note'].replace(/\r?\n|\r/g, ' ');
      // end
      month.push(day);
    }
    winston.debug('Merge (Range) -> resulting month size: ' + month.length);

    winston.debug('Merge (Range) -> month before merge: ' + JSON.stringify(month, null, 2));

    // merging Duration time of dup Note lines for entries from same day
    async function mergeDuration() {
      for (let i = 0; i < month.length; i++) {
        for (let j = i + 1; j < month.length; j++) { // j = i + 1 because input is sorted!
          // winston.debug( i + '#' + j);
          if ((month[i]['StartDate'] === month[j]['StartDate']) && (month[i]['Note'].substring(0, month[i]['Note']
            .lastIndexOf(' #[')) === month[j]['Note'].substring(0, month[j]['Note'].lastIndexOf(' #['))) &&
            (month[i]['Activity'] === month[j]['Activity'])) {

            month[i]['Duration'] = (month[i]['Duration'] * 60 + month[j]['Duration'] * 60) / 60;
            // add new extended note to 'new' merged entry
            const monthIId = month[i]['Note'].substring(month[i]['Note'].lastIndexOf(' #[') + 3, month[i]['Note']
              .lastIndexOf(']'));
            const monthJId = month[j]['Note'].substring(month[j]['Note'].lastIndexOf(' #[') + 3, month[j]['Note']
              .lastIndexOf(']'));
            month[i]['Note'] = month[i]['Note'].substring(0, month[i]['Note'].lastIndexOf(' #['));
            month[i]['Note'] = month[i]['Note'] + ' #[' + monthIId + ',' + monthJId + ']';
            // all fine?
            winston.debug('Merge (Range) -> merging bookings --> new Note: ' + month[i]['Note'] + ' for ',
              month[i]['StartDate'], month[i]['Activity'], month[i]['Duration']);
            month.splice(j, 1); // remove merged entry from original array, to avoid recounting them in next i increment
            j--; // as one entry is spliced, the next candidate has the same j index number!
          } else if (month[i]['StartDate'] !== month[j]['StartDate']) {
            break; // Date matches no longer? input is sorted, break the comparison loop
          }
        }
        monthCleaned.push(month[i]); // output the merged day entry to clean array
      }
    }
    mergeDuration();
    winston.debug('Merge (Range) -> (after merge) monthCleaned size: ' + monthCleaned.length);
  }).catch(function(err) {
    winston.error('An error occured: ', err);
    return false; // Crawling failed...
  });

  await normalizeUP(startDate, endDate, monthCleaned).then(async(result) => {
    winston.debug('Merge (Range) -> monthCleaned size in normalizeUP: ' + monthCleaned.length);
    winston.debug('Merge (Range) -> normalizeUP: ');
    winston.debug('Merge (Range) -> Input: ' + JSON.stringify(result, null, 2));
    if (result && result.length <= 0) { // nothing to do, no need to call saveToProjectile
      winston.debug('Merge (Range) -> normalized list empty - nothing to do.');
      return ('Nothing to do.');
    }
    returnResponse = await saveToProjectile(result);
  });
  return (returnResponse); // pos und neg results
};


// after that function , monthcleaned contains only limitless packages
// Timelar list will splice every element with limited packages into a seperate array
/**
 *
 * @param {*} monthArray  (Array containing the booking objects)*
 * @param {*} limitPackageArrayFromServer  (Array containing the objects with limitedTime)
 * @returns {} packageReply (Array with JSON objects containing then additional info if they use limited package or not)
 *
 */
async function markEntriesWithLimit(monthArray, limitPackageArrayFromServer) {
  const packageReply = [];
  for (let i = 0; i < limitPackageArrayFromServer.length; i++) {
    for (let j = 0; j < monthArray.length; j++) {
      let obj = {};
      obj = monthArray[j];
      winston.debug(JSON.stringify(monthArray[j], null, 2));
      winston.debug('CHECK: ' + monthArray[j]['Activity'], limitPackageArrayFromServer[i]['no'],
        (monthArray[j]['Activity'] === limitPackageArrayFromServer[i]['no']));
      if (monthArray[j]['Activity'] === limitPackageArrayFromServer[i]['no']) {
        obj['Limit'] = true;
      } else {
        obj['Limit'] = false;
      }
      packageReply.push(obj);
    }
  }
  return packageReply;
}

/**
 * splitting the monthCleaned into  seperates arrays to process,
 * synchronous saving of limitless packages
 * synchronous saving of limit packages with checking
 */
async function saveToProjectile(monthArray) {
  // output to frontend
  const gesResult = [];
  // Fetch an actual Joblist from the server
  const data = await projectile.fetchNewJobList();
  // winston.debug('saveToProjectile -> after projectile.fetchNewJobList: ', JSON.stringify(data, null, 2));
  // return an Array which contains every element with Limited Time
  const limitPackageArrayFromServer = await projectile.joblistLimited(data, 'limitTime', (item) => {
    return item > 0;
  });
  // split Timular list into List with limitless and packages with limit
  winston.debug('saveToProjectile -> after projectile.joblistLimited -> limitPackageArrayFromServer: ',
    JSON.stringify(limitPackageArrayFromServer, null, 2));
  const packageReply = await markEntriesWithLimit(monthArray, limitPackageArrayFromServer);
  winston.debug('saveToProjectile -> after markEntriesWithLimit (improved) -> packageReply: ',
    JSON.stringify(packageReply, null, 2));

  // saving of packages with check if limit key is true or false
  // only here can empty activities occur (timeular only entries!)
  async function saving(packageReply) { // eslint-disable-line
    for (let i = 0; i < packageReply.length; i++) {
      let obj = {};
      // check if limit true or false, continue accordingly!
      if (packageReply[i]['Limit']) {
        // true --> with limit! check for limit, no empty note allowed -> not for timeular only!
        // fetch projectile instance of the current project and get the remaining time
        const data = await projectile.fetchNewJobList();
        const projectileObject = await projectile.joblistLimited(data, 'no', (item) => {
          return item === packageReply[i]['Activity'];
        });
        winston.debug('Saving entry with package limit.');
        winston.debug('duration of new entry: ' + packageReply[i].Duration + ' remainingTime in package before add: ' +
          Number(projectileObject[0].remainingTime));
        // compare the timular project time with projectile instance
        // attention: toFixed(5) to avoid comparision issues with rounding errors
        obj = packageReply[i];
        obj['LimitHit'] = 'no';

        if (parseFloat(packageReply[i].Duration.toFixed(5)) <= parseFloat(Number(projectileObject[0].remainingTime
          .toFixed(5)))) {
          const response = await projectile.save(packageReply[i]['StartDate'], parseFloat(packageReply[i]['Duration'].
            toFixed(5)), packageReply[i]['Activity'], packageReply[i]['Note']);
          winston.debug('saving w/ limit: ' + packageReply[i]['StartDate'], packageReply[i]['Duration'],
            packageReply[i]['Activity'], packageReply[i]['Note']);
          winston.debug('response: ' + response.returnValue + '\n');
          if (response.returnValue) {
            obj['Result'] = 'positive';
          } else {
            obj['Result'] = 'negative';
            if (response.errors) {
              obj['Errors'] = response.errors;
            }
          }
        } else {
          obj['LimitHit'] = 'yes';
          obj['Result'] = 'negative';
          winston.warn('Saving package with limit failed - Remaining Time exceeded. ' + packageReply[i]['StartDate'],
            packageReply[i]['Duration'], packageReply[i]['Activity'], packageReply[i]['Note'] +
            ' with remaining time of: ' + Number(projectileObject[0].remainingTime));
        }
      } else { // false --> without limit! empty notes can occur
        if (packageReply[i]['Activity'] !== '') {
          const response = await projectile.save(packageReply[i]['StartDate'], packageReply[i]['Duration'],
            packageReply[i]['Activity'], packageReply[i]['Note']);
          winston.debug('saving w/o limit: ' + packageReply[i]['StartDate'], packageReply[i]['Duration'],
            packageReply[i]['Activity'], packageReply[i]['Note']);
          winston.debug('response: ' + response.returnValue + '\n');
          obj = packageReply[i];
          obj['LimitHit'] = 'noLimit';
          if (response.returnValue) {
            obj['Result'] = 'positive';
          } else {
            obj['Result'] = 'negative';
            if (response.errors) {
              obj['Errors'] = response.errors;
            }
          }
        } else {
          // empty Activity deleteDepreceated - return entry to frontend with notification
          obj = packageReply[i];
          obj['LimitHit'] = 'noLimit';
          obj['Result'] = 'negative';
        }
      }
      gesResult.push(obj); // return result after work is done
    } // end of for
    return true; // return successfull saving! ?? returning getResult should happen
  }

  await saving(packageReply);

  // no sorting necessary, items kept in order with new approach
  winston.debug('saveToProjectile -> after everything -> gesResult: ', JSON.stringify(gesResult, null, 2));
  return ({
    gesResult
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
    winston.debug('getDistinctProjectileRange -> startDate: ' + startDate);
    winston.debug('getDistinctProjectileRange -> endDate: ' + endDate);

    const TimeRangeArray = [];
    const List = await projectile.getallEntriesInTimeFrame(startDate, endDate);
    /* TODO bugfix!
      we have to catch special case NextTrackingRestriction, TrackingRestrictionPeriod, 'n': 'TrackingRestriction',
      'v': 'Rückerfassungsgrenze: 31.05.2018',
      --> 'abgeschlosse Erfassungsperiode'
    */
    // DEBUG für ERFASSUNGSPROBLEM console.log('#### getDistinctProjectileRange, getallEntriesInTimeFrame ',
    // JSON.stringify(List, null, 2), List.length)

    // large output!
    // winston.debug('getDistinctProjectileRange -> after getallEntriesInTimeFrame: ', JSON.stringify(List, null, 2));
    const obj = List['values'];

    for (key in obj) {
      if (key.match('DayList')) {
        TimeRangeArray.push(obj[key]);
      }
    }
    const temp = [];
    TimeRangeArray.forEach((item) => {
      const entryObj = {};
      entryObj['StartDate'] = item[item.map((item) => item.n).indexOf('Day')]['v'];
      entryObj['Duration'] = item[item.map((item) => item.n).indexOf('Time')]['v'];
      entryObj['Activity'] = item[item.map((item) => item.n).indexOf('What')]['v'];
      entryObj['Note'] = item[item.map((item) => item.n).indexOf('Note')]['v'];
      temp.push(entryObj);
    });

    const serverDays = splitintoSeperateDays(temp);

    return serverDays;

  } catch (err) {
    winston.error('An error occured: ', err);
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
  const monthDay = await splitintoSeperateDays(MonthCleaned);
  winston.debug('normalizeUP -> after splitintoSeperateDays: ', JSON.stringify(monthDay, null, 2));
  // get DateRange of Projectile  [ [Day1],[Day2] ]
  const serverDays = await getDistinctProjectileRange(startDate, endDate);
  winston.debug('normalizeUP -> after getDistinctProjectileRange : ', JSON.stringify(serverDays, null, 2));

  const clientDaysInProjectile = [];

  // get indexes of Serverlist , which has same Date as MonthCleaned
  // filter ServerArray for dates only containing in Timular List
  // clientDaysInProjectile = [1, 3, 4]   => Timular Dates exists in ServerArray at index 1, 3, 4 ;
  monthDay.forEach((item) => {
    clientDaysInProjectile.push(serverDays.filterAdvanced((obj) => obj[0]
      .StartDate === item[0].StartDate, (temp) => serverDays.indexOf(temp)));
  });
  winston.debug('normalizeUP -> monthDay.forEach(item): ', JSON.stringify(clientDaysInProjectile, null, 2));
  // split serverArray in 2 Arrays - one containing the client days, one containing everything else
  const obj = await prepareForSaveAndDeleting(serverDays, clientDaysInProjectile);
  winston.debug('normalizeUP -> prepareForSaveAndDeleting: ', JSON.stringify(obj, null, 2));

  // delete the empty slots which are not in date  // what is it good for?
  await deleteProjectileEmptySlots(obj.cleanProjectileList);

  // delete changedayentries from projectile with same day as in timeluar
  // returns all new Entries from Timular, which havent been saved yet
  // winston.debug(monthDay);
  // winston.debug(obj.dayList);

  // obj.dayList, remove all non #[] pattern matching entries! to avoid messing with existing projectile entries, not
  // written by timeular sync

  /*    last version.....
    obj.dayList[0] = obj.dayList[0].filter(item => {
      console.log(item['Note']);
      if (item['Note'] && item['Note'].includes(' #[')) {
        return true;
      } else if (!item['Note']) {
        return true;
      }
      return false;
    });  // works correctly?... also korrekte Zeile wird erfasst usw?!...obwohl Eintrag gelöscht wurde?!
  */
  // AUF FEHLER TESTEN
  // doesnt work...deletes 'dont delete' and inserts duplicate of test entry! :/
  // check logic!

  // iterate through every element of every day, check for Note not NULL and pattern ' #[' to be NOT present in a Note
  // --> thats an entry from projectile only! manipulate entry so it doesn't get deleted!
  obj.dayList.forEach(async(day) => {
    day.forEach(async(item) => {
      winston.debug('normalizeUP -> obj.dayList day item: ', item, (item['Note'] ? item['Note'].includes(' #[') : ''));
      if (item['Note'] && !item['Note'].includes(' #[')) {
        winston.debug('normalizeUP -> Item not matching " #[" found! - booking in projectile only: ,  ', item['Note']);
        // Null everything so it doesn't get deleted in deleteDepreceated() - TODO improve the approach
        item['Duration'] = null;
        item['Activity'] = null;
        item['Note'] = null;
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
    const temp = array.map((item) => item['StartDate']);
    // unique days;
    const unique = [...new Set(temp)];
    const final = [];
    unique.forEach((item) => final.push(array.filter((obj) => obj['StartDate'] === item)));
    return final;
  } catch (err) {
    winston.error(err);
  }
}

function compareV2(clientArray, serverArray) {
  const arr = [];
  for (let i = 0; i < serverArray.length; i++) {
    arr.push(false);
  }
  // --------DEBUG ----------------
  /* winston.debug('Client' + JSON.stringify(clientArray, null, 2));
  winston.debug('Server' + JSON.stringify(serverArray, null, 2)); */

  try {
    for (let i = 0; i < serverArray.length; i++) {
      /*  if (clientArray.length == 0 || serverArray[i]['Duration']== null ){
           break;
       } */
      for (let j = 0; j < clientArray.length; j++) {
        // too mutch output -> silly
        winston.silly('compareV2 -> Strings getting compared: ', JSON.stringify(clientArray[j]),
          JSON.stringify(serverArray[i]));
        // to avoid startedAt entry to destroy matching capabilities
        const tempClientArrayEntry = {
          StartDate: clientArray[j].StartDate,
          Duration: clientArray[j].Duration,
          Activity: clientArray[j].Activity,
          Note: clientArray[j].Note
        };
        if (JSON.stringify(tempClientArrayEntry) === JSON.stringify(serverArray[i])) {
          winston.silly('compareV2 -> Match: -> arr[] = true ');
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

// FIXME other solution or ignore?!
Array.prototype.filterAdvanced = function(callback1, callback2) {
  for (let i = 0; i < this.length; i++) {
    if (callback1(this[i])) {
      return callback2(this[i]);
    }
  }
};

/**
   *
   * @param {*} monthDay
   * @param {*} dayList
   * return clean monthDayList yet to Save
   */
async function deleteDepreceated(monthDay, dayList) {
  const finalresult = [];
  try {
    for (let i = 0; i < monthDay.length; i++) {
      const res = compareV2(monthDay[i], dayList[i]);
      // returns whats not equal? arra for all days...all false except matches --> true
      // ----------DEBUG --------------
      // winston.debug('result COMPARE: ' + JSON.stringify(res, null, 2));
      finalresult.push(monthDay[i]);
      // after one iteration , a day is compared. I need then to delete that shit , get the date
      // delete, when entry exists but is FALSE.
      for (let j = 0; j < res.length; j++) {
        if (res[j] === false && dayList[i][j].Duration !== null) {
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

// TODO what is it good for? cleaning before writing the new?
async function deleteProjectileEmptySlots(cleanProjectileList) {
  for (let i = 0; i < cleanProjectileList.length; i++) {
    // get indexes of not null
    for (let j = 0; j < cleanProjectileList[i].length; j++) {
      if (cleanProjectileList[i][j].Duration !== null) {
        // DEBUG
        winston.debug('Delete ' + cleanProjectileList[i][j].Note);
        await projectile.delete(cleanProjectileList[i][j].StartDate, j);
        cleanProjectileList[i].splice(j, 1);
        // isn't it enough to just run through the list and deleting the entries without splice?
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
  const obj = {};
  obj.cleanProjectileList = [];
  obj.dayList = [];

  const Overalllist = [];
  serverDays.forEach(() => {
    Overalllist.push(false);
  });

  // set Overall list index , where serverDay exists in timular to true !
  // serverDaysInProjectile contains all Indices to Day Arrays which exists in Timular
  serverDaysInProjectile.forEach((item) => { Overalllist[item] = true; }); // in brackets, doesn't return anything
  // winston.debug(Overalllist);

  // Push into Projectile List with same days as Timular List , if false push to List to delete out of Projectile
  for (let i = 0; i < Overalllist.length; i++) {
    if (Overalllist[i] === true) {
      obj.dayList.push(serverDays[i]);
    } else {
      obj.cleanProjectileList.push(serverDays[i]);
    }
  }
  return obj;
}
