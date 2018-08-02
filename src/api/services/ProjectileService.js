const rp = require('request-promise-native');
const request = require('request');
const logger= require('../../lib/logger');

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
        password: password,
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
   * @param {*} method
   * @param {*} url
   * @param {*} cookie
   * @param {*} body
   */
  option(method, url, cookie, body) {
    const options = {
      method,
      url,
      headers:
        {
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
   * @param {*} method
   * @param {*} url
   * @param {*} cookie
   * @param {*} body
   */
  normalPostURL(method, url, cookie, body) {
    return new Promise((resolve, reject) => {
      const options = option(method, url, cookie, body);
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
   * @param {*} cookie
   */
  async getEmployee(cookie) {
    // Überprüfe ob Request in Ordnung ging
    const body = await this.normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=action',
      cookie, {
        'ref': 'Start',
        'name': '*',
        'action': 'TimeTracker1',
        'Params': {}
      });
    try {
      const EmplN = JSON.parse(body['values']['Dock'][0]['v'][0])['a'];
      const temp = EmplN.substr(1);
      return temp;
    } catch (error) {
      throw new Error('Ungültige Login Daten. Bitte überprüfen.');
    }
  }

  /**
   *
   * @param {*} time
   */
  async normalizeTime(time) {
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
 *
 * helper function for saveEntry - check for problems that indicate saving was NOT successfull
 *
 */
  async checkProblems(bodyString, returnValue) {
    if (bodyString.includes('"problems":[{"ref"')) {
      logger.warn('saveEntry -> Recognizing problem status: problem message found! returnValue can\'t be true!');
      const indexOfErrorArrayStart = bodyString.lastIndexOf('problems":[');
      const indexOfErrorArrayEnd = bodyString.slice(indexOfErrorArrayStart).indexOf('"}],');
      logger.warn('saveEntry -> Error array: ', 'Start: ', indexOfErrorArrayStart, 'length:', indexOfErrorArrayEnd,
        bodyString.slice(indexOfErrorArrayStart + 10, indexOfErrorArrayStart + indexOfErrorArrayEnd + 3));
      const errorArray = JSON.parse(bodyString.slice(indexOfErrorArrayStart + 10, indexOfErrorArrayStart +
        indexOfErrorArrayEnd + 3));
      logger.warn('saveEntry -> Error array itms: ', errorArray.length);
      errorArray.forEach((item) => {
        logger.warn(item.message, item.severity);
      });
      // array contains: ref, message, severity
      // error message should be returned!
      returnValue = {
        returnValue: false,
        errors: errorArray
      };
    }
    return returnValue;
  }

  /**
   *
   * @param {*} cookie
   * @param {*} employee
   * @param {*} time
   * @param {*} project
   * @param {*} note
   */
  async saveEntry(cookie, employee, time, project, note) {
    const dayList = await this.getDayListToday(cookie, employee);
    logger.debug('saveEntry -> dayList: ' + JSON.stringify(dayList, null, 2));
    /*
      extend the "lines" range of originally 6 depending on amount of existing entries in dayList! else insertion of
      larger lists
      than 7 entries per day fail to save successfully.
      */
    lineSelector = dayList.length - 1;
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
    await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=commit',
      // 'https://postman-echo.com/post',
      cookie, {
        'values': {
          [listEntry]: [{
            'n': 'Time',
            'v': time
          }, {
            'n': 'What',
            'v': project
          }, {
            'n': 'Note',
            'v': note
          }]
        }
      });

    // save entry
    const body = await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=action',
      cookie, {
        'ref': employee,
        'name': '*',
        'action': 'Save',
        'Params': {}
      });
    let bodyString = JSON.stringify(body);
    const entries = [];

    // FIXME - external function
    // check for successfull saving
    // pattern to matches within a note! e.g.: 2 tesing vs. testing vs. testing 2
    // " gets stored as \" in projectile json
    const re = new RegExp('\"v\"\:\"' + escapeRegExp(note).replace(/[\"]/g, '\\\\$&') + '\"\,\"d\"', 'g');
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

      bodyString = bodyString.slice(indexOfEnd + 21); // cut the processed block out of the bodyString and keep searching
    }

    // evaluate results for correct return value
    let returnValue = {
      returnValue: false
    };

    entries.forEach((item) => {
      // time has to be noramlized. Projectile ALWAYS returns x.xx though x,xx or x:xx may have been sent before
      // logger.debug('Länge Response TimeTracker: ' + body.values['TimeTracker!^.|Default|Employee|1|357'].length);
      if (body.values[employee].length >= 5 && item.includes('"Time","v":' + time + ',"d"') &&
        item.includes('"What","v":"' + project + '","d"') && item.includes('"Note","v":"' +
          note.replace(/[\"]/g, '\\\$&') + '","d"')) {
        // created a new entry
        returnValue = {
          returnValue: true
        };
        logger.debug('saveEntry -> While recognizing save status: created a new entry, return value: true');
      } else if (item.includes('"What","v":"' + project + '","d"') && item.includes('"Note","v":"' +
        note.replace(/[\"]/g, '\\\$&') + '","d"')) {
        // added to an existing entry
        returnValue = {
          returnValue: true
        };
        logger.debug('saveEntry -> While recognizing save status: added to an existing entry, return value: true');
      }
    });

    // check for problem messages in projectile response that indicate saving was NOT successfull
    returnValue = await checkProblems(bodyString, returnValue);

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
  };

  async save(date, time, project, note, cookie) {
    logger.debug('saving data...');
    /* const cookie = await exports.login(); */
    const employee = await this.getEmployee(cookie);
    // let jobList = await exports.jobList(cookie, employee); // fetch the actual joblist.
    if (await setCalendarDate(date, cookie, employee)) {
      const saveEntryResult = await saveEntry(cookie, employee, time, project, note);
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
  };
}

module.exports = ProjectileService;
