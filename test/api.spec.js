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



before(function () {
    config = JSON.parse(fs.readFileSync('./config/test.json'));
    timeularActivityID = config.test.timeular.TimularActivityID;
    activity = config.test.projectile.activity;
    date = config.test.projectile.date;
    duration = config.test.projectile.duration;
    note = config.test.projectile.note;
    let user = JSON.parse(fs.readFileSync('user.txt'));
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

//------------ SERVER API TESTS 
describe('ProjectileAPI', function () {
    this.timeout(7000);

    describe('GET ProjectileList', () => {
        it('it should GET all the tasks', (done) => {
            chai.request(server)
                .get('/showListProjectile')
                .end((err, res) => {
                    res.should.have.status(200);
                    // res.body.should.be.a('string'); 
                    // expect(res.body.length).to.not.equal(0);
                    done()
                })
        })
    })

   /*  describe('book an Entry in Projectile API', function () {

        it('it should save successfully', (done) => {
            chai.request(server)
                .get(`/book/${date}/${duration}/${timeularActivityID}/${note}`)
                .end((err, res) => {
                    res.should.have.status(200);
                    done()
                })
        })
    }) */
    describe('user setup', () => {
        it('should return a User', () => {
            let result = server.apiConfig.retrieveUserData({
                projectileUser: config.test.projectile.projectileUser,
                projectilePassword: config.test.projectile.projectilePassword,
                timeularApiKey: config.test.projectile.timeularApiKey,
                timeularApiSecret: config.test.projectile.timeularApiSecret
            })
            expect(result).to.deep.equal({ login: config.test.projectile.projectileUser, password: config.test.projectile.projectilePassword })
        })
    })

    describe('it should successfully set Up UserCredentials for API Usage', function () {

        it('if no usercredential data is passed, it should return false', (done) => {
            chai.request(server)
                .post('/start')
                .send({})
                .end(function (err, res, body) {
                    res.should.have.status(200);
                    res.body.credsPresent.should.be.false
                    done();
                })
        })

        it('it should write UserFile and TimularFile successfully', (done) => {
            chai.request(server)
                .post('/start')
                .send({
                    projectileUser: config.test.projectile.projectileUser,
                    projectilePassword: config.test.projectile.projectilePassword,
                    timeularApiKey: config.test.projectile.timeularApiKey,
                    timeularApiSecret: config.test.projectile.timeularApiSecret
                })
                .end(function (err, res, body) {
                    res.should.have.status(200);
                    res.body.credsPresent.should.be.true
                    done();
                })
        })

    })
})
