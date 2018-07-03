const winston = require('winston')

class Normalize {

    static async normalize(startDate, endDate, monthCleaned){
        let result = [];
        // sorting is now done right after generating month array
    
        // group Objects to Array with same Date
        let monthDay = await this.splitintoSeperateDays(MonthCleaned);
        winston.debug('normalizeUP -> after splitintoSeperateDays: ', JSON.stringify(monthDay, null, 2));
        // get DateRange of Projectile  [ [Day1],[Day2] ]
        let serverDays = await this.getDistinctProjectileRange(startDate, endDate);
        winston.debug('normalizeUP -> after getDistinctProjectileRange : ', JSON.stringify(serverDays, null, 2));
    
        let clientDaysInProjectile = [];
    
        // get indexes of Serverlist , which has same Date as MonthCleaned
        // filter ServerArray for dates only containing in Timular List
        // clientDaysInProjectile = [1, 3, 4]   => Timular Dates exists in ServerArray at index 1, 3, 4 ;
        monthDay.forEach((item) => { clientDaysInProjectile.push(serverDays.filterAdvanced((obj) => obj[0].StartDate == item[0].StartDate, (temp) => serverDays.indexOf(temp))) });
        winston.debug('normalizeUP -> monthDay.forEach(item): ', JSON.stringify(clientDaysInProjectile, null, 2));
        // split serverArray in 2 Arrays - one containing the client days, one containing everything else
        let obj = await this.prepareForSaveAndDeleting(serverDays, clientDaysInProjectile);
        winston.debug('normalizeUP -> prepareForSaveAndDeleting: ', JSON.stringify(obj, null, 2));
    
        // delete the empty slots which are not in date  // what is it good for? -> Deleting depreceated projectile Slots
        await this.deleteProjectileEmptySlots(obj.cleanProjectileList);

        obj.dayList.forEach(async (day) => {
            day.forEach(async (item) => {
                winston.debug('normalizeUP -> obj.dayList day item: ', item, (item["Note"] ? item["Note"].includes(" #[") : ''));
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
        result = await this.deleteDepreceated(monthDay, obj.dayList);
        return result;
    }

    static splitIntoSeperateDays(array) {
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

    static getIndexesOfSameDateInClient(array1, array2) {
        let result = [];
        array1.forEach((item) => {
            result.push(array2.filterAdvanced((obj) => obj[0].StartDate == item[0].StartDate, (temp) => array2.indexOf(temp)))
        });
        return result;
    }

    static prepareForSaveAndDeleting(serverDays, serverDaysInProjectile) {
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

    
    static async deleteProjectileEmptySlots(cleanProjectileList , projectile) {
        for (var i = 0; i < cleanProjectileList.length; i++) {
            // get indexes of not null
            for (var j = 0; j < cleanProjectileList[i].length; j++) {
                if (cleanProjectileList[i][j].Duration == null) {
                    // DEBUG
                    winston.debug("Delete " + cleanProjectileList[i][j].Note);
                    await projectile.delete(cleanProjectileList[i][j].StartDate, j);
                    cleanProjectileList[i].splice(j, 1);  // isn't it enough to just run through the list and deleting the entries without splice?
                    j = j - 1;
                }
            }
        }
    }

    /**
   *
   * @param {*} monthDay
   * @param {*} dayList
   * return clean monthDayList yet to Save
   */
    static async deleteDepreceated(monthDay, dayList) {
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

    static compareV2(clientArray, serverArray) {
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
                    // too mutch output -> silly
                    winston.silly('compareV2 -> Strings getting compared: ', JSON.stringify(clientArray[j]), JSON.stringify(serverArray[i]));
                    // to avoid startedAt entry to destroy matching capabilities
                    let tempClientArrayEntry = {
                        StartDate: clientArray[j].StartDate,
                        Duration: clientArray[j].Duration,
                        Activity: clientArray[j].Activity,
                        Note: clientArray[j].Note
                    };
                    if (JSON.stringify(tempClientArrayEntry) == JSON.stringify(serverArray[i])) {
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

}

Array.prototype.filterAdvanced = function (callback1, callback2) {
    for (let i = 0; i < this.length; i++) {
        if (callback1(this[i])) {
            return callback2(this[i]);
        }
    }
}

module.exports = Normalize