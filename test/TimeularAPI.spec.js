const chai = require('chai');
// const assert = require('assert');
const expect = chai.expect;
const timeularAPI = require('../timeularAPI');
const fs = require('fs');

const chaiHttp = require('chai-http');
// const should = chai.should();
// const host = 'http://localhost:3001';

chai.use(chaiHttp);

// IMPORTANT NOTE FOR TESTING:
// Set the parameter values in config.json before running the tests!

let config = {};
let activityID = null;

// Initializing parameters from config and set token
before(function() {
  config = JSON.parse(fs.readFileSync('./config/test.json'));
  activityID = config.test.timeular.TimularActivityID;
  date = config.test.timeular.date;
  duration = config.test.timeular.duration;
  note = config.test.timeular.note;
  const token = JSON.parse(fs.readFileSync('timeularToken.txt'));
  timeularAPI.initializeToken(token);
});

describe('get Activites/Activity from Timeular', function() {
  it('should return all Activities', async() => {
    const result = await timeularAPI.getActivities();
    expect(result.activities.length).to.not.equal(0);
  });

  it('return specific Activity with package', async() => {
    const result = await timeularAPI.packageActivityList(activityID);
    expect(result.Activity.includes(activityID)).to.be.true; // eslint-disable-line no-unused-expressions
  });
});


describe('book an Entry in Timeular API', function() {
  it('should save successfully', async() => {
    const response = await timeularAPI.bookActivityNG({
      date,
      duration,
      activityId: activityID,
      note
    });
    expect(response, 'returnValue of Save function should be true').to.be.true; // eslint-disable-line
  });
});
