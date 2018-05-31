let chai = require('chai');
var assert = require('assert');
let expect = chai.expect;
let projectileAPI = require('../projectileAPI');
let fs = require('fs');

let chaiHttp = require('chai-http');
let should = chai.should();
const host = "http://localhost:3001";

chai.use(chaiHttp);


describe('book an Entry in Projectile API', function() { 
    this.timeout(7000);
   
    it('it should save successfully', async () => { 
      let response = await projectileAPI.save('2018-05-31',1,'2759-327','hallo'); 
      expect(response.returnValue, 'returnValue of Save fn should be true').to.be.true; 
    })
  })