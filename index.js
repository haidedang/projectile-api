const fs = require('fs');
let request = require("request");

const util = require('util'); // for Debug only --> util.inspect()


let user;
try {
  user = JSON.parse(fs.readFileSync('user.txt'));
} catch (e) {
  console.log('No usercredential file seems to be available. Please run "node userCred.js" to create a credential file.');
  process.exit();
}

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

            console.log(response.headers['set-cookie'])
            let cookie = '';
            response.headers['set-cookie'].forEach((item) => {
                //
                //
                if (item != 'jwt=""; Path=/; Secure; HttpOnly') {
                    cookie += item.split(';')[0] + ';'
                }
            })

            // console.log(body, response);
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
                                // console.log(item.v);
                                console.log(calendEntry);
                            }
                        })
                        console.log(`Name ${item.c} -- ${dates}`);
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

    return new Promise((resolve, reject) => {
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
                timeout: 7000

            };
            request(options, function (error, response, body) {
                if (error) { reject("Zeitüberschreitung... Bitte überprüfe deine VPN Internetverbindung.");}
                else {
                    let temp = response.headers['set-cookie'][0];
                    let cookie = temp.split(';')[0];
                    resolve(cookie);
                }
            });
        }
    ).catch((e)=> {throw new Error(e)});
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

        fs.writeFile("answer.json", JSON.stringify(body), (err)=>{console.log()});

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
        exports.joblist= advJoblist;  // why a copy?
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


let saveEntry = async (cookie, employee, number, time, project, note) => {
    // console.log("employee: " + employee);
    // let temp = await  normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=get', cookie,{"Dock":["Area.TrackingArea"],[employee]:["DayList","JobList","Begin","Favorites","TrackingRestriction","FilterCustomer","FilterProject"]})
    let dayList = await getDayListToday(cookie, employee);
    // console.log(dayList);
    let listEntry = dayList[6];  // TODO random? What happens if there is more than 6 entries

    //time
    await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=commit', cookie, {
        "values": {
            [listEntry]: [{
                "n": "Time",
                "v": time
            }]
        }
    })

    // select Project
    await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=commit', cookie, {
        "values": {
            [listEntry]: [{
                "n": "What",
                "v": project
            }]
        }
    })
    // write note
    await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=commit', cookie, {
        "values": {
            [listEntry]: [{
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
    // pattern to matches within a note! e.g.: 2 tesing vs. testing vs. testing 2
    let re = new RegExp('\"v\"\:\"' + note + '\"\,\"d\"', 'g');

    // from server reply create list of entries of "note" matches to check them further, ideally there is only one
    let count = bodyString.match(re).length;
    console.log("Occurence count of note text: " + count);
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

      entries.push(bodyStringEntryCut); // collect found block entry

      bodyString = bodyString.slice(indexOfEnd + 21); // cut the processed block out of the bodyString and keep searching
    }

    // evaluate results for correct return value
    let returnValue = false;
    entries.forEach((item) => {
        if (item.includes(time) && item.includes(project) && item.includes(note)) {
          returnValue = true;
        }
    });
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
    let secondBody = await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=action', cookie, {
        "ref": body.dialog.ref,
        "name": "*",
        "action": "+0+1__null_",
        "Params": {"isDialog": true}
    });

    /*
      {"n":"Time","v":null,"d":false,"e":true},
      {"n":"What","v":null,"d":false,"e":true,"c":null,"options":"update"},
      {"n":"Note","v":null,"d":false,"e":true},
    */
    // reduce bodyString to contain only the specified listEntry
    let bodyString = JSON.stringify(secondBody);
    bodyString = bodyString.slice(bodyString.indexOf(listEntry));
    bodyString = bodyString.slice(0, bodyString.indexOf('update"}]'));
    // extracting the values for Time, What and Note
    let timeEmpty = bodyString.substr(bodyString.indexOf('{"n":"Time","v":') + 16, 4);
    let projectEmpty = bodyString.substr(bodyString.indexOf('{"n":"What","v":') + 16, 4);
    let noteEmpty = bodyString.substr(bodyString.indexOf('{"n":"Note","v":') + 16, 4);

    if (timeEmpty === 'null' && projectEmpty === 'null' && noteEmpty === 'null') {
      return true;
    } else {
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
    date = date + "T00:00:00";
    // Timetracker page
    await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=get', cookie, {
        [employee]: ["DayList", "JobList", "Begin", "Favorites", "TrackingRestriction", "FilterCustomer", "FilterProject"],
        "Dock": ["Area.TrackingArea", "Area.ProjectManagementArea"]
    });
    // setToday
   let answer= await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=commit', cookie, {
        "values": {
            [employee]: [{
                "n": "Begin",
                "v": date
            }]
        }
    })

    return answer;

/*     fs.writeFile('calendar.json', JSON.stringify(answer), (err)=>{});
 */}
async function setCalendarDate2(date, cookie, employee) {
    date = date + "T00:00:00";
    // Timetracker page
    await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=get', cookie, {
        [employee]: ["DayList", "JobList", "Begin", "Favorites", "TrackingRestriction", "FilterCustomer", "FilterProject"],
        "Dock": ["Area.TrackingArea", "Area.ProjectManagementArea"]
    });
    // setToday
   let answer= await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=commit', cookie, {
        "values": {
            [employee]: [{
                "n": "Begin",
                "v": date
            }]
        }
    })

    fs.writeFile('calendar2.json', JSON.stringify(answer), (err)=>{});
}

// e.g.: index.delete('2018-02-01', 0)
exports.delete = async (date, listEntry) => {
    let cookie = await exports.login();
    let employee = await exports.getEmployee(cookie);
    await setCalendarDate(date, cookie, employee);
    await deleteEntry(cookie, employee, listEntry);
    console.log("Finished Deleting.");
}

//simplified for API use
exports.jobList = async (cookie,employee) => {
    console.log('fetching data...');
        return showJobList(cookie, employee);
};

exports.fetchNewJobList = async () => {
    let cookie = await exports.login();
    let employee = await exports.getEmployee(cookie);
    console.log('fetching data...');
    let data =  await showJobList(cookie, employee);
    return data;
}

// simplified for API Use
exports.save = async ( date, listEntry, time, project, note) => {
    console.log('saving data...');
    let cookie = await exports.login();
    let employee = await exports.getEmployee(cookie);
/*     let jobList = await exports.jobList(cookie, employee); // fetch the actual joblist.
 */
    await setCalendarDate(date, cookie, employee);
    let saveEntryResult = await saveEntry(cookie, employee, listEntry, time, project, note); // saveEntry returns true or false depending on save result
    console.log("saveEntryResult --> " + saveEntryResult);
/*     await setCalendarDate2(data, cookie, employee);
 */    /* try {
        await checkForSuccessfulSave(project, time);
    } catch(err){
       console.log(err);
       //TODO: store packages which couldnt be saved in an external file
    } */

    await console.log('Finished saving entry.'+ "\n");
}

exports.getDate = async ( date)=> {
    let cookie2 = await exports.login();
    let employee2 = await exports.getEmployee(cookie2);
    await setCalendarDate(date, cookie2, employee2);
}

// Split Joblist into one without limit and one array with packages with limit
exports.joblistLimited = async (list, limitTime, callback) => {
   let limitedJobList = [];

   //transform array to a bundle of property values
   let temp = list.map((item)=> {
        return item[limitTime];
    })

    // create copy
    let iterationArr = temp.slice(0);

    iterationArr.forEach((item)=>{
        if(callback(item) ){
            let a = list.splice(temp.indexOf(item),1)[0];
            limitedJobList.push(a);
            temp.splice(temp.indexOf(item),1);
        }
    })

    // array of limited packages
    return limitedJobList;
    /* console.log(list);
    console.log(limitedJobList); */
}

exports.getDayListToday = async function (){
    let cookie = await exports.login();
    let employee = await exports.getEmployee(cookie);
    return getDayListToday(cookie, employee);
}

exports.setCalendarDate = async function(date){
    let cookie = await exports.login();
    let employee = await exports.getEmployee(cookie);
    return setCalendarDate(date, cookie, employee);
}

exports.getallEntriesInTimeFrame= async (startDate, endDate)=> {
    startDate = startDate + "T00:00:00";
    endDate = endDate + "T00:00:00";
    let cookie = await exports.login();
    let employee = await exports.getEmployee(cookie);
    await normalPostURL('POST', "https://projectile.office.sevenval.de/projectile/gui5ajax?action=commit", cookie, {"values":{"Start":[{"n":"Field_TimeTrackerDate","v":startDate}]}});
    await normalPostURL( 'POST', "https://projectile.office.sevenval.de/projectile/gui5ajax?action=commit", cookie , {"values":{"Start":[{"n":"Field_TimeTrackerDate2","v":endDate}]}} );
    let response = await normalPostURL( 'POST', "https://projectile.office.sevenval.de/projectile/gui5ajax?action=action", cookie , {"ref":"Start","name":"*","action":"TimeTracker1","Params":{}});
    fs.writeFile('daylist.json', JSON.stringify(response,null,2), (err)=>console.log()); // necessary? obsolete?
    return response ;
}


/**
 * DEPRECEATED
 * @param {*} startdate
 * return array containing all entry objects of specified date;
 */
async function fetchDayList(startdate) {
    let arr = [];

    let dayList = await index.setCalendarDate(startdate);
    // console.log("serverlist : "+ JSON.stringify(dayList,null,2));
/*     console.log(JSON.stringify(dayList,null,2));
 */     for (let i = 0; i < entryList.length; i++) {
        let obj = {};
        try {
            obj["StartDate"] = dayList["values"][entryList[i]][31]["v"];
            obj["Duration"] = dayList["values"][entryList[i]][5]["v"];
            obj["Activity"] = dayList["values"][entryList[i]][8]["v"];
            obj["Note"] = dayList["values"][entryList[i]][28]["v"];

            /* obj["RemainingTime"] = dayList["values"][entryList[i]][4]["v"];
            obj["Time"] = dayList["values"][entryList[i]][5]["v"];
            obj["Activity"]= dayList["values"][entryList[i]][8]["v"];
            obj["EntryIndex"]= dayList["values"][entryList[i]][10]["v"];
            obj["Note"]= dayList["values"][entryList[i]][28]["v"];
            obj["Date"]=dayList["values"][entryList[i]][31]["v"];   */
        } catch (err) {
            console.log(err);
        }
        arr.push(obj);
        // needs to change
        /* if(obj["Time"]==null){
            break;
        }else {
            arr.push(obj);
        } */

    }
    //extract the objects

    return arr;
}

// Depreceated
async function projectileList(startDate, endDate) {
    let arr = [];
    let dayList = await index.getallEntriesInTimeFrame(startDate, endDate);
    for (let i = 0; i < entryList.length; i++) {
        let obj = {};
        try {
            obj["StartDate"] = dayList["values"][entryList[i]][31]["v"];
            obj["Duration"] = dayList["values"][entryList[i]][5]["v"];
            obj["Activity"] = dayList["values"][entryList[i]][8]["v"];
            obj["Note"] = dayList["values"][entryList[i]][28]["v"];

            /*  obj["RemainingTime"] = dayList["values"][entryList[i]][4]["v"];
             obj["EntryIndex"]= dayList["values"][entryList[i]][10]["v"];  */

            arr.push(obj);
        } catch (err) {
            console.log(err);
        }

        /*  // needs to change
         if(obj["Time"]==null){
             break;
         }else {
             arr.push(obj);
         } */

    }
    return arr;
}
