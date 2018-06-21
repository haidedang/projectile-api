let chai = require('chai');
let expect = chai.expect;
const Normalize = require('./Normalize');
const fs = require('fs')
let token = JSON.parse(fs.readFileSync('timeularToken.txt'));