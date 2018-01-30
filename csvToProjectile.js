// Reads from a CSV table and post its data automatically to projectile

const index = require('./index.js');

let listentry = 0;
let month = [];
let monthCleaned = [];

const csvFilePath = './report5-2.csv';
const csv = require('csvtojson');
csv()
    .fromFile(csvFilePath)
    .on('json',(jsonObj)=>{
        let day = {};
        day["StartDate"] = jsonObj["StartDate"];
        day["listEntry"] = 0;
        day["Duration"] = jsonObj["Duration"]/60;
        // extract Activity from activity string of form "text [jobnumber]"
        day["Activity"] = jsonObj["Activity"].substring(jsonObj["Activity"].lastIndexOf("[")+1,jsonObj["Activity"].lastIndexOf("]"));
        day["Note"] = jsonObj["Note"];
        month.push(day);
    })
    .on('done',(error)=>{

        console.log('end');

        // merging Duration time of dup Note lines for entries from same day
        for (var i = 0; i<month.length; i++){
          for (var j = i + 1; j<month.length; j++){ // j = i + 1 becuase .csv is sorted!
            if((month[i]["StartDate"] === month[j]["StartDate"]) && (month[i]["Note"] === month[j]["Note"])){
              month[i]["Duration"] = (month[i]["Duration"] * 60 + month[j]["Duration"] * 60 ) / 60;
              month.splice(j, 1); // remove merged entry from original array, to avoid recounting them in next i increment
              j--; // as one entry is spliced, the next candidate has the same j index number!
            } else if (month[i]["StartDate"] !== month[j]["StartDate"]) {
              break; // Date matches no longer? csv is sorted, break the comparison loop
            }
          }
          monthCleaned.push(month[i]); // output the merged day entry to clean array
        }

        // set listEntry numbers for clean pushing to projectile
        for (var i = 0; i<monthCleaned.length; i++){
            if (i == monthCleaned.length-1){
                month[i]["listEntry"]=listentry;
            } else{
                month[i]["listEntry"]=listentry;
                if(month[i]["StartDate"] === month[i+1]["StartDate"]){  // simpler
                    listentry= listentry +1;
                } else {
                    listentry = 0;
                }
            }
        }
        console.log(month);
        monthCleaned.forEach((obj)=>{
            index.save(obj["StartDate"], obj["listEntry"], obj["Duration"],  obj["Activity"], obj["Note"]);
            // for testing only
            // console.log(obj["StartDate"], obj["listEntry"], obj["Duration"],  obj["Activity"], obj["Note"]);
        })
    });
