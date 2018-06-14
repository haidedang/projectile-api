const request = require('request');
const projectile = require('./projectileAPI.js');
const timeularapi = require('./timeularAPI.js');
const fs = require('fs');

const readline = require('readline');

const util = require('util'); // for Debug only --> util.inspect()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.setPrompt('> ');

if(process.versions.node.split(".")[0] !== "8"){
    throw new Error("Please update to node version >= 8.");
}

// get user creds and timeular API token
let user;
try {
  user = JSON.parse(fs.readFileSync('user.txt'));
} catch (e) {
  console.log('No usercredential file seems to be available. Please run "node userCred.js" to create a credential file.');
  process.exit();
}

let token;
try {
  token = JSON.parse(fs.readFileSync('timeularToken.txt'));
} catch (e) {
  console.log('No token file seems to be available. Please run "node getTimularToken.js" to create a token file.');
  process.exit();
}

// lets get going

async function syncTimeular(startDate, endDate){
  await timeularapi.main(startDate, endDate);
}

async function init() {
  try {
      const cookie = await projectile.login();
      const employee = await projectile.getEmployee(cookie);
      const jobList = await projectile.jobList(cookie, employee);

      function command(){
          console.log(`\n(show) show job package list \n` +
          `(book) book working time\n` +
          `(bookjob) book working time, interactively chose target job package\n` +
          `(sync) Timeular sync\n` +
          `(help) list of available commands\n` +
          `(exit) exit`);
          console.log("You can enter e.g. sync help to get syntax help for each command");
          console.log("Enter choice:");
          rl.prompt();
      }
      // command();
      rl.prompt();
// maybe improving booking so JobList doesn't have to be checked?  aka, providing a list of packages

      rl.on('line', function (chunk) {

          let result = chunk.toString().split(' ');
          switch (result[0]) {
              case 'show':
                if (result[1] === 'help') {
                  console.log('The command show has no additional options.')
                }
                else {
                  // console.log(jobList);
                  // fs.writeFile('joblist.txt', JSON.stringify(jobList));
                  console.log('Name:                   no:');
                  jobList.forEach((item) => {
                      console.log(item.name, item.no);
                  });
                  // command();
                }
                break;
              case 'book':
                if (result.length < 4 || result[1] === 'help') console.log('Enter: book {date} {duration} {project-nr.} {note}\n' + 'example: 2018-02-28 4.25 2759-327 "Automatisierung Projectile" - {date} is optional, if not provided, todays date will be used.');
                // throw new Error("invalid parameter");
                let re = new RegExp('[0-9]{4}\-[0-9]{2}\-[0-9]{2}', 'g'); // check date format
                resultMatch = result[1].match(re);
                let count = '0';
                if (resultMatch) {
                  count = resultMatch.length;
                }
                let temp = '';
                if (count >= 1) {
                  temp = result.slice(4);
                } else {
                  temp = result.slice(3);
                }
                let newArr = temp.join(' ').replace(/["]/g, "");
                      // signature: save(date, time, project, note)
                if (count >= 1) {
                    console.log(result[1], result[2], result[3], newArr);
                    // ENTSCHÄRFT projectile.save(result[1], result[2], result[3], newArr).then( () => command());  // listEntry removed from signature
                } else {
                    let today = new Date().toISOString().substr(0, 10);
                    console.log(today, result[1], result[2], newArr);
                    // ENTSCHÄRFT projectile.save(today, result[1], result[2], newArr).then( () => command());  // listEntry removed from signature
                }
                // command();
                break;
              case 'bookjob':
                if (result.length < 3 || result[1] === 'help') {
                  console.log('Enter: book {date} {duration} {note}\n' + 'example: 2018-02-28 4.25 "Automatisierung Projectile" - {date} is optional, if not provided, todays date will be used.');
                } else {
                  // throw new Error("invalid parameter");
                  let re2 = new RegExp('[0-9]{4}\-[0-9]{2}\-[0-9]{2}', 'g'); // check date format
                  resultMatch2 = result[1].match(re2);
                  let count2 = '0';
                  if (resultMatch2) {
                    count2 = resultMatch2.length;
                  }
                  let temp2 = '';
                  if (count2 >= 1) {
                    temp2 = result.slice(3);
                  } else {
                    temp2 = result.slice(2);
                  }
                  let newArr2 = temp2.join(' ').replace(/["]/g, "");

                  // select job - interactively!
                  console.log('\nChoose job from following joblist');
                  console.log('(selection), name, projectile no');
                  let selectionNo = 0;
                  jobList.forEach((item) => {
                      console.log('(' + selectionNo + ') ' + item.name + ', ' + item.no);
                      selectionNo++;
                  });

                  rl.prompt();
                  rl.on('line', function (selection) {
                      let selectedJob = jobList[selection].no;


                      // signature: save(date, time, project, note)
                      if (count2 >= 1) {
                          console.log(result[1], result[2], selectedJob, newArr2);
                          //projectile.save(result[1], result[2], result[3], newArr).then( () => command());  // listEntry removed from signature
                      } else {
                          let today = new Date().toISOString().substr(0, 10);
                          console.log(today, result[1], selectedJob, newArr2);
                          //projectile.save(today, result[1], result[2], newArr).then( () => command());  // listEntry removed from signature
                      }
                  });
                  // command();
                }
                break;
              case 'sync':
                if (result.length < 2) {
                  console.log('provided arguments are too few.');
                } else {
                  let today = new Date();
                  let startDay = new Date();
                  // idea: just sync = sync today, sync week = 1 week, sync month = 1 month, sync today = today
                  switch (result[1]) {
                    case 'today':
                      syncTimeular(startDay.toISOString().substr(0, 10), today.toISOString().substr(0, 10)).then(() => {
                        rl.prompt();
                        console.log('lalelu');
                      });
                      // console.log('today ' + today.toISOString().substr(0, 10));
                      break;
                    case 'week':
                      startDay.setDate(today.getDate() - 6);
                      syncTimeular(startDay.toISOString().substr(0, 10), today.toISOString().substr(0, 10));
                      // console.log('week ' + startDay.toISOString().substr(0, 10), today.toISOString().substr(0, 10));
                      break;
                    case 'month':
                      startDay.setMonth(today.getMonth() - 1);
                      syncTimeular(startDay.toISOString().substr(0, 10), today.toISOString().substr(0, 10));
                      // console.log('month ' + startDay.toISOString().substr(0, 10), today.toISOString().substr(0, 10));
                      break;
                    case 'help':
                      console.log('Enter: sync {startdate} {enddate} or today, week, month\n' + 'example: sync 2018-02-27 2018-02-28\nor sync today, sync week, sync month');
                      break;
                    default:
                      console.log('Enter: sync {startdate} {enddate}\n' + 'example: sync 2018-02-27 2018-02-28\nor sync today, sync week, sync month');
                  }
                }
                rl.prompt();
                // command();
                break;
              case 'exit':
                process.exit();
                break;
              case 'help':
                command();
                break;
              default:
                rl.prompt();
                // command();
          }
        });
    } catch (err){
        console.log("Error while initializing the program.", err);
        process.exit();
    }

}

init();
