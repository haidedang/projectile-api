let chai = require('chai');
let expect = chai.expect;
var assert = require('assert');

let timeularAPI = require('../timeularAPI');
const projectile = require('../projectileAPI')
let fs = require('fs');

let chaiHttp = require('chai-http');
let should = chai.should();
const host = "http://localhost:3001";
const winston = require('winston');




chai.use(chaiHttp);


// IMPORTANT NOTE FOR TESTING:
// Set the parameter values in config.json before running the tests!

let config = {};
let activityID = null;

// Initializing parameters from config and set token
before(function () {
    config = JSON.parse(fs.readFileSync('./config/test.json'));
    activityID = config.test.timeular.TimularActivityID;
    token = JSON.parse(fs.readFileSync('timeularToken.txt'));
    config.token = token;
    timeularAPI.initializeToken(token);

})

describe('get Activites/Activity from Timeular', function () {
    it('should return all Activities', async () => {
        let result = await timeularAPI.getActivities();
        expect(result.activities.length).to.not.equal(0);
    })

    it('return specific Activity with package', async () => {
        let result = await timeularAPI.packageActivityList(activityID);
        expect(result.Activity.includes(activityID)).to.be.true;
    })
})


/* describe('book an Entry in Timeular API', function () {
    it('should save successfully', async () => {
        let response = await timeularAPI.bookActivityNG({
            date: '2018-05-31',
            duration: '1',
            activityId: activityID,
            note: 'hallo'
        });
        expect(response, 'returnValue of Save function should be true').to.be.true;
    })
}) */


describe('UNIT TESTS FOR MERGING', function () {

    const Merge = require('./TimeularAPI/Merge');
    const merge = new Merge([], [], token.apiToken);

    const Normalize = require('./TimeularAPI/Normalize'); 

    // import Timeular MockObject 
    let timeList = JSON.parse(fs.readFileSync('./test/mocks/timeularList.json'));
    let projectileList = require('./mocks/projectileList');


    this.month = [];
    this.monthCleaned = [];
    this.startDate = '2018-06-18'
    this.endDate = '2018-06-24'


    it('should return a List of TimeularBookings within specified time Range', async () => {

        /* let result = await merge.fetchTimeList(this.startDate, this.endDate); 
        let timeList = JSON.parse(result.body);
         */
        
    })

    it('should sort a List of TimeularBookings after ascending dates and times', () => {

        expect(merge.sort(timeList).timeEntries[0].duration.startedAt).to.include(this.startDate)  // Function sort produces a side effect. It sort my initial array. 
       
    })

    it('should prepare and modify the timeular List accordingly and save it to an array', () => {
        /**
         * input: Timeluar Range List 
         * output: Array with formatted Objects 
         */

        for (let i = 0; i < timeList.timeEntries.length; i++) {
            let day = {};
            day["StartDate"] = timeList.timeEntries[i].duration.startedAt.substring(0, timeList.timeEntries[i].duration.startedAt.indexOf("T"));
            /*
            timestamp from timeular is not accurate. sometimes 2h = 120min has a value thats != 120min. To solve that I cut the
            seconds and milliseconds from the timestamp. Decreases precision --> alternative would be to round values
            */
            day["Duration"] = ((Date.parse(timeList.timeEntries[i].duration.stoppedAt.substring(0, timeList.timeEntries[i].duration.stoppedAt.lastIndexOf(":"))) - Date.parse(timeList.timeEntries[i].duration.startedAt.substring(0, timeList.timeEntries[i].duration.startedAt.lastIndexOf(":")))) / 60000) / 60;
            // get projectile packagename from timeular activity name e.g. "name": "Interne Organisation 2018 [2759-62]"
            day["Activity"] = timeList.timeEntries[i].activity.name.substring(timeList.timeEntries[i].activity.name.lastIndexOf("[") + 1, timeList.timeEntries[i].activity.name.lastIndexOf("]"));
            // collision detection through improved Notes containing timeular id of entry
            if (timeList.timeEntries[i].note.text !== null) {
                day["Note"] = timeList.timeEntries[i].note.text; // add timeular id of entry here
                day["Note"] = day["Note"] + ' #[' + timeList.timeEntries[i].id + ']'; // creating new style note entries for collision detecting
            } else {
                day["Note"] = '';
            }
            // keep the original complete date, to provide improved sorting of results for frontend
            day["startedAt"] = timeList.timeEntries[i].duration.startedAt;

            // "normalize" note - Q'n'D fix for projectile.js to avoid malformed characters in projectile
            // !!! TODO CHECK - final clean solution in saveEntry necessary!
            day["Note"] = day["Note"].replace(/ä/g, "ae").replace(/Ä/g, "Ae").replace(/ü/g, "ue").replace(/Ü/g, "Ue").replace(/ö/g, "oe").replace(/Ö/g, "Oe").replace(/ß/g, "ss");
            // remove newlines,... \n \r from notes
            day["Note"] = day["Note"].replace(/\r?\n|\r/g, " ");
            // end
            this.month.push(day);
        }

        merge.format(merge.getTimeList());
        assert.deepEqual(merge.getMonth()[0], this.month[0])
        assert.deepEqual(merge.getMonth(), this.month)

        /*  console.log(merge.getMonth());
         console.log(this.month[0]) */

        // expect(this.month[0]).to.be.an('object')
    })

    it('should merge Duration Time of duplicated Notes of entries in the same day', () => {

        for (var i = 0; i < this.month.length; i++) {
            for (var j = i + 1; j < this.month.length; j++) { // j = i + 1 because .csv is sorted!
                // winston.debug( i + "#" + j);
                if ((this.month[i]["StartDate"] === this.month[j]["StartDate"]) && (this.month[i]["Note"].substring(0, this.month[i]["Note"].lastIndexOf(" #[")) === this.month[j]["Note"].substring(0, this.month[j]["Note"].lastIndexOf(" #["))) && (this.month[i]["Activity"] === this.month[j]["Activity"])) {
                    this.month[i]["Duration"] = (this.month[i]["Duration"] * 60 + this.month[j]["Duration"] * 60) / 60;
                    // add new extended note to "new" merged entry
                    let monthIId = this.month[i]["Note"].substring(this.month[i]["Note"].lastIndexOf(' #[') + 3, this.month[i]["Note"].lastIndexOf(']'));
                    let monthJId = this.month[j]["Note"].substring(this.month[j]["Note"].lastIndexOf(' #[') + 3, this.month[j]["Note"].lastIndexOf(']'));
                    this.month[i]["Note"] = this.month[i]["Note"].substring(0, this.month[i]["Note"].lastIndexOf(' #['));
                    this.month[i]["Note"] = this.month[i]["Note"] + ' #[' + monthIId + ',' + monthJId + ']';
                    // all fine?
                    winston.debug('Merge (Range) -> merging bookings --> new Note: ' + this.month[i]["Note"] + ' for ', this.month[i]["StartDate"], this.month[i]["Activity"], this.month[i]["Duration"]);
                    // winston.debug("merging durations, compare activity: " + this.month[i]["Activity"] + " " + this.month[j]["Activity"] + " " + this.month[i]["Note"]);
                    this.month.splice(j, 1); // remove merged entry from original array, to avoid recounting them in next i increment
                    j--; // as one entry is spliced, the next candidate has the same j index number!
                } else if (this.month[i]["StartDate"] !== this.month[j]["StartDate"]) {
                    break; // Date matches no longer? input is sorted, break the comparison loop
                }
            }
            this.monthCleaned.push(this.month[i]); // output the merged day entry to clean array
        }

        merge.mergeDurationTime(merge.getMonth());
        assert.deepEqual(merge.getMonthCleaned(), this.monthCleaned)

    })

    /* it('should run through all functions with ease', async () => { 
        
        assert.deepEqual(await timeularAPI.merge(this.startDate,this.endDate), this.monthCleaned);
    }) */

    it('should group Objects to an Array with same Date', () => {
        function splitintoSeperateDays(array) {
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
        /* this.client = splitintoSeperateDays(this.monthCleaned);
        this.server = splitintoSeperateDays(projectileList); */

        this.client = Normalize.splitIntoSeperateDays(merge.getMonthCleaned())
        this.server = Normalize.splitIntoSeperateDays(merge.getMonthCleaned())


        for (var i = 0; i < this.client.length - 1; i++) {
            assert.notEqual(this.client[i][0].StartDate, this.client[i + 1][0].StartDate, 'should not be the same')
        }

        for (var i = 0; i < this.server.length - 1; i++) {
            assert.notEqual(this.server[i][0].StartDate, this.server[i + 1][0].StartDate, 'should not be the same')
        }

    })

    it('should get all entries of Serverlist which the same Date as Client', () => {
        let clientDaysInProjectile = [];
        this.client.forEach((item) => {
            clientDaysInProjectile.push(this.server.filterAdvanced((obj) => obj[0].StartDate == item[0].StartDate, (temp) => this.server.indexOf(temp)))
        });

        assert(Normalize.getIndexesOfSameDateInClient(this.client, this.server), clientDaysInProjectile)
        console.log(clientDaysInProjectile)
        console.log(Normalize.getIndexesOfSameDateInClient(this.client, this.server))
    })

    it('should split the serverArray into one containing the client dates and one with the rest', () => {
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
        prepareForSaveAndDeleting
    })

})
