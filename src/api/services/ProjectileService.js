const rp = require('request-promise-native');
const request = require('request');
const logger = require('../../lib/logger');

/**
 * The ProjectileService does the communication with Projectile.
 */
class ProjectileService {
  /**
   * Login a user on Projectile.
   *
   * @param {string} username The username of the users Projectile access.
   * @param {string} password The password of the users Projectile access.
   * @returns {object|void} The cookie the method got from the Projectile login request. Returns void if something
   * goes wrong.
   */

  async login(username, password) {
    const options = {
      method: 'POST',
      url: 'https://projectile.office.sevenval.de/projectile/start',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      form: {
        action: 'login2',
        clientId: '0',
        jsenabled: '1',
        isAjax: '0',
        develop: '0',
        login: username,
        password,
        dologin: true
      },
      strictSSL: false, // TODO: SSL Zertifizierung mit node.js
      timeout: 7000,
      simple: false,
      resolveWithFullResponse: true
      /*
        insecure: true,
        rejectUnauthorized: false,
        followRedirect: true,
      */
    };

    try {
      // get the response from projectile
      const response = await rp(options);
      logger.info('projectile.login -> processing headers and creating cookie.');
      logger.silly(JSON.stringify(response.headers));
      // get the cookie from the response
      const cookie = response.headers['set-cookie'];

      // check whether the login was successful
      let loginFailed = true;
      if (cookie.forEach) {
        cookie.forEach(item => {
          if (item.indexOf('jwt') >= 0 && item.slice(item.indexOf('jwt'), item.indexOf(';')).length > 10) {
            loginFailed = false;
          }
        });
      }

      // abort if the login failed
      if (loginFailed) {
        return;
      }

      // return the whole cookie
      return cookie;
    } catch (e) {
      // Zeitüberschreitung beim Verbinden zum projectile Server... Bitte überprüfe deine Netzwerkverbindung." + error
      logger.error(`projectile login error. ${e.stack}`);
    }
  }

  /**
   *
   * @param {*} method  HTTP method
   * @param {*} url     Server URL
   * @param {*} cookie  cookie response
   * @param {*} body    HTTP body if post request
   */
  option(method, url, cookie, body) {
    const options = {
      method,
      url,
      headers: {
        cookie,
        'content-type': 'application/json'
      },
      body,
      json: true,
      strictSSL: false
    };
    return options;
  }

  /**
   *
   * @param {*} cookie  projectile cookie
   * @param {*} employee projectile Employee ID
   */
  async showJobList(cookie, employee) {
    console.log(employee);

    logger.debug('parameters:');
    logger.debug(
      'https://projectile.office.sevenval.de/projectile/gui5ajax?action=get',
      cookie,
      {
        [employee]: [
          'DayList',
          'JobList',
          'Begin',
          'Favorites',
          'TrackingRestriction',
          'FilterCustomer',
          'FilterProject'
        ],
        Dock: ['Area.TrackingArea', 'Area.ProjectManagementArea']
      }
    );

    const body = await this.normalPostURL(
      'POST',
      'https://projectile.office.sevenval.de/projectile/gui5ajax?action=get',
      cookie,
      {
        [employee]: [
          'DayList',
          'JobList',
          'Begin',
          'Favorites',
          'TrackingRestriction',
          'FilterCustomer',
          'FilterProject'
        ],
        Dock: ['Area.TrackingArea', 'Area.ProjectManagementArea']
      }
    );

    logger.debug(JSON.stringify(body));

    /**
     * get name and NO. of Employee Job
     */
    const temp = body['values'][employee][11]['v'];
    const joblist = []; // const because NO reassignment happens, just adding to it -> valid

    for (let i = 0; i < temp.length; i++) {
      joblist.push(temp[i]);
    }

    const advJoblist = [];

    for (let i = 0; i < joblist.length; i++) {
      const obj = {};
      obj.name = body['values'][joblist[i]][32]['v']; // TODO:  to retrieve index of jobname and joblink
      obj.no = body['values'][joblist[i]][11]['v'];
      obj.remainingTime = body['values'][joblist[i]][33]['v'];
      obj.limitTime = body['values'][joblist[i]][34]['v'];
      obj.Totaltime = body['values'][joblist[i]][10]['v'];
      advJoblist.push(obj);
    }
    this.joblist = [];
    // get an actual copy of the joblist fetched from server
    this.joblist = advJoblist; // TODO why a copy?
    return advJoblist;
  }

  /**
   *
   * @param method
   * @param url
   * @param cookie
   * @param body
   * @returns {Promise.<T>}
   */
  normalPostURL(method, url, cookie, body) {
    return new Promise((resolve, reject) => {
      const options = this.option(method, url, cookie, body);
      request(options, function(error, response, body) {
        if (error) {
          reject(error);
        } else {
          resolve(body);
        }
      });
    });
  }

  /**
   *
   * @param cookie
   * @returns {Promise} Employee
   * # possible Error Case: wrong login data.
   */
  async getEmployee(cookie) {
    // Überprüfe ob Request in Ordnung ging
    const body = await this.normalPostURL(
      'POST',
      'https://projectile.office.sevenval.de/projectile/gui5ajax?action=action',
      cookie,
      {
        ref: 'Start',
        name: '*',
        action: 'TimeTracker1',
        Params: {}
      }
    );

    try {
      const EmplN = JSON.parse(body['values']['Dock'][0]['v'][0])['a'];
      const temp = EmplN.substr(1);
      return temp;
    } catch (error) {
      throw new Error('Ungültige Login Daten. Bitte überprüfen.');
    }
  }

  /**
   * normalize the duration value
   *
   * @param {string} duration value
   *
   * @returns {string} duration value that is cleaned to x.xx
   */
  async normalizetime(time) {
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
<<<<<<< HEAD
   * Helper function to replace special characters
   * @param {*} str
   * @returns {*} string with replaced special characters
=======
   * Helper function to escape strings
   *
   * @param {*} str
   *
   * @returns {*} escaped string
>>>>>>> development
   */
  escapeRegExp(str) {
    // eslint-disable-next-line
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
  }

  /**
   * Helper function to ensure the retrieved daylist is up to date even if a second projectile session is active and
   * alters content
   *
   * @param {*} cookie
   * @param {*} employee
   */
  async refreshProjectile(cookie, employee) {
    const result = await this.normalPostURL(
      'POST',
      'https://projectile.office.sevenval.de/projectile/gui5ajax?action=action',
      cookie,
      {
        'ref': employee,
        'name': '*',
        'action': 'Reload',
        'Params': {}
      }
    );
    return result;
  }

  /**
   * Helper function to extract daylist info neccessary for further use from data received through request to projectile
   *
   * @param {*} cookie
   * @param {*} employee
   * @param {*} answer - body retrieved from request to projectile
   *
   * @return {*} processedAnswer - processed data containing only DayList entries and their corresponding line numbers
   */
  async processAnswer(cookie, employee, answer) {
    const processedAnswer = [];
    for (const index in answer['values']) {
<<<<<<< HEAD
      // recognize a DayList Entry through keyword 'DayList'
=======
      // recognize a DayList Entry through splitting index and checking for "DayList" at [1]
>>>>>>> development
      const indexSplit = index.split('|');
      if (indexSplit[1] === 'DayList') {
        // index 5, Time; 8, What; 28, Note; 31, Day
        const obj = {
          'time': answer['values'][index][5]['v'],
          'activity': answer['values'][index][8]['v'],
          'note': answer['values'][index][28]['v'],
          'date': answer['values'][index][31]['v'],
          'line': indexSplit[2],
          'lineSelector': index
        };
        processedAnswer.push(obj);
      }
    }
    return processedAnswer;
  }

  /**
   * Function to get the DayList for a specific date.
   *
   * @param {*} cookie
   * @param {*} employee
   * @param {*} date
   *
   * @return {*} processedAnswer - processed data containing only DayList entries (time, activity, note, date) and
   * their corresponding line numbers
   */
  async getDayListNG(cookie, employee, date) {
    let resultToReturn = {};
    logger.debug('getDayListNG() -> Trying to get complete DayList for specific date.');
    // set date
    const resultProjectile = await this.normalPostURL(
      'POST',
      'https://projectile.office.sevenval.de/projectile/gui5ajax?action=commit',
      cookie,
      {
        values: {
          [employee]: [
            {
              n: 'Begin',
              v: date + 'T00:00:00'
            }
          ]
        }
      }
    );
    /*
      incomplete reply usually is < 5000 characters, better solution to try to access an entry?
      or look at size of reply?
    */
    if (JSON.stringify(resultProjectile).length < 5000) {
      logger.info('getDayListNG() -> too small reply from set day request recognized. Desired info not contained.');
      logger.info('getDayListNG() -> Refreshing projectile tracker and trying to get complete info this way.');
      const resultRefresh = await this.refreshProjectile(cookie, employee);
      resultToReturn = await this.processAnswer(cookie, employee, resultRefresh);
    } else {
      resultToReturn = await this.processAnswer(cookie, employee, resultProjectile);
    }
    logger.info('getDayListNG() -> processedAnswer() result is ' + resultToReturn.length + ' entries wide.');
    // logger.debug('getDayListNG() -> result: ' + JSON.stringify(result, null, 2));
    return resultToReturn;
  }

  /**
   * Function to get the DayList for a specific date.
   *
   * @param {*} cookie
   * @param {*} employee
   * @param {*} date
   *
   * @return {*} processedAnswer - processed data containing only DayList entries (time, activity, note, date) and
   * their corresponding line numbers
   */
  async getDayListNG2(cookie, employee, date) {
    await this.setCalendarDate(date, cookie, employee);
    let resultToReturn = {};
    logger.debug('getDayListNG2() -> Trying to get complete DayList for specific date. Date set before!');
    // get tracker infos
    const resultProjectile = await this.normalPostURL(
      'POST',
      'https://projectile.office.sevenval.de/projectile/gui5ajax?action=get',
      cookie,
      {
        [employee]:
        [
          'DayList',
          'JobList',
          'Begin'
        ]
      }
    );
    /*
      incomplete reply usually is < 5000 characters, better solution to try to access an entry?
      or look at size of reply?
    */
    if (JSON.stringify(resultProjectile).length < 5000) {
      logger.info('getDayListNG2() -> too small reply from set day request recognized. Desired info not contained.');
      logger.info('getDayListNG2() -> Refreshing projectile tracker and trying to get complete info this way.');
      const resultRefresh = await this.refreshProjectile(cookie, employee);
      resultToReturn = await this.processAnswer(cookie, employee, resultRefresh);
    } else {
      resultToReturn = await this.processAnswer(cookie, employee, resultProjectile);
    }
    logger.info('getDayListNG2() -> processedAnswer() result is ' + resultToReturn.length + ' entries wide.');
    // logger.debug('getDayListNG2() -> result: ' + JSON.stringify(result, null, 2));
    return resultToReturn;
  }

  /**
   * Helper function to check if the content in projectile actually changed!
   *
   * @param {*} dayListBeforeChange
   * @param {*} dayListAfterChange
   *
   * @return {*} changeDetected true/false
   */
  async recognizeChange(dayListBeforeChange, dayListAfterChange) {
    logger.debug('recognizeChange() -> Checking the dayLists for changes - if booking was successfull.)');
    let changeDetected = false;
    for (const index in dayListBeforeChange) {
      if (JSON.stringify(dayListBeforeChange[index]) !== JSON.stringify(dayListAfterChange[index])) {
        changeDetected = true;
      }
    }
    logger.debug('recognizeChange() -> changeDetected status: ' + changeDetected);
    return changeDetected;
  }

  /**
   * Helper function to find the last occurence of a specific date in a daylist that seem to cover more than one day
   *
   * @param {*} dayListBeforeChange dayList before booking
   * @param {*} date date of target day
   *
   * @return {*} dateLastFoundLine - line number to save to
   */
  async getCorrectLineSelector(dayListBeforeChange, date) {
    let dateLastFoundLine = 0;
    let counter = 0;
    for (const index in dayListBeforeChange) {
      if (dayListBeforeChange[index].date === date) {
        dateLastFoundLine = counter;
      }
      counter++;
    }
    return dateLastFoundLine;
  }

  /**
   * Function to save a single entry to projectile
   * Gets correct Lineselector, looks for occuring problems, checks if dayList really changed
   *
   * @param {*} cookie projectile cookie
   * @param {*} employee projectile employee ID
   * @param {*} date date of target day
   * @param {*} time task duration
   * @param {*} project project ID
   * @param {*} note task description
   *
   * @return {*} returnValue - true/false
   */
  async saveEntryNG(cookie, employee, date, time, project, note) {
    let dayListBeforeChange = await this.getDayListNG(cookie, employee, date);
    logger.debug('saveEntryNG2() -> dayListBeforeChange: ' + JSON.stringify(dayListBeforeChange, null, 2));

    let lineSelector = await this.getCorrectLineSelector(dayListBeforeChange, date);

    if (dayListBeforeChange.length >= 49) {
      logger.warn('saveEntryNG() -> Unexpected array length of dayListBeforeChange.');
      logger.debug('saveEntryNG() -> Daylist suggests a length of ' + dayListBeforeChange.length + ' where getCorrectLineSelector() ' +
      'finds ' + lineSelector + ' to be the correct target line. getDayListNG seem have returned a week long daylist ' +
      'instead of a single day.');
    }
    logger.debug('saveEntryNG() -> lineSelector: ' + lineSelector);
    // String to access the listEntry
    const listEntry = dayListBeforeChange[lineSelector].lineSelector;

    // set entry
    // normalizing takes place in setEntry()
    const item = {
      'duration': time,
      'activity': project,
      'note': note
    };
    await this.setEntry(cookie, item, listEntry);

    // save entry
    const body = await this.saveEntries(cookie, employee);

    let returnValue = {
      returnValue: false
    };

    // check for problems in results
    const problemsFoundResult = await this.problemsFound(body);
    if (problemsFoundResult) {
      logger.warn('saveEntryNG() -> ' + body.problems.length + ' problems found. ' + problemsFoundResult);
      await this.printProblems(body.problems);
      returnValue['errors'] = body.problems;
    } else {
      let dayListAfterChange = await this.getDayListNG(cookie, employee, date);
      returnValue.returnValue = await this.recognizeChange(dayListBeforeChange, dayListAfterChange);
    }
    return returnValue;
  }

  // FIXME fix encoding issue that makes this hack necessary!
  /**
   * normalize a note (replacing umlauts)
   *
   * @param {*} note note to normalize
   *
   * @return {*} normalized note
   */
  async normalizeComment(note) {
    const result = note.replace(/ä/g, 'ae')
      .replace(/Ä/g, 'Ae')
      .replace(/ü/g, 'ue')
      .replace(/Ü/g, 'Ue')
      .replace(/ö/g, 'oe')
      .replace(/Ö/g, 'Oe')
      .replace(/ß/g, 'ss')
      .replace(/\r?\n|\r/g, ' ');
    return result;
  }

  /**
   * set an entry in time tracker (before saving later) - (supports saveEntry() and) updateEntry()
   *
   * @param {*} cookie cookie to access projectile
   * @param {*} item item object containing the booking entry values
   * @param {*} listEntry string that identifies a list entry in projectile
   *
   * @return {*} result of the request
   */
  async setEntry(cookie, item, listEntry) {
    const duration = (item.duration ? parseFloat(item.duration) : '0'); // catch empty duration
    const activity = item.activity;
    const note = await this.normalizeComment(item.note);
    const result = await this.normalPostURL(
      'POST',
      'https://projectile.office.sevenval.de/projectile/gui5ajax?action=commit',
      cookie,
      {
        values: {
          [listEntry]: [
            {
              n: 'Time',
              v: duration
            },
            {
              n: 'What',
              v: activity
            },
            {
              n: 'Note',
              v: note
            }
          ]
        }
      }
    );
    return result;
  }

  /**
   * save an entry or entries in time tracker
   *
   * @param {*} cookie cookie to access projectile
   * @param {*} employee employee id to access projectile
   *
   * @return {*} result of the request
   */
  async saveEntries(cookie, employee) {
    const body = await this.normalPostURL(
      'POST',
      'https://projectile.office.sevenval.de/projectile/gui5ajax?action=action',
      cookie,
      {
        ref: employee,
        name: '*',
        action: 'Save',
        Params: {}
      }
    );
    return body;
  }

  /**
   * Check for error messages in result. If none present asume operation was successfull (false)
   *
   * @param {*} json check for problems in the provided body from request
   *
   * @return {*} return whether problems were found or not
   */
  async problemsFound(body) {
    if (body.problems) {
      if (body.problems.length > 0) {
        return true;
      }
    }
    return false;
  }

  /**
   * Print error messages. Assume that input is an array of problems (body.problems)
   *
   * @param {*} json
   */
  async printProblems(problems) {
    logger.warn('checkProblems -> Found warnings and/or error messages.');
    if (problems.length > 0) {
      problems.forEach(item => {
        logger.warn(item.message, item.severity);
      });
    }
  }

  /**
   * update an entry or multiple entries on projectile on specific date
   *
   * @param {*} cookie
   * @param {*} employee
   * @param {*} json
   *
   * @return {*} returnValue showing if task was completed successfully
   */
  async updateEntry(cookie, employee, json) {
    logger.debug('updateEntry() --> number of entry objects: ' + json.entries.length);
    let returnValue = {
      'returnValue': false
    };
    if (await this.setCalendarDate(json.date, cookie, employee)) {
      // set entry/entries
      // json = {date, entries:[{ date, duration, activtiy, note}]}
      for (const item of json.entries) { // for...in => index no; for..of => content
        logger.debug('updateEntry -> provided object: ' + JSON.stringify(item, null, 2));
        logger.debug('updateEntry -> line selector: ' + item.line);
        logger.debug('updateEntry -> preparing entry in projectile');
        const listEntry = '+.|DayList|' + item.line + '|' + employee;
        // set entries
        await this.setEntry(cookie, item, listEntry);
        logger.debug('updateEntry -> Entry for line ' + item.line + ' update prepared in projectile.');
      }

      // save changes
      const body = await this.saveEntries(cookie, employee);

      // check for problems in results
      const problemsFoundResult = await this.problemsFound(body);
      if (problemsFoundResult) {
        logger.warn('updateEntry() -> ' + body.problems.length + ' problems found. ' + problemsFoundResult);
        await this.printProblems(body.problems);
        returnValue['errors'] = body.problems;
        returnValue.returnValue = false;
      } else {
        returnValue.returnValue = true;
      }
    }
    return returnValue;
  }

  /**
   * Function to delete an entry from projectile
   * @param {*} cookie
   * @param {*} employee
   * @param {*} number line selector number
   *
   * @returns {*} success
   */
  async deleteEntry(cookie, employee, number) {
    // mark entry for deletion, get popup response, extract ref and execute action to delete
    const dayList = await this.getDayListToday(cookie, employee);
    const listEntry = dayList[number];
    const body = await this.normalPostURL(
      'POST',
      'https://projectile.office.sevenval.de/projectile/gui5ajax?action=action',
      cookie,
      {
        ref: employee,
        name: 'DayList',
        action: 'RowAction_Delete',
        Params: { ref: listEntry }
      }
    );
    const secondBody = await this.normalPostURL(
      'POST',
      'https://projectile.office.sevenval.de/projectile/gui5ajax?action=action',
      cookie,
      {
        ref: body.dialog.ref,
        name: '*',
        action: '+0+1__null_',
        Params: { isDialog: true }
      }
    );
    /*
      expected behaviour: after successfull deletion of a listEntry, the secondBody contains the line:
      "close":["1519808571525-0"],"clearProblems":["1519808571525-0"]} containing the ref value from first request twice
      */
    const bodyString = JSON.stringify(secondBody);
    const confirmDeletion = bodyString.slice(bodyString.indexOf('"close":["'));
    const re = new RegExp(body.dialog.ref, 'g');
    const delMatch = confirmDeletion.match(re);
    let count = 0;
    if (delMatch) {
      count = delMatch.length;
    }
    // DEBUG
    // logger.debug(count + ' DELETE FCT ' + body.dialog.ref);
    if (count === 2) {
      return true;
    } else {
      logger.warn('There might be an issue while deleting a listEntry: count: ' + count + ' ref: ' + body.dialog.ref);
      return false;
    }
  }

  // TODO obosolete once removed from deleteEntry function
  /**
   * Function to get a day's dayList from projectile
   * @param {*} cookie
   * @param {*} employee
   *
   * @returns {*} Returns dayList array
   */
  async getDayListToday(cookie, employee) {
    const temp = await this.normalPostURL(
      'POST',
      'https://projectile.office.sevenval.de/projectile/gui5ajax?action=get',
      cookie,
      {
        Dock: ['Area.TrackingArea'],
        [employee]: [
          'DayList',
          'JobList',
          'Begin',
          'Favorites',
          'TrackingRestriction',
          'FilterCustomer',
          'FilterProject'
        ]
      }
    );

    // DEBUG
    console.log('getDayListToday() -> result: ' + temp['values'][employee].length + ' entries ' +
      JSON.stringify(temp['values'][employee]).length + ' characters');

    const dayList = await temp['values'][employee][2]['v'];
    return dayList;
  }

  /**
   * Function to set a calender date in projectile
   *
   * @param {*} date
   * @param {*} cookie
   * @param {*} employee
   *
   * @returns {*} Returns true/false
   */
  async setCalendarDate(date, cookie, employee) {
    const dateComplete = date + 'T00:00:00';
    // open timetracker page and check for current date
    const answer0 = await this.normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=get', cookie, {
      [employee]: [
        'Begin',
        'TrackingRestriction'
      ]
    });
    if(answer0.values[employee][1].v !== date) {
      // set date to desired date
      const answer = await this.normalPostURL(
        'POST',
        'https://projectile.office.sevenval.de/projectile/gui5ajax?action=commit',
        cookie,
        {
          values: {
            [employee]: [
              {
                n: 'Begin',
                v: dateComplete
              }
            ]
          }
        }
      );
      // reduce bodyString to contain only the first listEntry
      // BE AWARE returned value depends on currently set date, ONLY if a date change happens the expected returned body
      // is received, else its just a "true" value within a smaller json
      let bodyString = JSON.stringify(answer);
      if (bodyString.includes('update"}]')) {
        bodyString = bodyString.slice(0, bodyString.indexOf('update"}]') + 9);
        return bodyString.includes(date); // standard behaviour - date gets changed
      } else {
        logger.warn('setCalenderDate --> Something went wrong. Date update not successfull.');
        return false;
      }
    } else {
      logger.info('setCalenderDate --> date is already set to desired date ' + date + '. No further action necessary.');
      return true;
    }
  }

  /**
   * Function to allow deletion of projectile entry
   *
   * @param {*} date
   * @param {*} listEntry
   *
   * @returns {*} Return true/false
   */
  async delete(date, listEntry) {
    const cookie = await this.login();
    const employee = await this.getEmployee(cookie);
    if (await this.setCalendarDate(date, cookie, employee)) {
      logger.debug('delete() -> setCalenderDate() - successfully.');
      if (await this.deleteEntry(cookie, employee, listEntry)) {
        logger.debug('Finished deleting entry ' + listEntry + ' for date ' + date);
        return true;
      } else {
        logger.error('Error while deleting entry ' + listEntry + ' for date ' + date);
        return false;
      }
    }
    return false;
  }

  /**
   * Helper function to retrieve the joblist from projectile
   *
   * @param {*} cookie
   * @param {*} employee
   *
   * @returns joblist
   */
  async fetchNewJobList(cookie, employee) {
    logger.debug('fetching new data for jobList...');
    return await this.showJobList(cookie, employee);
  }

  /**
   * Function to execute the saving a booking entry to projectile
   *
   * @param {*} date
   * @param {*} time
   * @param {*} project
   * @param {*} note
   * @param {*} cookie
   * @param {*} employee
   *
   * @returns {*} returnValue true/false
   */
  async saveNG(date, time, project, note, cookie, employee) {
    logger.debug('saving data...');
    /* const cookie = await exports.login(); */
    /* const employee = await this.getEmployee(cookie); */
    // let jobList = await exports.jobList(cookie, employee); // fetch the actual joblist.
    // const saveEntryResult = await this.saveEntry(cookie, employee, time, project, note, date);
    if (await this.setCalendarDate(date, cookie, employee)) {
      const saveEntryResult = await this.saveEntry(cookie, employee, date, time, project, note);
      // saveEntry returns true or false depending on save result
      // returns { returnValue: false, errors: errorArray }
      logger.debug('saveEntryResult --> ' + JSON.stringify(saveEntryResult, null, 2));
      if (saveEntryResult.returnValue) {
        logger.debug('Finished saving entry.');
        // return true;
        // return saveEntryResult;
      }
      return saveEntryResult;
    }
    return {
      returnValue: false
    };
  }

  /**
   * Function to save a booking entry to projectile
   *
   * @param {*} date
   * @param {*} time
   * @param {*} project
   * @param {*} note
   * @param {*} cookie
   * @param {*} employee
   *
   * @returns {*} saveEntryResult true/false
   */
  async save(date, time, project, note, cookie, employee) {
    logger.debug('saving data...');
    let saveEntryResult;
    saveEntryResult = await this.saveEntryNG(cookie, employee, date, time, project, note);
    /*
        if (await this.setCalendarDate(date, cookie, employee)) {
          saveEntryResult = await this.saveEntryNG2(cookie, employee, date, time, project, note);
          // saveEntry returns true or false depending on save result
          // returns { returnValue: false, errors: errorArray }
          logger.debug('saveEntryResult --> ' + JSON.stringify(saveEntryResult, null, 2));
          if (saveEntryResult.returnValue) {
            logger.debug('Finished saving entry.');
            // return true;
            // return saveEntryResult;
          }
          return saveEntryResult;
        }
    */
    return saveEntryResult;
  }

  /**
   * Function to get all entries in a time range
   *
   * @param {*} startDate
   * @param {*} endDate
   *
   * @returns {*} Returns the response
   */
  async getallEntriesInTimeFrame(startDate, endDate) {
    startDate = startDate + 'T00:00:00';
    endDate = endDate + 'T00:00:00';
    const cookie = await this.login();
    await this.normalPostURL(
      'POST',
      'https://projectile.office.sevenval.de/projectile/gui5ajax?action=commit',
      cookie,
      {
        values: {
          Start: [{ n: 'Field_TimeTrackerDate', v: startDate }, { n: 'Field_TimeTrackerDate2', v: endDate }]
        }
      }
    );
    const response = await this.normalPostURL(
      'POST',
      'https://projectile.office.sevenval.de/projectile/gui5ajax?action=action',
      cookie,
      { ref: 'Start', name: '*', action: 'TimeTracker1', Params: {} }
    );
    return response;
  }
}

module.exports = ProjectileService;
