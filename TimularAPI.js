const request = require('request'); 
const csv = require('csvtojson'); 
const fs = require('fs');
/* 
var options = { method: 'GET',
  url: 'https://api.timeular.com/api/v2/report/2018-01-01T00%3A00%3A00.000/2018-01-31T00%3A00%3A00.000',
  qs: { timezone: 'Europe/Berlin' },
  headers: 
   { 'postman-token': 'b974cbfc-609b-703b-f11c-1ed107b8714c',
     'cache-control': 'no-cache',
     authorization: 'Bearer eyJhbGciOiJIUzUxMiJ9.eyJ0eXBlIjoidXNlciIsInN1YiI6IjEzMDg2In0.j5KdbbpkkkLZlKQEk15vVop_HzuI2S7CNibqJ1JmGErJZHR6l4RG51yXY2UqVMbcRXvoN14_R-szY5ff-okn8w' } };

request(options, function (error, response, body) {
  if (error) throw new Error(error);

  console.log(body);
});
 */
// TO DO:  API TOKEN CONFIG 

let month = [];

function getCSVFile(){ 
    return new Promise((resolve,reject)=>{ 
        request.get('https://api.timeular.com/api/v2/report/2018-01-01T00%3A00%3A00.000/2018-02-10T00%3A00%3A00.000',{ 
            qs: { timezone:'Europe/Berlin', 
           }, 
           headers: { 
               authorization:'Bearer eyJhbGciOiJIUzUxMiJ9.eyJ0eXBlIjoidXNlciIsInN1YiI6IjEzMDg2In0.j5KdbbpkkkLZlKQEk15vVop_HzuI2S7CNibqJ1JmGErJZHR6l4RG51yXY2UqVMbcRXvoN14_R-szY5ff-okn8w"eyJhbGciOiJIUzUxMiJ9.eyJ0eXBlIjoidXNlciIsInN1YiI6IjEzMDg2In0.j5KdbbpkkkLZlKQEk15vVop_HzuI2S7CNibqJ1JmGErJZHR6l4RG51yXY2UqVMbcRXvoN14_R-szY5ff-okn8w'
           }
        }, (err, res)=> { 
             
            csv({noheader:false}).fromString(res.body).on('csv', (csvRow)=> { 
                let day = {};
                day["StartDate"] = csvRow[2];
                day["listEntry"] = 0;
                day["Duration"] = csvRow[8]/60;
                // extract Activity from activity string of form "text [jobnumber]"
                day["Activity"] = csvRow[10].substring(csvRow[10].lastIndexOf("[")+1,csvRow[10].lastIndexOf("]"));
                day["Note"] = csvRow[12];
                month.push(day);
                resolve(month);
            }).on('done', ()=> { })
        })
    })
}

async function don(){ 
    let a = await getCSVFile(); 
    console.log(a);
}


don();
/* 
csv().fromStream(request.get('https:')) */