let chai = require('chai');
let assert = require('assert')
let expect = chai.expect;
const Normalize = require('../../TimeularApi/Normalize');
const fs = require('fs')
const winston = require('winston')
let token = JSON.parse(fs.readFileSync('timeularToken.txt'));
let projectile = require('../../projectileAPI');
let sinon = require('sinon')

let projectileList = require('../mocks/projectileList');
let timeList = JSON.parse(fs.readFileSync('./test/mocks/timeularList.json'));



const Merge = require('../../TimeularApi/Merge')
const merge = new Merge([], [], token.apiToken)

describe('UNIT TESTS NORMALIZE', function () {
    let client;
    let server;
    let clientDaysInProjectile;

    it('should group Objects to an Array with same Date', () => {

        let monthCleaned = merge.cleanArray(timeList);
        this.client = Normalize.splitIntoSeperateDays(monthCleaned)
        this.server = Normalize.splitIntoSeperateDays(projectileList)

        for (var i = 0; i < this.client.length - 1; i++) {
            assert.notEqual(this.client[i][0].StartDate, this.client[i + 1][0].StartDate, 'should not be the same')
        }

        for (var i = 0; i < this.server.length - 1; i++) {
            assert.notEqual(this.server[i][0].StartDate, this.server[i + 1][0].StartDate, 'should not be the same')
        }
    })

    it('should get all entries of Serverlist which the same Date as Client', () => {
        let clientDaysInProjectile = [];
        this.client.forEach((item) => {
            clientDaysInProjectile.push(this.server.filterAdvanced((obj) => obj[0].StartDate == item[0].StartDate, (temp) => this.server.indexOf(temp)))
        });

        assert(Normalize.getIndexesOfSameDateInClient(this.client, this.server), clientDaysInProjectile)
        console.log(clientDaysInProjectile)
        console.log(Normalize.getIndexesOfSameDateInClient(this.client, this.server))
    })

    it('should split the serverArray into one containing the client dates and one with the rest', () => {

        let clientDaysInProjectile = [0, 2, 3, 5, 6]
        let obj = Normalize.prepareForSaveAndDeleting(Normalize.splitIntoSeperateDays(projectileList), clientDaysInProjectile)
        this.cleanProjectileList = obj.cleanProjectileList;
        console.log(obj.dayList)
        /* expect(obj.cleanProjectileList.length).to.equal(2) */
        expect(obj.dayList.length).to.equal(clientDaysInProjectile.length)
    })

    it('should delete Empty Slots from Projectile ', async () => {
        let cleanProjectileList = this.cleanProjectileList.slice(0);
        const projectileStub = sinon.stub(projectile, 'delete').callsFake(() => {
        })
        await Normalize.deleteProjectileEmptySlots(cleanProjectileList, projectile);
        console.log(cleanProjectileList)
        projectileStub.restore();
    })
})
