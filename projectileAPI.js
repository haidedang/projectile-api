const fs = require('fs');
const request = require('request');
const rp = require('request-promise');

const util = require('util'); // for Debug only --> util.inspect()

const winston = require('winston');
// winston.level = 'debug';
// error > warn > info > verbose > debug > silly

let user;
exports.initializeUser = async (userApi) => {
  try {
    user = userApi;
  } catch (e) {
    winston.error('projectileAPI No usercredential file seems to be available. Please run "node userCred.js" to create a credential file.', e);
    // process.exit();
  }
}
/*
try {
  user = JSON.parse(fs.readFileSync('user.txt'));
} catch (e) {
  winston.error('projectileAPI No usercredential file seems to be available. Please run "node userCred.js" to create a credential file.', e);
  // process.exit();
}*/

request.defaults({jar: true});

let TempJobTime=[];


//When initializing, this variable stores the total hours of a specific project after saving each entry

function createLogin() {
    let j = request.jar();

    // Using request
    return request({
        method: 'POST',
        url: 'https://projectile.office.sevenval.de/projectile/start',
        strictSSL: false,
        form: {
            action: 'login2',
            login: user.login,
            password: user.password,
            clientId: 0,
            jsenabled: 1,
            isAjax: 0,
            develop: 0
        },
    }, function (error, response, body) {
        if (!error) {

            winston.debug(response.headers['set-cookie'])
            let cookie = '';
            response.headers['set-cookie'].forEach((item) => {
                //
                //
                if (item != 'jwt=""; Path=/; Secure; HttpOnly') {
                    cookie += item.split(';')[0] + ';'
                }
            })

            // winston.debug(body, response);
            request({
                method: 'POST',
                url: 'https://projectile.office.sevenval.de/projectile/gui5ajax',
                strictSSL: false,
                json: true,
                form: {"ref": "TeamCalendar", "name": "*", "action": "show"},
                headers: {
                    Cookie: cookie
                }

            }, function (error, response, body) {
                if (error) {
                    throw error;
                }

                body.values.TeamCalendar.forEach((item) => {
                    let dates = '';
                    if (item.v && Array.isArray(item.v)) {
                        item.v.forEach((calendEntry) => {
                            try {
                                const data = calendEntry.split('|')
                                if (data[6] == 'WorkingTime' && data[10] && data[10] == 'Holyday') {
                                    dates += data[9] + ' '
                                }
                            } catch (e) {
                                // winston.debug(item.v);
                                winston.error(e, calendEntry);
                            }
                        })
                        winston.debug(`Name ${item.c} -- ${dates}`);
                    }

                })

            })
        }
    });
}

/**
 *
 * @returns Promise {cookie}
 * possible Error Cases: Wrong user and Login Data, No VPN Connection.
 *
 */
 exports.login = async () => {
   let options = {
       method: 'POST',
       url: 'https://projectile.office.sevenval.de/projectile/start',
       headers:
           {'content-type': 'application/x-www-form-urlencoded'},
       form:
           {
               action: 'login2',
               clientId: '0',
               jsenabled: '1',
               isAjax: '0',
               develop: '0',
               login: user.login,
               password: user.password
           },
       strictSSL: false, //TODO: SSL Zertifizierung mit node.js
       timeout: 7000,
       simple: false,
       resolveWithFullResponse: true
       /*
       insecure: true,
       rejectUnauthorized: false,
       followRedirect: true,
       */
   };
   let status = await rp(options)
     .then(function (response) {
       winston.silly('projectile.login -> processing headers and creating cookie.');
       let temp = response.headers['set-cookie'][0];
       let cookie = temp.split(';')[0];
       return cookie;
     })
     .catch(function (err) {
       //Zeitüberschreitung beim Verbinden zum projectile Server... Bitte überprüfe deine Netzwerkverbindung." + error
       winston.warn('projectile.login -> possible Timeout - projectile server could be unreachable.');
       winston.silly(err); // JSON.stringify( err, null, 2 ));
       return false;
     });
   return status;
 }


function option(method, url, cookie, body) {
    var options = {
        method: method,
        url: url,
        headers:
            {
                cookie: cookie,
                'content-type': 'application/json'
            },
        body: body,
        json: true,
        strictSSL: false
    };
    return options;
}

let showJobList = async (cookie, employee) => {
        let body = await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=get', cookie, {
            [employee]:
                ['DayList',
                    'JobList',
                    'Begin',
                    'Favorites',
                    'TrackingRestriction',
                    'FilterCustomer',
                    'FilterProject'],
            Dock: ['Area.TrackingArea', 'Area.ProjectManagementArea']
        });

        // fs.writeFile("answer.json", JSON.stringify(body), (err)=>{winston.debug()});  // TODO TO CHECK necessary?

        /**
         * get name and NO. of Employee Job
         */
        let temp = body["values"][employee][11]["v"];
        let joblist = [];

        for (var i = 0; i < temp.length; i++) {
            joblist.push(temp[i]);
        }

        let advJoblist = [];

        for (var i = 0; i < joblist.length; i++) {
            let obj = {};
            obj.name = body["values"][joblist[i]][32]["v"]; //TODO: function to retrieve index of jobname and joblink
            obj.no = body["values"][joblist[i]][11]["v"];
            obj.remainingTime = body["values"][joblist[i]][33]["v"];
            obj.limitTime = body["values"][joblist[i]][34]["v"];
            obj.Totaltime = body["values"][joblist[i]][10]["v"];
            advJoblist.push(obj);
        }
        exports.joblist=[];
        // get an actual copy of the joblist fetched from server
        exports.joblist= advJoblist;  // TODO why a copy?
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
function normalPostURL(method, url, cookie, body) {
    return new Promise((resolve, reject) => {
        let options = option(method, url, cookie, body);
        request(options, function (error, response, body) {
            if (error){
               reject(error);
            }
            else{
                resolve(body);}
        });
    })
    //.catch((error)=> {throw new Error(error)});
}

/**
 *  function to test if projectile webserver is alive/reachable
 *  @returns {boolean} status
 */
exports.projectileAlive = async () => {
  let status = await rp({uri: 'https://projectile.office.sevenval.de/projectile/start', strictSSL: false})
    .then(function (htmlString) {
      winston.silly('projectileAlive -> projectile is alive.');
      return true;
    })
    .catch(function (err) {
      winston.warn('projectileAlive -> projectile server seems to be unreachable.');
      return false;
    });
  return status;
}

// cheaper version TODO TOCHECK
/*
var sys = require('sys')
var exec = require('child_process').exec;
function puts(error, stdout, stderr) { sys.puts(stdout) }
exec("ping -c 3 localhost", puts);
*/

/**
 *
 * @param cookie
 * @returns {Promise} Employee
 * # possible Error Case: wrong login data.
 */
exports.getEmployee = async (cookie) => {
            // Überprüfe ob Request in Ordnung ging
            let body = await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=action', cookie, {
                "ref": "Start",
                "name": "*",
                "action": "TimeTracker1",
                "Params": {}
            });
            try {
                let EmplN = JSON.parse(body["values"]["Dock"][0]["v"][0])["a"];
                let temp = EmplN.substr(1);
                return temp;
            } catch (error){
               throw new Error("Ungültige Login Daten. Bitte überprüfen.");
            }
}

/**
 * normalize the duration value
 * @param {duration} duration value
 * @returns {duration} duration value that is cleaned to x.xx
 *
 */
exports.normalizetime = async (time) => {
  if (time.includes(':')) {
    let tmp = time.split(":");
    let tmp2 = (parseInt(tmp[1])/60)*100;
    time = tmp[0] + '.' + tmp2;
  } else if (time.includes(',')) {
    time = time.replace(',', '.');
  }
  return time;
}

// helperfunction
function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

// TODO: Refactoring Neccessary
// Save entry to projectile
let saveEntry = async (cookie, employee, time, project, note) => {
    let dayList = await getDayListToday(cookie, employee);
    winston.debug('saveEntry -> dayList: ' + JSON.stringify(dayList, null, 2));
    /*
    extend the "lines" range of originally 6 depending on amount of existing entries in dayList! else insertion of larger lists
    than 7 entries per day fail to save successfully.
    */
    lineSelector = dayList.length - 1;
    if (dayList.length >= 49) { // depends if one day or whole weeks is returned from projectile - when what gets returned is still weird
      lineSelector = dayList.length - 43;
    }

    winston.debug('saveEntry -> lineSelector: ' + lineSelector);
    // let lineSelector = dayList.length - 43; // case that 7 days are in dayList
    /* if (dayList && dayList.length < 49) { // case that 1 day is in dayList
      lineSelector = dayList.length -1;
    } */
    let listEntry = dayList[lineSelector];

    // "normalize" note - Q'n'D fix, until final solution found - UMLAUTE
    // !!! TODO CHECK - final clean Solution necessary: Q'n'D fix in TimeularAPI -> merge

    // set time, select Project, write note -> all in one request now.
    let debug = await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=commit', cookie, {
        "values": {
            [listEntry]: [{
                "n": "Time",
                "v": time
            },{
                "n": "What",
                "v": project
            },{
                "n": "Note",
                "v": note
            }]
        }
    })

    // save entry
    let body = await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=action', cookie, {
        "ref": employee,
        "name": "*",
        "action": "Save",
        "Params": {}
    })
    let bodyString = JSON.stringify(body);
    let entries = [];

    // check for successfull saving
    // pattern to matches within a note! e.g.: 2 tesing vs. testing vs. testing 2
    // " gets stored as \" in projectile json
    let re = new RegExp('\"v\"\:\"' + escapeRegExp(note).replace(/[\"]/g, "\\\\$&") + '\"\,\"d\"', 'g'); // TODO enough to check for notes?! :( must be another way if there is note present!)
    // winston.debug('RegEx Debug: ' + escapeRegExp(note).replace(/[\"]/g, "\\\\$&"));
    // winston.debug(note.replace(/[\"]/g, "\\\$&"));

    // from server reply create list of entries of "note" matches to check them further, ideally there is only one
    let count = 0;
    let bodyStringMatch = bodyString.match(re);
    if (bodyStringMatch){
      count = bodyStringMatch.length;   // "api * ! \" ' url1" zu matchen!
    }
    winston.debug("saveEntry -> Occurence count of note text: " + count);
    for (let i = 0; i < count; i++) {
      // find the note
      let indexOfNote = bodyString.search(re);
      let bodyStringEntry = bodyString.slice(0, indexOfNote + 5); // 0 to note position, temp
      // find the beginnig of that block
      let indexOfDayList = bodyStringEntry.lastIndexOf('"+.|DayList|'); // position of DayList in that new shorter bodyStringEntry
      let bodyStringEntryCut = bodyString.slice(indexOfDayList); // from DayList connected to note to end
      // find the end of that block
      let indexOfEnd = bodyStringEntryCut.indexOf('"options":"update"}],'); // find the end of that block
      bodyStringEntryCut = bodyStringEntryCut.slice(0, indexOfEnd + 21); // 21 = length of search pattern, extract only the block we are interested in

      entries.push('{' + bodyStringEntryCut + '}'); // collect found block entry

      bodyString = bodyString.slice(indexOfEnd + 21); // cut the processed block out of the bodyString and keep searching
    }

    // evaluate results for correct return value
    let returnValue = {
      returnValue: false
    };

    entries.forEach((item) => { // time has to be noramlized. Projectile ALWAYS returns x.xx though x,xx or x:xx may have been sent before
      // winston.debug('Länge Response TimeTracker: ' + body.values['TimeTracker!^.|Default|Employee|1|357'].length);
      if (body.values[employee].length >= 5 && item.includes('"Time","v":' + time + ',"d"') && item.includes('"What","v":"' + project + '","d"') && item.includes('"Note","v":"' + note.replace(/[\"]/g, "\\\$&") + '","d"')) {
        // created a new entry
        returnValue = {
          returnValue: true
        };
        winston.debug('saveEntry -> While recognizing save status: created a new entry, return value: true');
      } else if (item.includes('"What","v":"' + project + '","d"') && item.includes('"Note","v":"' + note.replace(/[\"]/g, "\\\$&") + '","d"')) {
        // added to an existing entry
        returnValue = {
          returnValue: true
        };
        winston.debug('saveEntry -> While recognizing save status: added to an existing entry, return value: true');
      }
    });

    // check for problems that indicate saving was NOT successfull
    if (bodyString.includes('"problems":[{"ref"')){
      winston.warn('saveEntry -> Recognizing problem status: problem message found! returnValue can\'t be true!');
      let indexOfErrorArrayStart = bodyString.lastIndexOf('problems":[');
      let indexOfErrorArrayEnd = bodyString.slice(indexOfErrorArrayStart).indexOf('"}],');
      winston.warn('saveEntry -> Error array: ', 'Start: ', indexOfErrorArrayStart, 'length:',indexOfErrorArrayEnd, bodyString.slice(indexOfErrorArrayStart + 10, indexOfErrorArrayStart + indexOfErrorArrayEnd + 3));
      let errorArray = JSON.parse(bodyString.slice(indexOfErrorArrayStart + 10, indexOfErrorArrayStart + indexOfErrorArrayEnd + 3));
      winston.warn('saveEntry -> Error array itms: ', errorArray.length);
      errorArray.forEach((item) => {
        winston.warn(item.message, item.severity);
      });
      // array contains: ref, message, severity
      // error message should be returned!
      returnValue = {
        returnValue: false,
        errors: errorArray
      }
    }
    // fs.writeFile('bodyString.json', JSON.stringify(bodyString, null, 2), (err)=>{});  // Debug
    /* TODO was always causing errors! Check for good and bad case, find single binding condition
    if (bodyString.includes('"clearProblems":["')){
      winston.warn('saveEntry -> Recognizing problem status: problem message found! returnValue can\'t be true!');
      winston.warn('saveEntry -> "clearProblems" error - can\'t write to projectile - booking locked for current timeperiod.');
      if (returnValue.returnValue) {
        returnValue.returnValue = false;
          returnValue["errors"].push("clearProblems error, booking locked for current timeperiod");
      }
    } */
    return returnValue;
}

async function deleteEntry(cookie, employee, number) {
    // mark entry for deletion, get popup response, extract ref and execute action to delete
    let dayList = await getDayListToday(cookie, employee);
    let listEntry = dayList[number];
    let body = await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=action', cookie, {
        "ref": employee,
        "name": "DayList",
        "action": "RowAction_Delete",
        "Params": {"ref": listEntry}
    });
  // winston.debug(body.dialog.structure[""][""]["0"][1].v); --> contains "Nicht erlaubt: Krank löschen" in special case
    let secondBody = await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=action', cookie, {
        "ref": body.dialog.ref,
        "name": "*",
        "action": "+0+1__null_",
        "Params": {"isDialog": true}
    });

    /*
    expected behaviour: after successfull deletion of a listEntry, the secondBody contains the line:
    "close":["1519808571525-0"],"clearProblems":["1519808571525-0"]} containing the ref value from first request twice
    */
    let bodyString = JSON.stringify(secondBody);
    let confirmDeletion = bodyString.slice(bodyString.indexOf('"close":["'));
    let re = new RegExp(body.dialog.ref, 'g');
    let delMatch = confirmDeletion.match(re);
    let count = 0;
    if (delMatch) {
      count = delMatch.length;
    }
    // DEBUG
    // winston.debug(count + ' DELETE FCT ' + body.dialog.ref);
    if (count === 2) {
      return true;
    } else {
      winston.warn('There might be an issue while deleting a listEntry: count: ' + count + ' ref: ' + body.dialog.ref);
      return false;
    }
}

async function getDayListToday(cookie, employee) {
    let temp = await  normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=get', cookie, {
        "Dock": ["Area.TrackingArea"],
        [employee]: ["DayList", "JobList", "Begin", "Favorites", "TrackingRestriction", "FilterCustomer", "FilterProject"]
    })
    let dayList = await temp["values"][employee][2]["v"];

    return dayList;
}


async function setCalendarDate(date, cookie, employee) {
    dateComplete = date + "T00:00:00";
    // Timetracker page
    // OBSOLETE??
    await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=get', cookie, {
        [employee]: ["DayList", "JobList", "Begin", "Favorites", "TrackingRestriction", "FilterCustomer", "FilterProject"],
        "Dock": ["Area.TrackingArea", "Area.ProjectManagementArea"]
    });
    // setToday
   let answer = await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=commit', cookie, {
        "values": {
            [employee]: [{
                "n": "Begin",
                "v": dateComplete
            }]
        }
    })
    // reduce bodyString to contain only the first listEntry
    // BE AWARE returned value depends on currently set date, ONLY if a date change happens the expected returned body is received, else its just a "true" value within a smaller json
    let bodyString = JSON.stringify(answer);

    if (bodyString.includes('update"}]')) {
      bodyString = bodyString.slice(0, bodyString.indexOf('update"}]') + 9);
      return bodyString.includes(date); // standard behaviour - date gets changed
    } else {
      if (!bodyString.includes('[{"n":"Begin","d":true}]}')) {
        winston.warn('Function setCalenderDate returns false, something may be wrong.');
      }
      return bodyString.includes('[{"n":"Begin","d":true}]}'); // behaviour/returned json if date doesn't had to be changed
    }
    // return bodyString.includes(date);
    // fs.writeFile('calendar.json', JSON.stringify(answer), (err)=>{});  // obsolete?
}


// e.g.: index.delete('2018-02-01', 0)
exports.delete = async (date, listEntry) => {
    let cookie = await exports.login();
    let employee = await exports.getEmployee(cookie);
    if(await setCalendarDate(date, cookie, employee)) {
        winston.debug('setCalenderDate was successful in delete function.');
        if (await deleteEntry(cookie, employee, listEntry)) {
            winston.debug("Finished deleting entry " + listEntry + ' for date ' + date);
        } else {
            winston.error("Error while deleting entry " + listEntry + ' for date ' + date);
        }
    }
}

//simplified for API use
exports.jobList = async (cookie,employee) => {
    winston.debug('fetching data for jobList.');
        return showJobList(cookie, employee);
};

exports.fetchNewJobList = async () => {
    let cookie = await exports.login();
    let employee = await exports.getEmployee(cookie);
    winston.debug('fetching new data for jobList...');
    let data =  await showJobList(cookie, employee);
    return data;
}

// simplified for API Use
exports.save = async (date, time, project, note) => {
    winston.debug('saving data...');
    let cookie = await exports.login();
    let employee = await exports.getEmployee(cookie);
    // let jobList = await exports.jobList(cookie, employee); // fetch the actual joblist.
    if (await setCalendarDate(date, cookie, employee)) {
        let saveEntryResult = await saveEntry(cookie, employee, time, project, note); // saveEntry returns true or false depending on save result
        // returns { returnValue: false, errors: errorArray }
        winston.debug("saveEntryResult --> " + JSON.stringify(saveEntryResult, null, 2));
        if (saveEntryResult.returnValue) {
            winston.debug('Finished saving entry.');
            // return true;
            // return saveEntryResult;
        }
        return saveEntryResult;
    }
    return {
      returnValue: false
     };
    // return false;
}
/*
async function blubb () {
  await exports.save('2018-03-05', '2', '2759-62', 'note');
  await exports.delete('2018-03-05', '0');
}
blubb();
*/



exports.getDate = async (date) => {
    let cookie2 = await exports.login();
    let employee2 = await exports.getEmployee(cookie2);
    await setCalendarDate(date, cookie2, employee2);
}

// Split Joblist into one without limit and one array with packages with limit
exports.joblistLimited = async (list, limitTime, callback) => { // "limitTime" is a fieldname
   let limitedJobList = [];

   //transform array to a bundle of property values
   let temp = list.map((item)=> {
        return item[limitTime];
    })

    // create copy
    let iterationArr = temp.slice(0);

    iterationArr.forEach((item) => {
        if(callback(item) ){
            let a = list.splice(temp.indexOf(item),1)[0];
            limitedJobList.push(a);
            temp.splice(temp.indexOf(item),1);
        }
    })
    // array of limited packages
    winston.debug('exports.joblistLimited -> limitedJobList: ', JSON.stringify(limitedJobList, null, 2));
    return limitedJobList;
    /* winston.debug(list);
    winston.debug(limitedJobList); */
}

exports.getDayListToday = async function () {
    let cookie = await exports.login();
    let employee = await exports.getEmployee(cookie);
    return getDayListToday(cookie, employee);
}

exports.setCalendarDate = async function(date) {
    let cookie = await exports.login();
    let employee = await exports.getEmployee(cookie);
    return setCalendarDate(date, cookie, employee);
}

exports.getallEntriesInTimeFrame = async (startDate, endDate) => {
    startDate = startDate + "T00:00:00";
    endDate = endDate + "T00:00:00";
    let cookie = await exports.login();
    let employee = await exports.getEmployee(cookie);
    await normalPostURL('POST', "https://projectile.office.sevenval.de/projectile/gui5ajax?action=commit", cookie, {"values":{"Start":[{"n":"Field_TimeTrackerDate","v":startDate}, {"n":"Field_TimeTrackerDate2","v":endDate}]}});
  // handled with above normalPostURL request --> await normalPostURL('POST', "https://projectile.office.sevenval.de/projectile/gui5ajax?action=commit", cookie , {"values":{"Start":[{"n":"Field_TimeTrackerDate2","v":endDate}]}} );
    let response = await normalPostURL( 'POST', "https://projectile.office.sevenval.de/projectile/gui5ajax?action=action", cookie , {"ref":"Start","name":"*","action":"TimeTracker1","Params":{}});
    // OBOSLETE? fs.writeFile('daylist.json', JSON.stringify(response,null,2), (err) => winston.error(err)); // TODO necessary? obsolete? // error got triggered, whats wrong there?!
    return response ;
}
