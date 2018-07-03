// -------------- INTEGRATIONTESTS TIMEULARAPI -------- 

let chai = require('chai');
let expect = chai.expect;
var assert = require('assert');
let sinon = require('sinon')
const Merge = require('../TimeularApi/Merge')

let timeularAPI = require('../timeularAPI');
const projectile = require('../projectileAPI')
let fs = require('fs');

let chaiHttp = require('chai-http');
let should = chai.should();
const host = "http://localhost:3001";
const winston = require('winston');

chai.use(chaiHttp);

let timeList = JSON.parse(fs.readFileSync('./test/mocks/timeularList.json'));

// IMPORTANT NOTE FOR TESTING:
// Set the parameter values in config.json before running the tests!

let config = {};
let activityID = null;
let token = JSON.parse(fs.readFileSync('timeularToken.txt'));

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

/* it('fetch and return cleaned up Array', async function () {
    const stubMerge = sinon.stub(Merge.prototype, 'fetchTimeList').callsFake(async function fakeFn() {
        return { body: JSON.stringify(timeList) }
    })

    let startDate = '2018-06-18'
    let endDate = '2018-06-24'
    let monthCleaned = await timeularAPI.merge(startDate, endDate);
    stubMerge.restore();
    sinon.assert.calledOnce(stubMerge);
    expect(monthCleaned.length).to.not.equal(0);
})
 */

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

