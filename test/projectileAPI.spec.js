const chai = require('chai');
// const assert = require('assert');
const expect = chai.expect;
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


describe('book an Entry in Projectile save function', function() {
  this.timeout(7000);

  it('it should save successfully', async() => {
    const response = await projectileAPI.save(date, duration, activity, note);
    expect(response.returnValue, 'returnValue of Save fn should be true').to.be.true; // eslint-disable-line
  });
});
