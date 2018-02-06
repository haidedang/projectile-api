const request = require('request');
const index = require('./index.js');
const fs = require('fs');

let token;
try {
  token = JSON.parse(fs.readFileSync('timeularToken.txt'));
} catch (e) {
  console.log('No token file seems to be available. Please run "node getTimularToken.js" to create a token file.');
  process.exit();
}


function getTimeList(startDate, endDate){
    return new Promise((resolve,reject)=>{
        let listentry = 0;
        let month = [];
        let monthCleaned = [];
        let timeperiod = startDate + 'T00:00:00.000/' + endDate + 'T23:59:59.999';

        request.get('https://api.timeular.com/api/v2/time-entries/' + timeperiod,{
           headers: {
               Authorization:'Bearer ' + token.apiToken,
               Accept: 'application/json;charset=UTF-8'
           }
        }, (err, res)=> {
          let timeList = JSON.parse(res.body);

          for (let i = 0; i < timeList.timeEntries.length; i++){
            let day = {};
            day["StartDate"] = timeList.timeEntries[i].duration.startedAt.substring(0, timeList.timeEntries[i].duration.startedAt.indexOf("T"));
            day["listEntry"] = 0;
            /*
            timestamp is inaccurate. sometimes 2h = 120min has a value thats != 120min. To solve that I cut the
            seconds and milliseconds from the timestamp. Decreases accuracy --> alternative would be to round values
            */
            // debugging
            // console.log(timeList.timeEntries[i].duration);
            day["Duration"] = (Date.parse(timeList.timeEntries[i].duration.stoppedAt.substring(0, timeList.timeEntries[i].duration.stoppedAt.lastIndexOf(":"))) - Date.parse(timeList.timeEntries[i].duration.startedAt.substring(0, timeList.timeEntries[i].duration.startedAt.lastIndexOf(":"))))/60000;
            day["Activity"] = timeList.timeEntries[i].activity.name.substring(timeList.timeEntries[i].activity.name.lastIndexOf("[")+1,timeList.timeEntries[i].activity.name.lastIndexOf("]"));
            day["Note"] = timeList.timeEntries[i].note.text;
            // console.log(day);
            month.push(day);
          }

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
          monthCleaned.forEach((obj)=>{
              index.save(obj["StartDate"], obj["listEntry"], obj["Duration"],  obj["Activity"], obj["Note"]);
              // for testing only
              // console.log(obj["StartDate"], obj["listEntry"], obj["Duration"],  obj["Activity"], obj["Note"]);
          })
          return monthCleaned;
        })
    })
}

getTimeList('2018-02-06', '2018-02-06');
