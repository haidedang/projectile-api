const fs = require('fs');
let request = require("request");

let user = JSON.parse(fs.readFileSync('user.txt'));
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

        let body = await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=get&_dc=1515081239766', cookie, {
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

/*        await fs.appendFile("answer.json", JSON.stringify(body), (err)=>{console.log(err)});
 */
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
            obj.time = body["values"][joblist[i]][10]["v"];
            advJoblist.push(obj);
        }
        exports.joblist= advJoblist;
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
            let body = await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=action&_dc=1515496876799', cookie, {
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
    console.log(employee);

    // let temp = await  normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=get&_dc=1515081239766', cookie,{"Dock":["Area.TrackingArea"],[employee]:["DayList","JobList","Begin","Favorites","TrackingRestriction","FilterCustomer","FilterProject"]})
    let dayList = await getDayListToday(cookie, employee);
    let listEntry = dayList[number];
    /*    // Timetracker page
        await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=get&_dc=1515597712965', cookie, {[employee]:["DayList","JobList","Begin","Favorites","TrackingRestriction","FilterCustomer","FilterProject"],"Dock":["Area.TrackingArea","Area.ProjectManagementArea"]} );
        // setToday
        await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=commit&_dc=1515501823869', cookie, {"values":{[employee]:[{"n":"Begin","v":new Date()}]}})*/
    //time
    await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=commit&_dc=1515080248606', cookie, {
        "values": {
            [listEntry]: [{
                "n": "Time",
                "v": time
            }]
        }
    })

    // select Project
    await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=commit&_dc=1515080624305', cookie, {
        "values": {
            [listEntry]: [{
                "n": "What",
                "v": project
            }]
        }
    })
    // write note
    await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=commit&_dc=1515080659058', cookie, {
        "values": {
            [listEntry]: [{
                "n": "Note",
                "v": note
            }]
        }
    })

    // save entry
    await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=action&_dc=1515080819797', cookie, {
        "ref": employee,
        "name": "*",
        "action": "Save",
        "Params": {}
    })

    // refresh
    await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=options&_dc=1515596886820', cookie, {[employee]: ["FilterCustomer", "FilterProject"]});

    for ( let item of exports.joblist){
        if( item["no"] == project){

            item.time = Number(item.time) + Number(time);
            break;
        }
    }
    /* console.log("save" + JSON.stringify(TempJobTime.filter((item)=> {
        return item["no"]== project;
    })[0] )); */
    // store an updated Joblist in a variable
    TempJobTime = exports.joblist;

    console.log(TempJobTime);
}

// for checking if planaufwand limit is hit??
async function checkForSuccessfulSave(project){
    // get actual Joblist
    let NewJobList = await exports.fetchNewJobList();
    // extract the item out of the list
    let entry2 = NewJobList.filter((item)=> {
        return item["no"]== project;
    })
/*     console.log(exports.TempJobTime);
    console.log(JSON.stringify(entry2[0]));
    console.log(exports.TempJobTime.filter((item)=> {
        return item["no"]== project;
    })[0] );  */

    // compare it to the updated Joblist after Saving
    // if it is not the same value, saving did not happen!
    if ((TempJobTime.filter((item)=> {
        return item["no"]== project;
    }))[0].time !== entry2[0].time ) {
        throw new Error("couldnt save entry");
    } else { console.log("success")}
}

async function deleteEntry(cookie, employee, number) {
    let dayList = await getDayListToday(cookie, employee);
    let listEntry = dayList[number];
    await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=action&_dc=1515678755483', cookie, {
        "ref": employee,
        "name": "DayList",
        "action": "RowAction_Delete",
        "Params": {"ref": listEntry}
    });
    await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=action&_dc=1515679735908', cookie, {
        "ref": "1515679733964-0",
        "name": "*",
        "action": "+0+1__null_",
        "Params": {"isDialog": true}
    });
    /*// save entry
    await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=action&_dc=1515080819797', cookie,  {"ref":employee,"name":"*","action":"Save","Params":{}});*/
    // refresh
    await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=options&_dc=1515596886820', cookie, {[employee]: ["FilterCustomer", "FilterProject"]});
}

async function getDayListToday(cookie, employee) {
    let temp = await  normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=get&_dc=1515081239766', cookie, {
        "Dock": ["Area.TrackingArea"],
        [employee]: ["DayList", "JobList", "Begin", "Favorites", "TrackingRestriction", "FilterCustomer", "FilterProject"]
    })
    let dayList = await temp["values"][employee][2]["v"];
    return dayList;
}

async function setCalendarDate(date, cookie, employee) {
    date = date + "T00:00:00";
    // Timetracker page
    await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=get&_dc=1515597712965', cookie, {
        [employee]: ["DayList", "JobList", "Begin", "Favorites", "TrackingRestriction", "FilterCustomer", "FilterProject"],
        "Dock": ["Area.TrackingArea", "Area.ProjectManagementArea"]
    });
    // setToday
    await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=commit&_dc=1515501823869', cookie, {
        "values": {
            [employee]: [{
                "n": "Begin",
                "v": date
            }]
        }
    })
}

async function Delete(listEntry) {

    let cookie = await login();
    let employee = await getEmployee(cookie);
    await setCalendarDate(cookie, employee);
    await deleteEntry(cookie, employee, listEntry);
    console.log("Finished Deleting.")
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
    await setCalendarDate(date, cookie, employee);
    await saveEntry(cookie, employee, listEntry, time, project, note);
    try {
        await checkForSuccessfulSave(project);
    } catch(err){
       console.log(err);
       //TODO: store packages which couldnt be saved in an external file
    }

    await console.log('Finish'+ "\n");
}
