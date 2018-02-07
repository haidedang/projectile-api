const request = require('request');
const index = require('./index.js');
const fs = require ('fs');

// TO DO:  API TOKEN CONFIG

let listentry = 0;
let month = [];
let monthCleaned = [];
let entryList =[]; 

// initialize global variables 
async function init(){ 
    entryList = await index.getDayListToday(); 
    return entryList.splice(6); 
}

function main(){
    return new Promise((resolve,reject)=>{

         // request.get('https://api.timeular.com/api/v2/time-entries/2017-01-01T00:00:00.000/2018-01-31T00:00:00.000',{
         request.get('https://api.timeular.com/api/v2/time-entries/2018-02-01T00%3A00%3A00.000/2018-02-10T00%3A00%3A00.000',{
           headers: {
              // Authorization:'Bearer eyJhbGciOiJIUzUxMiJ9.eyJ0eXBlIjoidXNlciIsInN1YiI6IjEzMzY3In0.uH9KRRnwKJlWtDo9BesixQG5UdIp-9TSzOUndPVbBuV0MyfXZwS0MN79AwKGqX4hX_sBBWoItVmaOIjVVXYRew',
              Authorization: 'Bearer eyJhbGciOiJIUzUxMiJ9.eyJ0eXBlIjoidXNlciIsInN1YiI6IjEzMDg2In0.j5KdbbpkkkLZlKQEk15vVop_HzuI2S7CNibqJ1JmGErJZHR6l4RG51yXY2UqVMbcRXvoN14_R-szY5ff-okn8w',
              Accept: 'application/json;charset=UTF-8'
           }
        }, (err, res)=> {
          let timeList = JSON.parse(res.body);

          for (let i = 0; i < timeList.timeEntries.length; i++){
            let day = {};
            day["StartDate"] = timeList.timeEntries[i].duration.startedAt.substring(0, timeList.timeEntries[i].duration.startedAt.indexOf("T"));
            // day["listEntry"] = 0;
            /*
            timestamp is not accurate. sometimes 2h = 120min has a value thats != 120min. To solve that I cut the
            seconds and milliseconds from the timestamp. Decreases precision --> alternative would be to round values
            */
            day["Duration"] = ((Date.parse(timeList.timeEntries[i].duration.stoppedAt.substring(0, timeList.timeEntries[i].duration.stoppedAt.lastIndexOf(":"))) - Date.parse(timeList.timeEntries[i].duration.startedAt.substring(0, timeList.timeEntries[i].duration.startedAt.lastIndexOf(":"))))/60000)/60;
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

    //   saveToProjectile(monthCleaned);
         /*  normalize().then((result)=> {console.log(result); saveToProjectile()});  */
         normalizeUP("2018-02-01", "2018-02-09", monthCleaned).then((result)=>{console.log(result) ;saveToProjectile(result)}); 

           
/*             projectileList('2018-02-01', '2018-02-07').then((item)=>console.log(item));     
 */

/*           fetchDayList('2018-02-03').then((item)=> console.log(item));
 */          
          // Delete all entries, which already exists in projectile out of monthCleaned. 

          /* saveToProjectile();  */

          // DEPRECEATED, eventually not needed anymore, Projectile saving on top of free stack 
          /* // set listEntry numbers for clean pushing to projectile
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
          } */

              
        })
    })
}

init().then(()=>{main()});



// after that function , monthcleaned contains only limitless packages 
// Timelar list will splice every element with limited packages into a seperate array 
/**
 * 
 * @param {*} limitPackageArrayFromServer  (Array containing the objects with limitedTime)
 *@returns {} 
 * 
 */
async function timularClient(monthArray, limitPackageArrayFromServer){
    let package = {};  
    let monthLimitPackage = [];
    // Check every element of Timular list for the packages and split them into a seperate array. 
    for (var i = 0; i< limitPackageArrayFromServer.length; i++ ){ 
        await index.joblistLimited(monthArray, "Activity", (item)=> {
            return item == limitPackageArrayFromServer[i]["no"]; 
        }).then((result)=>{ result.forEach((result)=> monthLimitPackage.push(result))}); 
    }

    // store the arrays in different object properties 
    package.limit = monthLimitPackage; 
    package.limitless = monthArray; 
    return package; 

}

/**
 * splitting the monthCleaned into  seperates arrays to process, 
 * async saving of limitless packages 
 * synchronous saving of limit packages with checking 
 */
async function saveToProjectile(monthArray){ 
    // Fetch an actual Joblist from the server 
    let data = await index.fetchNewJobList();
    // return an Array which contains every element with Limited Time 
    let limitPackageArrayFromServer = await index.joblistLimited(data, "limitTime", (item)=> { 
        return item > 0; 
    });
    // split Timular list into List with limitless and packages with limit
    let package = await timularClient(monthArray, limitPackageArrayFromServer); 

    //async saving of packages without limit 
   /*  package.limitless.forEach((obj)=>{
        index.save(obj["StartDate"], obj["listEntry"], obj["Duration"],  obj["Activity"], obj["Note"]);
    }) */

    //synchronous saving of packages without limit 
    async function syncSaving (package){ 
        for (var i = 0; i< package.limitless.length; i++){ 
            await index.save(package.limitless[i]["StartDate"], package.limitless[i]["listEntry"], package.limitless[i]["Duration"],  package.limitless[i]["Activity"], package.limitless[i]["Note"]);
        }
    }

    syncSaving(package); 




    //  synchrounously saving and checking packages with limit 
    for(var i = 0; i< package.limit.length; i++){ 
        // fetch projectile instance of the current project and get the remaining time 
        let data = await index.fetchNewJobList();
        let projectileObject = await index.joblistLimited(data, "no", (item)=> { 
            return item === package.limit[i]["Activity"]; 
        });

        console.log(package.limit[i].Duration); 
        console.log( Number(projectileObject[0].remainingTime));
        // compare the timular project time with projectile instance 
        if(package.limit[i].Duration < (Number(projectileObject[0].remainingTime))){       
           await index.save(package.limit[i]["StartDate"], package.limit[i]["listEntry"], package.limit[i]["Duration"],  package.limit[i]["Activity"], package.limit[i]["Note"]); 
        } else { 
            throw new Error('Remaining Time exceeded.');
        }
    }
    
}

/**
 * 
 * @param {*} startdate 
 * return array containing all entry objects of specified date; 
 */
async function fetchDayList(startdate){
    let arr = []; 

    let dayList = await index.setCalendarDate(startdate);
    // console.log("serverlist : "+ JSON.stringify(dayList,null,2));
/*     console.log(JSON.stringify(dayList,null,2));
 */     for (let i = 0; i< entryList.length; i++){ 
            let obj= {}; 
            try { 
                obj["StartDate"]=dayList["values"][entryList[i]][31]["v"];  
                obj["Duration"] = dayList["values"][entryList[i]][5]["v"]; 
                obj["Activity"]= dayList["values"][entryList[i]][8]["v"];
                obj["Note"]= dayList["values"][entryList[i]][28]["v"]; 

                /* obj["RemainingTime"] = dayList["values"][entryList[i]][4]["v"]; 
                obj["Time"] = dayList["values"][entryList[i]][5]["v"]; 
                obj["Activity"]= dayList["values"][entryList[i]][8]["v"];
                obj["EntryIndex"]= dayList["values"][entryList[i]][10]["v"]; 
                obj["Note"]= dayList["values"][entryList[i]][28]["v"]; 
                obj["Date"]=dayList["values"][entryList[i]][31]["v"];   */
            } catch ( err){ 
                console.log(err); 
            }  
            arr.push(obj);
            // needs to change 
            /* if(obj["Time"]==null){ 
                break;
            }else { 
                arr.push(obj); 
            } */
            
     }
    //extract the objects
    
    return arr; 
}

async function projectileList (startDate,endDate){
    let arr = []; 
   let dayList = await index.getallEntriesInTimeFrame(startDate, endDate);    
   for (let i = 0; i< entryList.length; i++){ 
    let obj= {}; 
    try { 
        obj["StartDate"]=dayList["values"][entryList[i]][31]["v"];  
        obj["Duration"] = dayList["values"][entryList[i]][5]["v"]; 
        obj["Activity"]= dayList["values"][entryList[i]][8]["v"];
        obj["Note"]= dayList["values"][entryList[i]][28]["v"]; 

       /*  obj["RemainingTime"] = dayList["values"][entryList[i]][4]["v"]; 
        obj["EntryIndex"]= dayList["values"][entryList[i]][10]["v"];  */

        arr.push(obj);
    } catch ( err){ 
        console.log(err); 
    }
    
   /*  // needs to change 
    if(obj["Time"]==null){ 
        break;
    }else { 
        arr.push(obj); 
    } */
    
}
return arr ;
}

/**
 * 
 * @param {*} startDate 
 * @param {*} endDate 
 * @returns array with serverdays  [[Day1], [Day2]...]
 */
async function getDistinctProjectileRange(startDate, endDate){ 
    try { 
       /*  let startDate = MonthCleaned[0].StartDate; 
        let endDate = MonthCleaned[MonthCleaned.length-1].StartDate; 
         */
        console.log("endDate" + endDate);
    
        let TimeRangeArray = [];
        let List =  await index.getallEntriesInTimeFrame(startDate, endDate); 
        let obj = List["values"];
    
        for ( key in obj ){ 
            if (key.match('DayList')){ 
                TimeRangeArray.push(obj[key]);
            }
        }
        let temp = [];
        TimeRangeArray.forEach((item)=> { 
            let entryObj = {}; 
            entryObj["StartDate"]= item[item.map((item)=> item.n).indexOf("Day")]["v"]; 
            entryObj["Duration"] = item[item.map((item)=> item.n).indexOf("Time")]["v"]; 
            entryObj["Activity"] = item[item.map((item)=> item.n).indexOf("What")]["v"]; 
            entryObj["Note"]= item[item.map((item)=> item.n).indexOf("Note")]["v"]; 
            temp.push(entryObj);
        })
    
        let serverDays = splitintoSeperateDays(temp); 
       
       return serverDays; 
       
    } catch ( err){ 
        console.log(err);
    }
  
    // console.log(TimeRangeArray);

}


// deletes Entries from Projectile and returns Clean MonthArray yet to save! 

async function normalizeUP(startDate, endDate, MonthCleaned){
    let dayList = [];
    let result = [];

    // sort the MonthList with Timular Entries after ascending dates 
    MonthCleaned.sort(function(a,b) {return (a.StartDate > b.StartDate) ? 1 : ((b.StartDate > b.StartDate) ? -1 : 0);} ); 
    
    // group Objects to Array with same Date 
    let monthDay = splitintoSeperateDays(MonthCleaned); 
    // get DateRange of Projectile 
   let serverDays=  await getDistinctProjectileRange(startDate, endDate);

   let serverDaysInProjectile = []; 

    // get indexes of Serverlist , which has same Date as MonthCleaned 
    // filter ServerArray for dates only containing in Timular List 
    monthDay.forEach((item)=>{ serverDaysInProjectile.push(serverDays.filterAdvanced((obj)=>obj[0].StartDate == item[0].StartDate,(temp)=>serverDays.indexOf(temp)))}); 
    console.log("FUCK"+ JSON.stringify(monthDay));
    /* console.log(serverDaysInProjectile); 
    console.log("CLientArray" + JSON.stringify(month, null, 2)) */

    let Overalllist = []; 
    serverDays.forEach((item)=>{ 
        Overalllist.push(false); 
    }); 
    
    // set Overall list index , where serverDay exists in timular to true ! 
    //serverDaysInProjectile contains all Indices to Day Arrays which exists in Timular 
    serverDaysInProjectile.forEach((item)=> Overalllist[item]= true);
    // console.log(Overalllist);

    let cleanProjectileList = [] ;     
   // Push into Projectile List with same days as Timular List , if false push to List to delete out of Projectile
    
    for ( var i = 0 ; i< Overalllist.length;  i++){ 
        if (Overalllist[i]==true){ 
            dayList.push(serverDays[i]); 
        } else { 
            cleanProjectileList.push(serverDays[i]); 
        }
    }

    console.log(cleanProjectileList);

   async function deleteProjectileEmptySlots (cleanProjectileList ){ 
    for ( var i = 0; i< cleanProjectileList.length; i++){ 
        let temp = []; 
        // get indexes of notnull 
        for (var j = 0; j< cleanProjectileList[i].length; j++){ 
           if(cleanProjectileList[i][j].Duration !== null){ 
               console.log("Delete");
                await index.delete(cleanProjectileList[i][j].StartDate, j); 
               cleanProjectileList[i].splice(j,1); 
               j = j-1; 
           }
        }
    }
   }

    deleteProjectileEmptySlots(cleanProjectileList);

    result = await deleteDepreceated(monthDay,dayList); 

   return result; 

    //Still a bug, it also deletes true 

  }

/**
     * return array with several distinct days 
    */
function splitintoSeperateDays(array){ 
    try{ 
        let temp = array.map((item)=> item["StartDate"]);
        // unique days; 
        let unique = [...new Set(temp)]; 
        let final = []; 
        unique.forEach((item)=>final.push(array.filter((obj)=> obj["StartDate"]==item))); 
        return final;
    } catch(err){ 
        console.log(err);
    }
    
}

function compareV2(clientArray, serverArray){ 
    let arr = []; 
    for (let i = 0; i < serverArray.length; i++ ){ 
        arr.push(false);
    }
    console.log("Client"+ JSON.stringify(clientArray, null,2));
    console.log("Server"+ JSON.stringify(serverArray, null,2));
   /*  console.log("clientALoop: " + JSON.stringify(clientArray, null, 2)); 
    console.log("serverALoop: " + JSON.stringify(serverArray, null, 2));  */
            try{ 
                for(var i = 0; i< serverArray.length; i++){ 
                    /*  if (clientArray.length == 0 || serverArray[i]["Duration"]== null ){ 
                         break; 
                     } */
                     for ( var j = 0; j < clientArray.length; j++){ 
                         if( JSON.stringify(clientArray[j]) == JSON.stringify(serverArray[i])){ 
                             clientArray.splice(j,1); 
                             j=j-1;
                             arr[i] = true; 
                         }
                     }
                 }
                 return arr;
            } catch (err){ 
                console.log(err);
            }
             
}

Array.prototype.filterAdvanced = function(callback1, callback2){
    
    for( let i = 0; i< this.length; i++){ 
        if(callback1(this[i])){ 
           return callback2(this[i]); 
        }
    } 
}

  /**
     * 
     * @param {*} monthDay 
     * @param {*} dayList 
     * return clean monthDayList yet to Save 
     */
async function deleteDepreceated(monthDay, dayList){ 
    let finalresult = [];
    try { 
        for (let i = 0; i<monthDay.length; i++){ 
            let res = compareV2(monthDay[i], dayList[i]); 
            console.log("result COMPARE: "+ JSON.stringify(res,null,2)); 
            finalresult.push(monthDay[i]);
            // after one iteration , a day is compared. I need then to delete that shit , get the date 
            // delete, when entry exists but is FALSE. 
            for ( var j = 0 ; j < res.length; j++){ 
                if(res[j]==false && dayList[i][j].Duration !== null  ){ 
                     await index.delete(dayList[i][j].StartDate, j); 
                    res.splice(j,1); 
                    dayList[i].splice(j,1);
                    j=j-1; 
                }
            }
         
       }
        console.log(finalresult);
       return [].concat.apply([], finalresult);
    } catch(Err){ 
        console.log(Err);
    }
    
}


//TODO: erster Tag in Timuelar muss gesetzt sein 

