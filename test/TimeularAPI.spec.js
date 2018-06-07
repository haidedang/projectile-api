let chai = require('chai');
var assert = require('assert');
let expect = chai.expect;
let timeularAPI = require('../timeularAPI');
let fs = require('fs');

let chaiHttp = require('chai-http');
let should = chai.should();
const host = "http://localhost:3001";

chai.use(chaiHttp);

// IMPORTANT NOTE FOR TESTING:
// Set the parameter values in config.json before running the tests! 

let config = {}; 
let activityID = null; 

// Initializing parameters from config and set token 
before(function () {
  config = JSON.parse(fs.readFileSync('./config.json'));
  activityID = config.test.timeular.TimularActivityID;
  let token = JSON.parse(fs.readFileSync('timeularToken.txt'));
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


describe('book an Entry in Timeular API', function () {
  it('should save successfully', async () => {
    let response = await timeularAPI.bookActivityNG({
      date: '2018-05-31', 
      duration: '1',
      activityId: activityID,
      note: 'hallo'
    });
    expect(response, 'returnValue of Save function should be true').to.be.true;
  })
})


