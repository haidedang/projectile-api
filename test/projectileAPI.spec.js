const chai = require('chai');
// const assert = require('assert');
const projectileAPI = require('../projectileAPI');
const fs = require('fs');

const chaiHttp = require('chai-http');
// const should = chai.should();
// const host = 'http://localhost:3001';

chai.use(chaiHttp);

before(function() {
  config = JSON.parse(fs.readFileSync('./config/test.json'));
  activity = config.test.projectile.activity;
  date = config.test.projectile.date;
  duration = config.test.projectile.duration;
  note = config.test.projectile.note;
  const user = JSON.parse(fs.readFileSync('user.txt'));
  projectileAPI.initializeUser(user);
});

describe('UNIT TESTS Projectile API', function() {
  this.startDate = '2018-06-18';
  this.endDate = '2018-06-24';

  this.timeout(7000);

  /*  it('it should save successfully', async () => {
     let response = await projectileAPI.save(date,duration,activity,note);
     expect(response.returnValue, 'returnValue of Save fn should be true').to.be.true;
   })
*/
  it('should get all Projectile Entries in a Time Frame and bring it to the right format', async() => {
    const TimeRangeArray = [];
    const temp = [];

    const List = await projectileAPI.getallEntriesInTimeFrame(this.startDate, this.endDate);
    const obj = List['values'];
    for (key in obj) {
      if (key.match('DayList')) {
        TimeRangeArray.push(obj[key]);
      }
    }
    TimeRangeArray.forEach(item => {
      const entryObj = {};
      entryObj['StartDate'] = item[item.map(item => item.n).indexOf('Day')]['v'];
      entryObj['Duration'] = item[item.map(item => item.n).indexOf('Time')]['v'];
      entryObj['Activity'] = item[item.map(item => item.n).indexOf('What')]['v'];
      entryObj['Note'] = item[item.map(item => item.n).indexOf('Note')]['v'];
      temp.push(entryObj);
    });

    assert.notEqual(temp.length, 0, 'array should contain Daylist objects');
    // fs.writeFileSync('./test/mocks/projectileList', JSON.stringify(temp, null, 2))
    // console.log(temp)
  });
});
