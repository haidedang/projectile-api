#!/usr/bin/env node

const fs = require('fs');
function checkForNodeVersion(){
    if(process.versions.node.split(".")[0] !== "8"){
        throw new Error("Please update to latest node version.");
    } else {
        console.log("Latest node version installed..");
    }
}

checkForNodeVersion();

const index = require('./index.js');

async function init() {
    try {
        const cookie = await index.login();
        const employee = await index.getEmployee(cookie);
        const jobList = await index.jobList(cookie, employee);
       /*  const limitedJob = await index.joblistLimited(jobList); */
        function command(){
            console.log("(1) show JobList \n" + "(2) book working Time\n" + "(3) Exit");
            console.log("Enter Number:");
        }

        async function initialize(){
            console.log('Initializing...');
            command();
        }

        initialize();

        process.stdin.on('readable',  () => {
            const chunk = process.stdin.read();

            if (chunk == 1){
                console.log(jobList);
/*                 console.log(limitedJob);
 */                command();
            } else if(chunk ==2) {
                console.log('Enter: {listEntry} {time} {project-nr.} {note}\n' + 'example: 0 6 2759-327 "Automatisierung Projectile" ');
            }
            else if (chunk == 3){
                process.exit();
            }
            else if ( chunk == 4){

            }
            else if (chunk !== null){
                let result = chunk.toString().split(' ');
                let temp = result.slice(4)
                let newArr = temp.join().replace(/[,]/g, " ").replace(/["]/g, "");
                // check for errors
                if (result.length < 5){
                    throw new Error("invalid parameter");
                } else {
                       index.save( result[0], result[1], result[2], result[3], newArr).then( () => command());
                }
                /*process.stdout.write('Saved! ');*/
            }
        });
    } catch (err){
        console.log("CANNOT initialize Program", err);
        process.exit();
    }

}


/* init(); */

init(); 

// index.save('2018-02-03', 0, 1, '2759-327', 'testie56');


/*   index.delete('2018-02-03',1);
 */  /* index.delete('2018-02-03', 2);
  index.delete('2018-02-03', 4); */

/* index.setCalendarDate('2018-02-03').then(()=>co) */

/* index.setCalendarDate('2018-02-03').then((res)=>fs.writeFile('calendar.json', JSON.stringify(res)));
 */
