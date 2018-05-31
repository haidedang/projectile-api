let chai = require('chai');
var assert = require('assert');
let expect = chai.expect;
let timeularAPI = require('../timeularAPI');
let fs = require('fs');

let chaiHttp = require('chai-http');
let should = chai.should();
const host = "http://localhost:3001";

chai.use(chaiHttp);

before(function () {
  let token = JSON.parse(fs.readFileSync('timeularToken.txt'));
  timeularAPI.initializeToken(token);
})

describe('get Activites from Timeular', function(){
  it('should return all Activities', async ()=> {
    let result = await timeularAPI.getActivities(); 
    expect(result.activities.length).to.not.equal(0); 
  })
})

describe('book an Entry in Timeular API', function () {
  it('should save successfully', async () => {
    let response = await timeularAPI.bookActivityNG('2018-05-31', '1', '106114', 'hallo');
    expect(response, 'returnValue of Save fn should be true').to.be.true;
  })
})