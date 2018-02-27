const fs = require('fs');
const request = require('request');

// apiKey=<key> apiSecret=<key> node getTimeularToken.js

let apiKey = process.env.apiKey;
let apiSecret = process.env.apiSecret;

if (!apiKey || !apiSecret) {
  console.log('Please visit: https://profile.timeular.com/#/app/ and create an API key and API Secret and provide it here as an environment variable.');
  process.exit();
}

request.post('https://api.timeular.com/api/v2/developer/sign-in',{
  headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json;charset=UTF-8'
  },
  json: {
    'apiKey': apiKey,
    'apiSecret': apiSecret
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
