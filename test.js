const request = require('request');
const rp = require('request-promise');

async function main() {

  let bla = await rp({
    method: 'GET',
    uri: 'http://google.com',
    resolveWithFullResponse: true
  })
      .then(function (response2) {
        console.log('within await rp then: ' + response2.body.substr(1,10));
        return response2.statusCode;
        //return response.substr(1,5);
    })
    .catch(function (err) {
        // Crawling failed...
    });
  console.log('bla: ' + bla);

  console.log('######');

  let funky = await rp('http://google.com', {resolveWithFullResponse: true})
  .then((process, handleError) => {
    console.log('funky ' + process.statusCode);
    return process.body;
  });
  console.log(funky.substr(1,20));

  console.log('######');

  let options = {
      method: 'GET',
      uri: 'http://google.com',
      resolveWithFullResponse: true    //  <---  <---  <---  <---
  };

  let blubb = await rp(options)
      .then(function (response) {
          console.log("GET succeeded with status %d", response.statusCode);
          console.log('within await rp then: ' + response.body.substr(1,20));
          return response.statusCode;
      })
      .catch(function (err) {
          // Delete failed...
      });
  console.log(blubb);
}

main();
