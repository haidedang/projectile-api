#!/usr/bin/env node

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
    const cookie = await index.login();
    const employee = await index.getEmployee(cookie);
    const jobList = await index.jobList(cookie, employee);


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
            command();
        } else if(chunk ==2) {
            console.log('Enter: {listEntry} {time} {project-nr.} {note}\n' + 'example: 0 6 2759-327 "Automatisierung Projectile" ');
        }
        else if (chunk == 3){
            process.exit();
        }
        else if (chunk !== null){
            let result = chunk.toString().split(' ');
            let temp = result.slice(4)
            let newArr = temp.join().replace(/[,]/g, " ").replace(/["]/g, "");
            // check for errors
            if (result.length < 5){
                throw new Error("invalid parameter");
            } else {
                index.save(cookie, employee, result[0], result[1], result[2], result[3], newArr).then( () => command());
            }
            /*process.stdout.write('Saved! ');*/
        }

    });
}

init();











