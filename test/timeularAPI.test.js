const chai = require('chai');
// const assert = require('assert');
const expect = chai.expect;
const timeularAPI = require('../timeularAPI');
const projectileAPI = require('../projectileAPI.js');
const fs = require('fs');

const chaiHttp = require('chai-http');
// const should = chai.should();
// const host = 'http://localhost:3001';
const sinon = require('sinon');

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

describe('Test fn compareActivities()', function() {
  it('should analyse the data and return a json with two entries containing 1 result in each array.', async() => {
    const stubPTile = sinon.stub(projectileAPI, 'fetchNewJobList').callsFake(function fakeFn() {
      return [
        {
          'name':'Interne Organisation 2018',
          'no':'2759-62',
          'remainingTime':0,
          'limitTime':0,
          'Totaltime':365.5
        },
        {
          'name':'Einarbeitung',
          'no':'2788-3',
          'remainingTime':4,
          'limitTime':4,
          'Totaltime':0
        },
      ];
    });

    const stubTimeular = sinon.stub(timeularAPI, 'getActivities').callsFake(function fakeFn() {
      return {
        'activities': [
          {
            'id': '127170',
            'name': 'Interne Organisation 2018 [2759-62]',
            'color': '#8cc250',
            'integration': 'zei',
            'deviceSide': 1
          },
          {
            'id': '147067',
            'name': 'Produktentwicklung [2775-115]',
            'color': '#c2544b',
            'integration': 'zei',
            'deviceSide': null
          }
        ]
      };
    });

    const result = await timeularAPI.compareActivities();

    expect(result).to.not.be.empty; // eslint-disable-line no-unused-expressions
    expect(result.projectileHasTimeularNot).to.not.be.empty; // eslint-disable-line no-unused-expressions
    expect(result.timeularHasProjectileNot).to.not.be.empty; // eslint-disable-line no-unused-expressions
    // eslint-disable-next-line no-unused-expressions
    expect(result.projectileHasTimeularNot[0].name).to.equal('Einarbeitung');
    // eslint-disable-next-line no-unused-expressions
    expect(result.timeularHasProjectileNot[0].name).to.equal('Produktentwicklung [2775-115]');

    stubPTile.restore();
    stubTimeular.restore();
  });
});

describe('Test fn packageActivityList()', function() {
  it('returns fitting pairs of activity and package id', async() => {
    // exports.getActivities()
    const stubGetActivities = sinon.stub(timeularAPI, 'getActivities').callsFake(function fakeFn() {
      // fake values
      return {
        'activities': [
          {
            'id': '127170',
            'name': 'Interne Organisation 2018 [2759-62]',
            'color': '#8cc250',
            'integration': 'zei',
            'deviceSide': 1
          },
          {
            'id': '147067',
            'name': 'Produktentwicklung [2775-115]',
            'color': '#c2544b',
            'integration': 'zei',
            'deviceSide': 2
          }
        ]
      };
    });
    const result1 = await timeularAPI.packageActivityList('127170');
    const result2 = await timeularAPI.packageActivityList('2775-115');

    stubGetActivities.restore();

    expect(result1).to.not.be.empty; // eslint-disable-line no-unused-expressions
    expect(result2).to.not.be.empty; // eslint-disable-line no-unused-expressions
    // eslint-disable-next-line no-unused-expressions
    expect(result1.Activity).to.equal('127170');
    // eslint-disable-next-line no-unused-expressions
    expect(result1.Package).to.equal('2759-62');
    // eslint-disable-next-line no-unused-expressions
    expect(result2.Activity).to.equal('147067');
    // eslint-disable-next-line no-unused-expressions
    expect(result2.Package).to.equal('2775-115');
  });
});

// exports.updateActivities(create, archive)
// createActivity(name, no)
// archiveActivity(activityId)
// bookActivityNG({date, duration, activityId, note})
describe('Test fn bookActivityNG({date, duration, activityId, note})', function() {
  it('should process the duration correctly', async() => {
    // 3 duration Entries: x.xx, x,xx, x:xx + 1x full hours
    // 1 timeEntry mit Endzeit nach 00:00:00.. um das Anpassen der Startzeit zu testen! (book0)

    // get timeEntries!
    const stubBook0 = sinon.stub(timeularAPI.bookActivityNG, 'book0').callsFake(function fakeFn() {
      return {
        'timeEntries': [
          {
            'id': '2721513',
            'activity': {
              'id': '127170',
              'name': 'Interne Organisation 2018 [2759-62]',
              'color': '#8cc250',
              'integration': 'zei'
            },
            'duration': {
              'startedAt': '2018-07-02T08:00:00.000',
              'stoppedAt': '2018-07-02T08:45:00.000'
            },
            'note': {
              'text': 'Teammeeting',
              'tags': [],
              'mentions': []
            }
          },
          {
            'id': '2721532',
            'activity': {
              'id': '127170',
              'name': 'Interne Organisation 2018 [2759-62]',
              'color': '#8cc250',
              'integration': 'zei'
            },
            'duration': {
              'startedAt': '2018-07-02T08:45:00.000',
              'stoppedAt': '2018-07-02T09:45:00.000'
            },
            'note': {
              'text': 'Testing',
              'tags': [],
              'mentions': []
            }
          }
        ]
      };
    });

    // book timeEntry
    const stubBook1 = sinon.stub(timeularAPI.bookActivityNG, 'book1').callsFake(function fakeFn(timeEntry) {
      // check timeEntry, correct start and stoptime?
      const providedStartedAt = timeEntry.startedAt.toISOString().substr(11, 19);
      const providedStoppedAt = timeEntry.stoppedAt.toISOString().substr(11, 19);
      if ((providedStartedAt === '09:45:00') && ((providedStoppedAt === '10:45:00') ||
      (providedStoppedAt === '11:15:00'))) {
        // means duration was correctly added to startedAt and startedAt was correctly recognized from existing entries
        return 201;
      }
      return 404;
    });



    // provoke certain returnvalues for those functions and check the results (use spy for variables?!)
    // "Spies, which offer information about function calls, without affecting their behavior"
    // --> getSumMinutes checken usw!

    // const result = await timeularAPI.bookActivityNG({'2018-07-02', '1', '127170', 'testing purposes only'});
    const result = await timeularAPI.bookActivityNG({
      date: '2018-07-02', duration: '1', activityId: '127170', note: 'testing purposes only'});
    // eslint-disable-next-line no-unused-expressions
    expect(result).to.be.true;

    stubBook0.restore();
    stubBook1.restore();

    // TODO place getSumMinutes outside of bookActivityNG fn?!?!
    /*
    // eslint-disable-next-line no-unused-expressions
    expect(timeularAPI.bookActivityNG.getSumMinutes('1')).to.equal('60');
    // eslint-disable-next-line no-unused-expressions
    expect(timeularAPI.bookActivityNG.getSumMinutes('1,5')).to.equal('90');
    // eslint-disable-next-line no-unused-expressions
    expect(timeularAPI.bookActivityNG.getSumMinutes('1.5')).to.equal('90');
    // eslint-disable-next-line no-unused-expressions
    expect(timeularAPI.bookActivityNG.getSumMinutes('1:30')).to.equal('90');
    */
  });
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

/*
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
*/
