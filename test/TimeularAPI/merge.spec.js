
let chai = require('chai');
let expect = chai.expect;
const Merge = require('./Merge');
const fs = require('fs')
let token = JSON.parse(fs.readFileSync('timeularToken.txt'));

const merge = new Merge([], [], token.apiToken); //Object Instance will remain across functions

let timeList = JSON.parse(fs.readFileSync('./test/mocks/timeularList.json'));


describe('UNIT TESTS MERGE', function () { 
    
    it('should return a List of TimeularBookings within specified time Range', async () => {
        let startDate = '2018-06-18'
        let endDate = '2018-06-24'
        let result = await merge.fetchTimeList(startDate, endDate);
        expect(result.body.includes("timeEntries")).to.be.true ;
    })

    it('should sort a List of TimeularBookings after ascending dates and times', () => { 
        merge.sort(merge.getTimeList());
        expect(merge.sort(merge.getTimeList()).timeEntries[0].duration.startedAt).to.include('2018-06-18')   
    })

    it('should prepare and modify the timeular List accordingly and save it to an array', () => {
       let month=  merge.format(merge.getTimeList());
        expect(month[0]).to.be.an('object')
    })

    it('should merge Duration Time of duplicated Notes of entries in the same day', () => {
       let monthCleaned = merge.mergeDurationTime(merge.getMonth());
       expect(monthCleaned.length).to.not.equal(0);
    })

    it('should setup the Array properly', async () => {
        let monthCleaned = await merge.cleanArray('2018-06-18','2018-06-24'); 
        expect(monthCleaned.length).to.not.equal(0);
    })

})