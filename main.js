#!/usr/bin/env node
const index = require('./index.js');

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
        index.jobList().then((data) => {
            console.log(data);
            console.log('\n');
            command();
        });
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
            index.save(result[0], result[1], result[2], result[3], newArr).then( () => command());
        }
        /*process.stdout.write('Saved! ');*/
    }

});







