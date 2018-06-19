const server = require('../api');
const chai = require('chai');
// const assert = require('assert');
const expect = chai.expect;
const projectileAPI = require('../projectileAPI');
const fs = require('fs');

const chaiHttp = require('chai-http');
// const should = chai.should();
chai.should(); // necessary, const should = would be unsused
// const host = 'http://localhost:3001';

chai.use(chaiHttp);

// ---- INITIAL TEST SETUP ---------
// const tempCookie = null;

before(function() {
  config = JSON.parse(fs.readFileSync('./config/test.json'));
  timeularActivityID = config.test.timeular.TimularActivityID;
  activity = config.test.projectile.activity; // packages, not activity
  date = config.test.projectile.date;
  duration = config.test.projectile.duration;
  note = config.test.projectile.note;
  const user = JSON.parse(fs.readFileSync('user.txt'));
  projectileAPI.initializeUser(user);
});

describe('Login', function() {
  this.timeout(7000);
  it('Initialize User & Log In', async() => {
    const cookie = await projectileAPI.login();
    expect(cookie.includes('JSESSIONID'), 'cookie should have ID').to.be.true; // eslint-disable-line
    // tempCookie = cookie;
  });
});

// ------------ SERVER API TESTS
describe('ProjectileAPI', function() {
  this.timeout(7000);
  describe('GET ProjectileList', () => { // done
    it('it should GET all the tasks', (done) => { // done
      chai.request(server)
        .get('/showListProjectile')
        .end((err, res) => {
          res.should.have.status(200);
          // res.body.should.be.a('string');
          // expect(res.body.length).to.not.equal(0);
          if (err) {
            console.log('ProjectileAPI -> /showListProjectil: An error occured while testing. ', err);
          }
          done();
        });
    });
  });

  describe('book an Entry in Projectle and Timeular via Projectile API call', function() {
    this.timeout(7000);
    projectileAPI.projectileOnly = false;
    it('it should save successfully, returning status 200 and the booked parameters as json', (done) => {
      chai.request(server)
        .get(`/book/${date}/${duration}/${timeularActivityID}/${note}`)
        .end((err, res) => {
          // res.should.have.status(200);
          res.text.should.equal('2018-06-19 1 127170 hallo');
          res.status.should.equal(200);
          if (err) {
            console.log('ProjectileAPI -> /book/${date}/${duration}/${timeularActivityID}/${note}: An error ' +
              'occured while testing. ', err);
          }
          done();
        });
    });
  });

  describe('book an Entry in Projectile only via Projectile API call', function() {
    this.timeout(7000);
    projectileAPI.projectileOnly = true;
    it('it should save successfully, returning status 200 and the booked parameters as json', (done) => {
      chai.request(server)
        .get(`/book/${date}/${duration}/${timeularActivityID}/${note}`)
        .end((err, res) => {
          // res.should.have.status(200);
          res.text.should.equal('2018-06-19 1 127170 hallo');
          res.status.should.equal(200);
          if (err) {
            console.log('ProjectileAPI -> /book/${date}/${duration}/${timeularActivityID}/${note}: An error ' +
              'occured while testing. ', err);
          }
          done();
        });
    });
  });

});
