let server = require('../api');
let chai = require('chai');
var assert = require('assert');
let expect = chai.expect;
let projectileAPI = require('../projectileAPI');
let fs = require('fs');

let chaiHttp = require('chai-http');
let should = chai.should();
const host = "http://localhost:3001";

chai.use(chaiHttp);

// ---- INITIAL TEST SETUP --------- 

let tempCookie = null;

before(async function () {
    let user = fs.readFileSync('user.txt').toString();
    projectileAPI.initializeUser(user);
})

describe('Login', function () {
    this.timeout(7000);
    it('Initialize User & Log In', async () => {
        const cookie = await projectileAPI.login();
        expect(cookie.includes('JSESSIONID'), "cookie should have ID").to.be.true
        tempCookie = cookie;
    })
})