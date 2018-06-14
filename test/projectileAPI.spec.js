let chai = require('chai');
var assert = require('assert');
let expect = chai.expect;
let projectileAPI = require('../projectileAPI');
let fs = require('fs');

let chaiHttp = require('chai-http');
let should = chai.should();
const host = "http://localhost:3001";

chai.use(chaiHttp);

before(function () {
    config = JSON.parse(fs.readFileSync('./config/test.json'));
    activity = config.test.projectile.activity;
    date = config.test.projectile.date;
    duration = config.test.projectile.duration;
    note = config.test.projectile.note;
    let user = JSON.parse(fs.readFileSync('user.txt'));
    projectileAPI.initializeUser(user);
  })


describe('book an Entry in Projectile API', function() { 
    this.timeout(7000);

    it('it should save successfully', async () => { 
      let response = await projectileAPI.save(date,duration,activity,note);
      expect(response.returnValue, 'returnValue of Save fn should be true').to.be.true;
    })
  })
