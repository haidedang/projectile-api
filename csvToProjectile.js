// Reads from a CSV table and post its data automatically to projectile

const index = require('./index.js');

let listentry = 0;
let month= [];

const csvFilePath='./report1.csv';
const csv=require('csvtojson');
csv()
    .fromFile(csvFilePath)
    .on('json',(jsonObj)=>{
        let day = {};
        day["StartDate"]=jsonObj["StartDate"];
        day["listEntry"]= 0;
        day["Duration"]= jsonObj["Duration"]/60;
        day["Activity"] = jsonObj["Activity"];
        day["Note"]= jsonObj["Note"];
        month.push(day);

    })
    .on('done',(error)=>{

        console.log('end');

        for (var i = 0; i<month.length; i++){
            if (i == month.length-1){
                month[i]["listEntry"]=listentry;
            } else{
                month[i]["listEntry"]=listentry;
                if(month[i]["StartDate"].split("-").splice(2)[0]=== month[i+1]["StartDate"].split("-").splice(2)[0]){
                    listentry= listentry +1;
                } else {
                    listentry = 0;
                }
            }
        }
        console.log(month);
        month.forEach((obj)=>{
            index.save(obj["StartDate"], obj["listEntry"], obj["Duration"],  obj["Activity"], obj["Note"]);
        })
    });

