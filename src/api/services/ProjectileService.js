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


    // fs.writeFile("answer.json", JSON.stringify(body), (err)=>{.debug()});
    // TODO TO CHECK necessary?

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
   *  function to test if projectile webserver is alive/reachable
   *  @returns {boolean} status
   */
  async projectileAlive() {
    const status = await rp({ uri: 'https://projectile.office.sevenval.de/projectile/start', strictSSL: false })
      .then(function() {
        logger.silly('projectileAlive -> projectile is alive.');
        return true;
      })
      .catch(function(err) {
        logger.warn('projectileAlive -> projectile server seems to be unreachable.');
        logger.silly(err);
        return false;
      });
    return status;
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
   * @param {duration} duration value
   * @returns {duration} duration value that is cleaned to x.xx
   *
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

  // helper
  /**
   *
   * @param {*} str
   */
  escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
  }

  // TODO: Refactoring Neccessary
  // Save entry to projectile

  /**
   *
   * helper function for saveEntry - check for problems that indicate saving was NOT successfull
   *
   */
  async checkProblems(bodyString) {
    let errorArray = [];
    if (bodyString.includes('"problems":[{"ref"')) {
      logger.warn("saveEntry -> Recognizing problem status: problem message found! returnValue can't be true!");
      const indexOfErrorArrayStart = bodyString.lastIndexOf('problems":[');
      const indexOfErrorArrayEnd = bodyString.slice(indexOfErrorArrayStart).indexOf('"}],');
      logger.warn(
        'saveEntry -> Error array: ',
        'Start: ',
        indexOfErrorArrayStart,
        'length:',
        indexOfErrorArrayEnd,
        bodyString.slice(indexOfErrorArrayStart + 10, indexOfErrorArrayStart + indexOfErrorArrayEnd + 3)
      );
      errorArray = JSON.parse(
        bodyString.slice(indexOfErrorArrayStart + 10, indexOfErrorArrayStart + indexOfErrorArrayEnd + 3)
      );
      logger.warn('saveEntry -> Error array itms: ', errorArray.length);
      errorArray.forEach(item => {
        logger.warn(item.message, item.severity);
      });
      // array contains: ref, message, severity
      // error message should be returned!
    }
    return errorArray;
  }

  /**
   *
   * @param {*} cookie
   * @param {*} employee
   */
  async refreshProjectile(cookie, employee) {
    const answer = await this.normalPostURL(
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
  }

  // FIXME too many statements
  /**
   *
   * @param {*} cookie projectile cookie
   * @param {*} employee projectile employee ID
   * @param {*} time task duration
   * @param {*} project project ID
   * @param {*} note task description
   */
  async saveEntryNG(cookie, employee, date, time, project, note) {
    const dayList = await this.getDayListToday(cookie, employee);
    // const dayList = await this.getDayListNG(cookie, employee, date);
    logger.debug('saveEntry -> dayList: ' + JSON.stringify(dayList, null, 2));
    /*
      extend the "lines" range of originally 6 depending on amount of existing entries in dayList! else insertion of
      larger lists
      than 7 entries per day fail to save successfully.
      */
    let lineSelector = dayList.length - 1;
    if (dayList.length >= 49) {
      // depends if one day or whole weeks is returned from projectile - when what gets returned is still weird
      lineSelector = dayList.length - 43;
    }

    logger.debug('saveEntry -> lineSelector: ' + lineSelector);
    // let lineSelector = dayList.length - 43; // case that 7 days are in dayList
    /* if (dayList && dayList.length < 49) { // case that 1 day is in dayList
        lineSelector = dayList.length -1;
      } */
    const listEntry = dayList[lineSelector];

    // "normalize" note - Q'n'D fix, until final solution found - UMLAUTE
    // normalizing takes place in setEntry()
    const item = {
      'duration': time,
      'activity': project,
      'note': note
    };
    const debug = await this.setEntry(cookie, item, listEntry);

    console.log('#####' + JSON.stringify(debug, null, 2));
    // SET ENTRY DEFEKT?

    // save entry
    // const body = this.saveEntries(cookie, employee);
    // DEBUG
    const body = '';

    let bodyString = JSON.stringify(body);
    const entries = [];

    // FIXME - external function
    // check for successfull saving
    // pattern to matches within a note! e.g.: 2 tesing vs. testing vs. testing 2
    // " gets stored as \" in projectile json
    const re = new RegExp('"v":"' + this.escapeRegExp(note).replace(/[\"]/g, '\\\\$&') + '","d"', 'g');
    // TODO enough to check for notes?! :( must be another way if there is note present!)

    // logger.debug('RegEx Debug: ' + escapeRegExp(note).replace(/[\"]/g, "\\\\$&"));
    // logger.debug(note.replace(/[\"]/g, "\\\$&"));

    // from server reply create list of entries of "note" matches to check them further, ideally there is only one
    let count = 0;
    const bodyStringMatch = bodyString.match(re);
    if (bodyStringMatch) {
      count = bodyStringMatch.length; // "api * ! \" ' url1" zu matchen!
    }
    logger.debug('saveEntry -> Occurence count of note text: ' + count);
    for (let i = 0; i < count; i++) {
      // find the note
      const indexOfNote = bodyString.search(re);
      const bodyStringEntry = bodyString.slice(0, indexOfNote + 5); // 0 to note position, temp
      // find the beginnig of that block
      const indexOfDayList = bodyStringEntry.lastIndexOf('"+.|DayList|');
      // position of DayList in that new shorter bodyStringEntry
      let bodyStringEntryCut = bodyString.slice(indexOfDayList); // from DayList connected to note to end
      // find the end of that block
      const indexOfEnd = bodyStringEntryCut.indexOf('"options":"update"}],'); // find the end of that block
      bodyStringEntryCut = bodyStringEntryCut.slice(0, indexOfEnd + 21);
      // 21 = length of search pattern, extract only the block we are interested in

      entries.push('{' + bodyStringEntryCut + '}'); // collect found block entry

      // cut the processed block out of the bodyString and keep searching
      bodyString = bodyString.slice(indexOfEnd + 21);
    }

    // evaluate results for correct return value
    let returnValue = {
      returnValue: false
    };

    entries.forEach(item => {
      // time has to be noramlized. Projectile ALWAYS returns x.xx though x,xx or x:xx may have been sent before
      // logger.debug('Länge Response TimeTracker: ' + body.values['TimeTracker!^.|Default|Employee|1|357'].length);
      if (
        body.values[employee].length >= 5 &&
        item.includes('"Time","v":' + time + ',"d"') &&
        item.includes('"What","v":"' + project + '","d"') &&
        item.includes('"Note","v":"' + note.replace(/[\"]/g, '\\$&') + '","d"')
      ) {
        // created a new entry
        returnValue = {
          returnValue: true
        };
        logger.debug('saveEntry -> While recognizing save status: created a new entry, return value: true');
      } else if (
        item.includes('"What","v":"' + project + '","d"') &&
        item.includes('"Note","v":"' + note.replace(/[\"]/g, '\\$&') + '","d"')
      ) {
        // added to an existing entry
        returnValue = {
          returnValue: true
        };
        logger.debug('saveEntry -> While recognizing save status: added to an existing entry, return value: true');
      }
    });

    // check for problem messages in projectile response that indicate saving was NOT successfull
    returnValue = await this.checkProblems(bodyString, returnValue);

    // fs.writeFile('bodyString.json', JSON.stringify(bodyString, null, 2), (err)=>{});  // Debug
    /* TODO was always causing errors! Check for good and bad case, find single binding condition
      if (bodyString.includes('"clearProblems":["')){
        logger.warn('saveEntry -> Recognizing problem status: problem message found! returnValue can\'t be true!');
        logger.warn('saveEntry -> "clearProblems" error - can\'t write to projectile - booking locked for current ' +
        'timeperiod.');
        if (returnValue.returnValue) {
          returnValue.returnValue = false;
            returnValue["errors"].push("clearProblems error, booking locked for current timeperiod");
        }
      } */
    return returnValue;
  }

  async saveEntry(cookie, employee, time, project, note) {
    const dayList = await this.getDayListToday(cookie, employee);
    logger.debug('saveEntry -> dayList: ' + JSON.stringify(dayList, null, 2));
    /*
      extend the "lines" range of originally 6 depending on amount of existing entries in dayList! else insertion of
      larger lists
      than 7 entries per day fail to save successfully.
      */
    let lineSelector = dayList.length - 1;
    if (dayList.length >= 49) {
      // depends if one day or whole weeks is returned from projectile - when what gets returned is still weird
      lineSelector = dayList.length - 43;
    }

    logger.debug('saveEntry -> lineSelector: ' + lineSelector);
    // let lineSelector = dayList.length - 43; // case that 7 days are in dayList
    /* if (dayList && dayList.length < 49) { // case that 1 day is in dayList
        lineSelector = dayList.length -1;
      } */
    const listEntry = dayList[lineSelector];

    // "normalize" note - Q'n'D fix, until final solution found - UMLAUTE
    // !!! TODO CHECK - final clean Solution necessary: Q'n'D fix in TimeularAPI -> merge
    // set time, select Project, write note -> all in one request now.
    await this.normalPostURL(
      'POST',
      'https://projectile.office.sevenval.de/projectile/gui5ajax?action=commit',
      // 'https://postman-echo.com/post',
      cookie,
      {
        values: {
          [listEntry]: [
            {
              n: 'Time',
              v: time
            },
            {
              n: 'What',
              v: project
            },
            {
              n: 'Note',
              v: note
            }
          ]
        }
      }
    );

    // save entry
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
    let bodyString = JSON.stringify(body);
    const entries = [];

    // FIXME - external function
    // check for successfull saving
    // pattern to matches within a note! e.g.: 2 tesing vs. testing vs. testing 2
    // " gets stored as \" in projectile json
    const re = new RegExp('"v":"' + this.escapeRegExp(note).replace(/["]/g, '\\\\$&') + '","d"', 'g');
    // TODO enough to check for notes?! :( must be another way if there is note present!)

    // logger.debug('RegEx Debug: ' + escapeRegExp(note).replace(/[\"]/g, "\\\\$&"));
    // logger.debug(note.replace(/[\"]/g, "\\\$&"));

    // from server reply create list of entries of "note" matches to check them further, ideally there is only one
    let count = 0;
    const bodyStringMatch = bodyString.match(re);
    if (bodyStringMatch) {
      count = bodyStringMatch.length; // "api * ! \" ' url1" zu matchen!
    }
    logger.debug('saveEntry -> Occurence count of note text: ' + count);
    for (let i = 0; i < count; i++) {
      // find the note
      const indexOfNote = bodyString.search(re);
      const bodyStringEntry = bodyString.slice(0, indexOfNote + 5); // 0 to note position, temp
      // find the beginnig of that block
      const indexOfDayList = bodyStringEntry.lastIndexOf('"+.|DayList|');
      // position of DayList in that new shorter bodyStringEntry
      let bodyStringEntryCut = bodyString.slice(indexOfDayList); // from DayList connected to note to end
      // find the end of that block
      const indexOfEnd = bodyStringEntryCut.indexOf('"options":"update"}],'); // find the end of that block
      bodyStringEntryCut = bodyStringEntryCut.slice(0, indexOfEnd + 21);
      // 21 = length of search pattern, extract only the block we are interested in

      entries.push('{' + bodyStringEntryCut + '}'); // collect found block entry

      // cut the processed block out of the bodyString and keep searching
      bodyString = bodyString.slice(indexOfEnd + 21);
    }

    // evaluate results for correct return value
    let returnValue = {
      returnValue: false
    };

    entries.forEach(item => {
      // time has to be noramlized. Projectile ALWAYS returns x.xx though x,xx or x:xx may have been sent before
      // logger.debug('Länge Response TimeTracker: ' + body.values['TimeTracker!^.|Default|Employee|1|357'].length);
      if (
        body.values[employee].length >= 5 &&
        item.includes('"Time","v":' + time + ',"d"') &&
        item.includes('"What","v":"' + project + '","d"') &&
        item.includes('"Note","v":"' + note.replace(/["]/g, '\\$&') + '","d"')
      ) {
        // created a new entry
        returnValue = {
          returnValue: true
        };
        logger.debug('saveEntry -> While recognizing save status: created a new entry, return value: true');
      } else if (
        item.includes('"What","v":"' + project + '","d"') &&
        item.includes('"Note","v":"' + note.replace(/["]/g, '\\$&') + '","d"')
      ) {
        // added to an existing entry
        returnValue = {
          returnValue: true
        };
        logger.debug('saveEntry -> While recognizing save status: added to an existing entry, return value: true');
      }
    });

    // check for problem messages in projectile response that indicate saving was NOT successfull
    returnValue = await this.checkProblems(bodyString, returnValue);

    // fs.writeFile('bodyString.json', JSON.stringify(bodyString, null, 2), (err)=>{});  // Debug
    /* TODO was always causing errors! Check for good and bad case, find single binding condition
      if (bodyString.includes('"clearProblems":["')){
        logger.warn('saveEntry -> Recognizing problem status: problem message found! returnValue can\'t be true!');
        logger.warn('saveEntry -> "clearProblems" error - can\'t write to projectile - booking locked for current ' +
        'timeperiod.');
        if (returnValue.returnValue) {
          returnValue.returnValue = false;
            returnValue["errors"].push("clearProblems error, booking locked for current timeperiod");
        }
      } */
    return returnValue;
  }


  /*
  *
  * normalize a note (replacing umlauts)
  *
  * FIXME fix encoding issue that makes this hack necessary!
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

  /*
  *
  * set an entry in time tracker (before saving later) - (supports saveEntry() and) updateEntry()
  *
  */
  async setEntry(cookie, item, listEntry) {
    // FIXME - why is ',' necessary for duration suddenly???? if other than ',' durations in projectile get's messed up
    const duration = item.duration.replace('.', ',');
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
    // TODO return true/false success/failed?!
    return result;
  }

  /*
  *
  * save an entry or entries in time tracker
  *
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

  /*
  *
  * compare the result of an update/change event
  * NOT suitable for book events, as the line of entry is unknown there!
  *
  */
  async compareChanges(body, json, employee) {
    for (const item of json.entries) {
      const duration = item.duration.replace(',', '.');
      const packageNo = item.activity;
      const note = await this.normalizeComment(item.note);
      const listEntry = '+.|DayList|' + item.line + '|' + employee;
      // compare
      if ((!body.values[listEntry][5].v === duration) || (!body.values[listEntry][8].v === packageNo) ||
        (!body.values[listEntry][28].v === note)) {
        return false;
      }
    }
    // return matches true / false
    return true;
  }

  /**
   * update an entry or multiple entries on projectile on specific date
   * @param {*} cookie
   * @param {*} employee
   * @param {*} json
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
        await this.setEntry(cookie, item, listEntry);
        logger.debug('updateEntry -> Entry for line ' + item.line + ' update prepared in projectile.');
      }
      // save changes
      const body = await this.saveEntries(cookie, employee);

      // compare changes
      returnValue.returnValue = await this.compareChanges(body, json, employee);
      logger.debug('updateEntry --> compareChanges() result is: ' + successfulUpdate);

      // in case of errors, check for problem messages and return/log them
      if (!returnValue.returnValue) {
        logger.debug('updateEntry --> compareChanges() notices problems. Am checking for details.');
        const bodyString = JSON.stringify(body);
        // check for problem messages in projectile response
        const errors = await this.checkProblems(bodyString);
        logger.warn('updateEntry --> checkProblems() found ' + errors.length + ' problems.');
        logger.errors(JSON.stringify(errors, null, 2));
        returnValue[errors] = errors;
        returnValue.returnValue = false;
        return returnValue;
      }
      return returnValue;
    } else {
      return returnValue;
    }
  }

  /**
   *
   * @param {*} cookie
   * @param {*} employee
   * @param {*} number
   */
  async deleteEntry(cookie, employee, number) {
    // mark entry for deletion, get popup response, extract ref and execute action to delete
    const dayList = await getDayListToday(cookie, employee);
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
    // logger.debug(body.dialog.structure[""][""]["0"][1].v); --> contains "Nicht erlaubt: Krank löschen" in spec case
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


  /**
   *
   * @param {*} cookie
   * @param {*} employee
   */
  async getDayListNG(cookie, employee, date) {
    const temp = await this.normalPostURL(
      'POST',
      'https://projectile.office.sevenval.de/projectile/gui5ajax?action=commit',
      cookie,
      {'values':{[employee]:[{'n':'Begin', 'v': date + 'T00:00:00'}]}}
    );
    // const dayList = await temp['values'][employee][2]['v'];
    // Length of daylist can be retrieved from: temp['values'][employee][1].v.length
    console.log(JSON.stringify(temp, null, 2));
    let dayList = [];
    for (const item of temp['values'][employee]) {
      if (item.n === 'DayList') {
        dayList = item.v;
      }
    }
    // const dayList = await temp['values'][employee][2].v;

    // WENN LEER, RUFE REFRESH AUF? :)

    return dayList;
  }

  /**
   *
   * @param {*} cookie
   * @param {*} employee
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
    const dayList = await temp['values'][employee][2]['v'];

    return dayList;
  }

  /**
   *
   * @param {*} date
   * @param {*} cookie
   * @param {*} employee
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

    // alternative to check for current date: bodyString.includes('[{"n":"Begin","d":true}]')
    if(!answer0.values[employee][1].v === date) {
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

  // e.g.: index.delete('2018-02-01', 0)
  /**
   *
   * @param {*} date
   * @param {*} listEntry
   */
  async delete(date, listEntry) {
    const cookie = await this.login();
    const employee = await this.getEmployee(cookie);
    if (await setCalendarDate(date, cookie, employee)) {
      logger.debug('setCalenderDate was successful in delete function.');
      if (await deleteEntry(cookie, employee, listEntry)) {
        logger.debug('Finished deleting entry ' + listEntry + ' for date ' + date);
      } else {
        logger.error('Error while deleting entry ' + listEntry + ' for date ' + date);
      }
    }
  }

  // simplified for API use
  /**
   *
   * @param {*} cookie
   * @param {*} employee
   */
  async jobList(cookie, employee) {
    logger.debug('fetching data for jobList.');
    return this.showJobList(cookie, employee);
  }

  /**
   *
   * @param {*} cookie
   * @param {*} employee
   */
  async fetchNewJobList(cookie, employee) {
    logger.debug('fetching new data for jobList...');
    const data = await this.showJobList(cookie, employee);
    return data;
  }

  // simplified for API Use
  /**
   *
   * @param {*} date
   * @param {*} time
   * @param {*} project
   * @param {*} note
   * @param {*} cookie
   * @param {*} employee
   */
  async saveNG(date, time, project, note, cookie, employee) {
    logger.debug('saving data...');
    /* const cookie = await exports.login(); */
    /* const employee = await this.getEmployee(cookie); */
    // let jobList = await exports.jobList(cookie, employee); // fetch the actual joblist.
//     const saveEntryResult = await this.saveEntry(cookie, employee, time, project, note, date);
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
    /* return {
      returnValue: false
    }; */
    return saveEntryResult;
    // return false;
  }
  /*
  async function blubb () {
    await exports.save('2018-03-05', '2', '2759-62', 'note');
    await exports.delete('2018-03-05', '0');
  }
  blubb();
  */

  /*
   * ....
   */
  // Split Joblist into one without limit and one array with packages with limit
  async joblistLimited(list, limitTime, callback) {
    // "limitTime" is a fieldname
    const limitedJobList = [];

    // transform array to a bundle of property values
    const temp = list.map(item => {
      return item[limitTime];
    });

    // create copy
    const iterationArr = temp.slice(0);

    iterationArr.forEach(item => {
      if (callback(item)) {
        const a = list.splice(temp.indexOf(item), 1)[0];
        limitedJobList.push(a);
        temp.splice(temp.indexOf(item), 1);
      }
    });
    // array of limited packages
    logger.debug('exports.joblistLimited -> limitedJobList: ', JSON.stringify(limitedJobList, null, 2));
    return limitedJobList;
    /* logger.debug(list);
      logger.debug(limitedJobList); */
  }

  /*  async getDayListToday() {
    const cookie = await this.login();
    const employee = await this.getEmployee(cookie);
    return getDayListToday(cookie, employee);
  };

 async setCalendarDate (date) {
    const cookie = await this.login();
    const employee = await this.getEmployee(cookie);
    return setCalendarDate(date, cookie, employee);
  };
 */

 // simplified for API Use
  /**
   *
   * @param {*} date
   * @param {*} time
   * @param {*} project
   * @param {*} note
   * @param {*} cookie
   * @param {*} employee
   */
  async save(date, time, project, note, cookie, employee) {
    logger.debug('saving data...');
    console.log('WTF SAVING');
    let saveEntryResult;
    /* const cookie = await exports.login(); */
    /* const employee = await this.getEmployee(cookie); */
    // let jobList = await exports.jobList(cookie, employee); // fetch the actual joblist.
    if (await this.setCalendarDate(date, cookie, employee)) {
      saveEntryResult = await this.saveEntry(cookie, employee, time, project, note);
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
    /* return {
      returnValue: false
    }; */
    return saveEntryResult;
    // return false;
  }
  /*
  async function blubb () {
    await exports.save('2018-03-05', '2', '2759-62', 'note');
    await exports.delete('2018-03-05', '0');
  }
  blubb();
  */


  /**
   *
   * @param {*} startDate
   * @param {*} endDate
   */
  async getallEntriesInTimeFrame(startDate, endDate) {
    startDate = startDate + 'T00:00:00';
    endDate = endDate + 'T00:00:00';
    const cookie = await this.login();
    // const employee = await exports.getEmployee(cookie); // FIXME necessary?!
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
    // handled with above normalPostURL request --> await normalPostURL('POST',
    // "https://projectile.office.sevenval.de/projectile/gui5ajax?action=commit", cookie ,
    // {"values":{"Start":[{"n":"Field_TimeTrackerDate2","v":endDate}]}} );
    const response = await this.normalPostURL(
      'POST',
      'https://projectile.office.sevenval.de/projectile/gui5ajax?action=action',
      cookie,
      { ref: 'Start', name: '*', action: 'TimeTracker1', Params: {} }
    );
    // OBOSLETE? fs.writeFile('daylist.json', JSON.stringify(response,null,2), (err)  logger.error(err));
    // TODO necessary? obsolete? // error got triggered, whats wrong there?!
    return response;
  }
}

module.exports = ProjectileService;
