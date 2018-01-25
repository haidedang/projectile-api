#!/usr/bin/env node
const fs = require('fs');
let co = require('co');
let prompt = require('co-prompt');

let request = require("request");


request.defaults({jar: true});

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
 * @returns {Promise} cookie
 */
let login = async () => {
    let user = await JSON.parse(fs.readFileSync('user.txt'));
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
                strictSSL: false //TODO: SSL Zertifizierung mit node.js
            };

            request(options, function (error, response, body) {
                if (error) throw new Error(error);

                //  console.log(response.headers['set-cookie']);
                let temp = response.headers['set-cookie'][0];
                let cookie = temp.split(';')[0];

                resolve(cookie);
            });
        }
    )
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
        advJoblist.push(obj);
    }

    return advJoblist;

}

function normalPostURL(method, url, cookie, body) {
    return new Promise((resolve, reject) => {
        let options = option(method, url, cookie, body);

        request(options, function (error, response, body) {
            if (error) reject(error);
            resolve(body);
        });
    })
}


/**
 *
 * @param cookie
 * @returns {Promise} Employee
 */
let getEmployee = async (cookie) => {
    let body = await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=action&_dc=1515496876799', cookie, {
        "ref": "Start",
        "name": "*",
        "action": "TimeTracker1",
        "Params": {}
    });
    let EmplN = JSON.parse(body["values"]["Dock"][0]["v"][0])["a"];
    let temp = EmplN.substr(1);
    return temp;
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
    });
    // select Project
    await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=commit&_dc=1515080624305', cookie, {
        "values": {
            [listEntry]: [{
                "n": "What",
                "v": project
            }]
        }
    });
    // write note
    await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=commit&_dc=1515080659058', cookie, {
        "values": {
            [listEntry]: [{
                "n": "Note",
                "v": note
            }]
        }
    });
    // save entry
    await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=action&_dc=1515080819797', cookie, {
        "ref": employee,
        "name": "*",
        "action": "Save",
        "Params": {}
    })
    // refresh
    await normalPostURL('POST', 'https://projectile.office.sevenval.de/projectile/gui5ajax?action=options&_dc=1515596886820', cookie, {[employee]: ["FilterCustomer", "FilterProject"]});

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
async function jobList () {
    console.log('fetching data...');
    let cookie = await login();
    let employee = await getEmployee(cookie);

    return showJobList(cookie, employee).then((data) => {
        return data;
    });
};

// simplified for API Use
async function save (date, listEntry, time, project, note) {
    console.log('saving data...');
    let cookie = await login();
    let employee = await getEmployee(cookie);
    await setCalendarDate(date, cookie, employee);
    await saveEntry(cookie, employee, listEntry, time, project, note);
    await console.log('Finish');
}


function configure(username, pass){

    let login = username;
    let password = pass;

    let user = {login: login,
        password: password
    }

    fs.writeFile('user.txt', JSON.stringify(user), (err) => {
        if (err) throw err;
        console.log("The file has been saved!");
    });
}

if ((process.argv[2] =="configure" || process.argv[1] == "configure")){
    co(function *(){
        let username = yield prompt('username: ');
        let pw = yield prompt.password('password: ');
         configure(username,pw);
    })
}

if ((process.argv[2] =="-j")){
    jobList().then((data)=> { console.log(data)});
}

if ((process.argv[1]=="-t" || process.argv[2] == "-t")){

    let temp = process.argv[5];

   // console.log(process.argv[3], process.argv[4], process.argv[5], process.argv[6]) ;
     save(Date.now(), process.argv[3], process.argv[4], process.argv[5], process.argv[6]).then(() => console.log('saved.'));
}