const request = require('request');
const index = require('./index.js');
const fs = require('fs');

const util = require('util'); // for Debug only --> util.inspect()


let token;
try {
  token = JSON.parse(fs.readFileSync('timeularToken.txt'));
} catch (e) {
  console.log('No token file seems to be available. Please run "node getTimularToken.js" to create a token file.');
  process.exit();
}

let listentry = 0;
let month = [];
let monthCleaned = [];
let entryList = [];

// initialize global variables
async function init() {
    entryList = await index.getDayListToday();
    return entryList.splice(6);
}

function main(startDate, endDate) {
    return new Promise((resolve, reject) => {
/*
        let listentry = 0;
        let month = [];
        let monthCleaned = [];
*/
        let timeperiod = startDate + 'T00:00:00.000/' + endDate + 'T23:59:59.999';

        // request.get('https://api.timeular.com/api/v2/time-entries/2017-01-01T00:00:00.000/2018-01-31T00:00:00.000',{
        // request.get(`https://api.timeular.com/api/v2/time-entries/${startDate}T00%3A00%3A00.000/${endDate}T00%3A00%3A00.000`, {
        request.get('https://api.timeular.com/api/v2/time-entries/' + timeperiod,{
            headers: {
                Authorization:'Bearer ' + token.apiToken,
                Accept: 'application/json;charset=UTF-8'
            }
        }, (err, res) => {
            let timeList = JSON.parse(res.body);

            for (let i = 0; i < timeList.timeEntries.length; i++) {
                let day = {};
                day["StartDate"] = timeList.timeEntries[i].duration.startedAt.substring(0, timeList.timeEntries[i].duration.startedAt.indexOf("T"));
                // day["listEntry"] = 0;
                /*
                timestamp is not accurate. sometimes 2h = 120min has a value thats != 120min. To solve that I cut the
                seconds and milliseconds from the timestamp. Decreases precision --> alternative would be to round values
                */
                day["Duration"] = ((Date.parse(timeList.timeEntries[i].duration.stoppedAt.substring(0, timeList.timeEntries[i].duration.stoppedAt.lastIndexOf(":"))) - Date.parse(timeList.timeEntries[i].duration.startedAt.substring(0, timeList.timeEntries[i].duration.startedAt.lastIndexOf(":")))) / 60000) / 60;
                day["Activity"] = timeList.timeEntries[i].activity.name.substring(timeList.timeEntries[i].activity.name.lastIndexOf("[") + 1, timeList.timeEntries[i].activity.name.lastIndexOf("]"));
                day["Note"] = timeList.timeEntries[i].note.text;
                // console.log(day);
                month.push(day);
            }

            // sort the MonthList with Timular Entries after ascending dates --> easier handling
            month.sort(function (a, b) { return (a.StartDate > b.StartDate) ? 1 : 0 });

            console.log("month before merge: " + JSON.stringify(month, null, 2));

            // merging Duration time of dup Note lines for entries from same day
            for (var i = 0; i < month.length; i++) {
                for (var j = i + 1; j < month.length; j++) { // j = i + 1 because .csv is sorted!
                  console.log( i + "#" + j);
                    if ((month[i]["StartDate"] === month[j]["StartDate"]) && (month[i]["Note"] === month[j]["Note"]) && (month[i]["Activity"] === month[j]["Activity"])) {
                        month[i]["Duration"] = (month[i]["Duration"] * 60 + month[j]["Duration"] * 60) / 60;
                        console.log("merging durations, compare activity: " + month[i]["Activity"] + " " + month[j]["Activity"] + " " + month[i]["Note"]);
                        month.splice(j, 1); // remove merged entry from original array, to avoid recounting them in next i increment
                        j--; // as one entry is spliced, the next candidate has the same j index number!
                    } else if (month[i]["StartDate"] !== month[j]["StartDate"]) {
                        break; // Date matches no longer? csv is sorted, break the comparison loop
                    }
                }
                monthCleaned.push(month[i]); // output the merged day entry to clean array
            }

            //   saveToProjectile(monthCleaned);
            /*  normalize().then((result)=> {console.log(result); saveToProjectile()});  */
            normalizeUP(startDate, endDate, monthCleaned).then((result) => { console.log(result); saveToProjectile(result) });

            /*             projectileList('2018-02-01', '2018-02-07').then((item)=>console.log(item));
             */

            /*           fetchDayList('2018-02-03').then((item)=> console.log(item));
             */
            // Delete all entries, which already exists in projectile out of monthCleaned.

            /* saveToProjectile();  */
        })
    })
}

init().then(() => { main("2018-02-12", "2018-02-25") });



// after that function , monthcleaned contains only limitless packages
// Timelar list will splice every element with limited packages into a seperate array
/**
 *
 * @param {*} limitPackageArrayFromServer  (Array containing the objects with limitedTime)
 *@returns {}
 *
 */
async function timularClient(monthArray, limitPackageArrayFromServer) {
    let package = {};
    let monthLimitPackage = [];
    // Check every element of Timular list for the packages and split them into a seperate array.
    for (var i = 0; i < limitPackageArrayFromServer.length; i++) {
        await index.joblistLimited(monthArray, "Activity", (item) => {
            return item == limitPackageArrayFromServer[i]["no"];
        }).then((result) => { result.forEach((result) => monthLimitPackage.push(result)) });
    }

    // store the arrays in different object properties
    package.limit = monthLimitPackage;
    package.limitless = monthArray;
    return package;

}

/**
 * splitting the monthCleaned into  seperates arrays to process,
 * async saving of limitless packages
 * synchronous saving of limit packages with checking
 */
async function saveToProjectile(monthArray) {
    // Fetch an actual Joblist from the server
    let data = await index.fetchNewJobList();
    // return an Array which contains every element with Limited Time
    let limitPackageArrayFromServer = await index.joblistLimited(data, "limitTime", (item) => {
        return item > 0;
    });
    // split Timular list into List with limitless and packages with limit
    let package = await timularClient(monthArray, limitPackageArrayFromServer);

    //async saving of packages without limit
    /*  package.limitless.forEach((obj)=>{
         index.save(obj["StartDate"], obj["listEntry"], obj["Duration"],  obj["Activity"], obj["Note"]);
     }) */

    //synchronous saving of packages without limit
    async function syncSaving(package) {
        for (var i = 0; i < package.limitless.length; i++) {
            await index.save(package.limitless[i]["StartDate"], package.limitless[i]["listEntry"], package.limitless[i]["Duration"], package.limitless[i]["Activity"], package.limitless[i]["Note"]);
            console.log('saving w/o limit: ' + package.limitless[i]["StartDate"], package.limitless[i]["listEntry"], package.limitless[i]["Duration"], package.limitless[i]["Activity"], package.limitless[i]["Note"]);
        }
    }

    syncSaving(package);

    //  synchrounously saving and checking packages with limit
    for (var i = 0; i < package.limit.length; i++) {
        // fetch projectile instance of the current project and get the remaining time
        let data = await index.fetchNewJobList();
        let projectileObject = await index.joblistLimited(data, "no", (item) => {
            return item === package.limit[i]["Activity"];
        });

        console.log("Saving entry with package limit:");
        console.log("duration of entry: " + package.limit[i].Duration + " remainingTime in package before add: " + Number(projectileObject[0].remainingTime));
        // compare the timular project time with projectile instance
        if (package.limit[i].Duration < (Number(projectileObject[0].remainingTime))) {
            await index.save(package.limit[i]["StartDate"], package.limit[i]["listEntry"], package.limit[i]["Duration"], package.limit[i]["Activity"], package.limit[i]["Note"]);
            console.log('saving w/ limit: ' + package.limit[i]["StartDate"], package.limit[i]["listEntry"], package.limit[i]["Duration"], package.limit[i]["Activity"], package.limit[i]["Note"]);
        } else {
            throw new Error('Remaining Time exceeded.');
        }
    }

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
        console.log("startDate: " + startDate);
        console.log("endDate: " + endDate);

        let TimeRangeArray = [];
        let List = await index.getallEntriesInTimeFrame(startDate, endDate);
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
        console.log(err);
    }

    // console.log(TimeRangeArray);

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

    // sorting is done right after generating month array

    // group Objects to Array with same Date
    let monthDay = splitintoSeperateDays(MonthCleaned);
    // get DateRange of Projectile  [ [Day1],[Day2] ]
    let serverDays = await getDistinctProjectileRange(startDate, endDate);

    let clientDaysInProjectile = [];

    // get indexes of Serverlist , which has same Date as MonthCleaned
    // filter ServerArray for dates only containing in Timular List
    // clientDaysInProjectile = [1, 3, 4]   => Timular Dates exists in ServerArray at index 1, 3, 4 ;
    monthDay.forEach((item) => { clientDaysInProjectile.push(serverDays.filterAdvanced((obj) => obj[0].StartDate == item[0].StartDate, (temp) => serverDays.indexOf(temp))) });

    // split serverArray in 2 Arrays - one containing the client days, one containing everything else
    let obj = prepareForSaveAndDeleting(serverDays, clientDaysInProjectile);

    //delete the empty slots which are not in date
    await deleteProjectileEmptySlots(obj.cleanProjectileList);
    console.log("finished deleting empty Slots.");

    // delete changedayentries from projectile with same day as in timeluar
    // returns all new Entries from Timular, which havent been saved yet
  /*   console.log(monthDay)
    console.log(obj.dayList); */
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
        console.log(err);
    }

}

function compareV2(clientArray, serverArray) {
    let arr = [];
    for (let i = 0; i < serverArray.length; i++) {
        arr.push(false);
    }
    // --------DEBUG ----------------
    /* console.log("Client" + JSON.stringify(clientArray, null, 2));
    console.log("Server" + JSON.stringify(serverArray, null, 2)); */

    try {
        for (var i = 0; i < serverArray.length; i++) {
            /*  if (clientArray.length == 0 || serverArray[i]["Duration"]== null ){
                 break;
             } */
            for (var j = 0; j < clientArray.length; j++) {
                if (JSON.stringify(clientArray[j]) == JSON.stringify(serverArray[i])) {
                    clientArray.splice(j, 1);
                    j = j - 1;
                    arr[i] = true;
                }
            }
        }
        return arr;
    } catch (err) {
        console.log(err);
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
            let res = compareV2(monthDay[i], dayList[i]);
            // ----------DEBUG --------------
            // console.log("result COMPARE: " + JSON.stringify(res, null, 2));
            finalresult.push(monthDay[i]);
            // after one iteration , a day is compared. I need then to delete that shit , get the date
            // delete, when entry exists but is FALSE.
            for (var j = 0; j < res.length; j++) {
                if (res[j] == false && dayList[i][j].Duration !== null) {
                    await index.delete(dayList[i][j].StartDate, j);
                    res.splice(j, 1);
                    dayList[i].splice(j, 1);
                    j = j - 1;
                }
            }

        }
        // -------DEBUG-------
        console.log(finalresult);
        return [].concat.apply([], finalresult);
    } catch (Err) {
        console.log(Err);
    }

}

async function deleteProjectileEmptySlots(cleanProjectileList) {
    for (var i = 0; i < cleanProjectileList.length; i++) {
        let temp = [];  // obsolete?
        // get indexes of not null
        for (var j = 0; j < cleanProjectileList[i].length; j++) {
            if (cleanProjectileList[i][j].Duration !== null) {
                // DEBUG
                console.log("Delete " + cleanProjectileList[i][j].Note );
                await index.delete(cleanProjectileList[i][j].StartDate, j);
                cleanProjectileList[i].splice(j, 1);
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
    // console.log(Overalllist);

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
