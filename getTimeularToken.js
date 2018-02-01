const fs = require('fs');
const request = require('request');

// apiKey=<key> apiSecret=<key> node getTimeularToken.js

let apiKey = process.env.apiKey;
let apiSecret = process.env.apiSecret;

if (!apiKey || !apiSecret) {
  console.log('Please visit: https://profile.timeular.com/#/app/ and create an API key and API Secret.');
  process.exit();
}

request.post('https://api.timeular.com/api/v2/developer/sign-in',{
  headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json;charset=UTF-8'
  },
  json: { 'apiKey': 'MTMzNjdfNjYzNzhkM2VmMGM5NGUzOTg5NTc4MWI2ZjI4NDg0ZGM=', 'apiSecret': 'NzE4OWYwN2EwMDc3NGU3NGJjZWJjYzMyNTA3MTZkYTM='
  },

}, (err, res, body) => {
  let apiToken = res.body.token;

  let timeularApi = {
      apiToken: apiToken
  }

  fs.writeFile('timeularToken.txt', JSON.stringify(timeularApi), (err) => {
      if (err) throw err;
      console.log("The file has been saved!");
  });

});
