
const express = require('express');
const rp = require('request-promise');
const fs = require('fs');
const util = require('util');

const index = require('./index.js');
const timeularapi = require('./TimeularAPI.js');

const app = express();
//  app.use(bodyParser.json()) // support json encoded bodies
//  app.use(bodyParser.urlencoded({ extended: true })) // support encoded bodies
/*
log.configure(config.get('logConfig'))
const logger = log.logger

const basePath = config.get('basePath')
*/
// const upload = multer()
/*
process.on('uncaughtException', (err: any) => {
  logger.error(`uncaught Exception: ${err}`)
  // this is the default behaviour of upcoming node versions
  // when we do have unhandled errors and exceptions, that we didn't foresee the server shall stop entirely
  process.exit(1)
})
process.on('unhandledRejection', (reason, p) => {
  logger.error(`uncaught Rejection at Promise: ${inspect(p)}; reason: ${reason}`)
  // this is the default behaviour of upcoming node versions
  // when we do have unhandled errors and exceptions, that we didn't foresee the server shall stop entirely
  process.exit(1)
})
*/
// app.use(cors())

// promisify
//  const fileReaderAsync = promisify(fs.readFile)

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

let cookie = '';
let employee = '';
let jobList = '';

async function init() {
  try {
    cookie = await index.login();
    employee = await index.getEmployee(cookie);
    jobList = await index.jobList(cookie, employee);
  } catch (e) {
    console.log('Initialization failed. ' + e);
  }
}
init();

let basePath = '';

/**
 *  route for healthstatus checks
 */
app.get(basePath + '/healthStatus', (req, res) => {
  res.status(200).send({ healthy: true })
})

// SYNC BOOKINGS
/**
 *  route for syncing timeular with dates within a certain date range
 */
app.get(basePath + '/syncbookings/:startDate/:endDate', (req, res) => {
  let startDate = req.params.startDate + 'T00:00:00.000';
  let endDate = req.params.endDate + 'T23:59:59.999';

  // ENTSCHÄRFT timeularapi.main(startDate, endDate);
  console.log('Range ' + req.params.startDate + ' to ' + req.params.endDate);
  res.status(200).send('Sync done for ' + req.params.startDate + ' to ' + req.params.endDate);
})

/**
 *  route for syncing timeular for fixed time ranges e.g. today, week, month
 */
app.get(basePath + '/syncbookings/:choice', (req, res) => {
  let today = new Date();
  let startDay = new Date();

  switch (req.params.choice) {
    case 'today':
        timeularapi.merge(startDay.toISOString().substr(0, 10), today.toISOString().substr(0, 10)).then(() => {
        res.status(200).send('Sync done for "today".');
      });
      // timeularapi.main(startDay.toISOString().substr(0, 10), today.toISOString().substr(0, 10));
      // res.status(200).send('Sync done for today.');
      break;
    case 'week':
      startDay.setDate(today.getDate() - 6);
      // ENTSCHÄRFT timeularapi.main(startDay.toISOString().substr(0, 10), today.toISOString().substr(0, 10));
      console.log('week ' + startDay.toISOString().substr(0, 10), today.toISOString().substr(0, 10));
      res.status(200).send('Sync done for last 7 days.');
      break;
    case 'month':
      startDay.setMonth(today.getMonth() - 1);
      // ENTSCHÄRFT timeularapi.main(startDay.toISOString().substr(0, 10), today.toISOString().substr(0, 10));
      console.log('month ' + startDay.toISOString().substr(0, 10), today.toISOString().substr(0, 10));
      res.status(200).send('Sync done for last month.');
      break;
    default:
      res.status(400).send('Something went wrong - /synctimeular/:choice');
  }
  // res.status(200).send(' ' + req.params.choice )
})

// SHOW
/**
 *  route for retrieving package list from Projectile in JSON format
 */
app.get(basePath + '/showListProjectile', async (req, res, next) => {
  try {
    jobList = await index.fetchNewJobList();
    res.status(200).send(JSON.stringify(jobList));
  } catch (err) {
     res.status(400).send('Something went wrong - /showListProjectile');
  }
})

/**
 *  route for retrieving package list from timeular in JSON format
 */
app.get(basePath + '/showListTimeular', async (req, res, next) => {
  try {
    let timeularActivities = await timeularapi.getActivities();
    console.log(timeularActivities);
    // console.log(timeularapi.activityList);
    // res.status(200).send(JSON.stringify(timeularapi.activityList));
    res.status(200).send(JSON.stringify(timeularActivities));
  } catch (err) {
     res.status(400).send('Something went wrong - /showListProjectile');
  }
})

// BOOK
/**
 *  route for booking (date, duration, activity, note provided)
 */
 app.get(basePath + '/book/:date/:duration/:activity/:note', async (req, res) => { // whats the spec duration format - 1,75? 1:45?
   try {
     // NEEDS to book in timeular if timeular is used to synchronize bookings!
     // Else projectile only bookings get wiped when syncing later

     // TODO check validity of date, duration, activitiy and note?

     // create package/activity table
     // analyse the provided "activity" parameter and find the fitting package or activity id pair
     let packageActivity = await timeularapi.packageActivityList(req.params.activity);
     console.log('Debug packageActivity result: ' + packageActivity.Package, packageActivity.Activity);

     // book in TIMEULAR
     // ENTSCHÄRFT timeularapi.bookActivity(req.params.date, req.params.duration, req.params.activity, req.params.note);
     let response = await timeularapi.bookActivityNG(req.params.date, req.params.duration, packageActivity.Activity, req.params.note).then((response) => {
       if(response) {
         console.log('bookActivity for timeular successfull');
       }
       return response;
     });

     // normalizing duration time if necessary (to x.xx and parse as float to avoid weird duration lengths)
     let time = await index.normalizetime(req.params.duration);
     time = parseFloat(time);
     // book in projectile
     index.save(req.params.date, time, packageActivity.Package, req.params.note).then(() => {
       console.log('save for projectile successfull');
       res.status(200).send(req.params.date + ' ' +  req.params.duration + ' ' +  req.params.activity + ' ' +  req.params.note)
     });
   } catch (e) {
     res.status(400).send('Something went wrong - /book/:date/:duration/:activity/:note');
   }
 })

// eg: http://localhost:3000/book/1/2788-3/testing    WORKS :)
 /**
  *  route for booking (date, duration, activity, note provided)
  */
  app.get(basePath + '/book/:duration/:activity/:note', async (req, res) => {
    try {
      let today = new Date().toISOString().substr(0, 10); // YYYY/MM/DD

      // so far books in projectile only, PROBABLY NEEDS TO BOOK TIMEULAR AS WELL TO AVOID BOOKINGS BEING WIPED
      // WHEN SYNCING TIMEULAR WITH PROJECTILE

      // TODO book in TIMEULAR
      // ENTSCHÄRFT timeularapi.bookActivity(today, req.params.duration, req.params.activity, req.params.note);

      // normalizing time if necessary (to x.xx and parse as float to avoid weird duration lengths)
      let time = req.params.duration;
      if (time.includes(':')) {
        let tmp = time.split(":");
        let tmp2 = (parseInt(tmp[1])/60)*100;
        time = tmp[0] + '.' + tmp2;
      } else if (time.includes(',')) {
        time = time.replace(',', '.');
      }
      // book in projectile
      index.save(today, parseFloat(time), req.params.activity, req.params.note).then( () =>
        res.status(200).send(today + ' ' +  req.params.duration + ' ' +  req.params.activity + ' ' +  req.params.note)
      );
    } catch (e) {
      res.status(400).send('Something went wrong - /book/:duration/:activity/:note');
    }
  })

  // SYNC ACTIVITIES
  /**
   *  route for syncing activities of projectile and timeular
   */
   app.get(basePath + '/syncactivities', async (req, res) => {
     try {
       console.log('trying to sync activities and projectile packages...');
       let result = await timeularapi.updateActivities();
       console.log('synactivities synchronized: ' + result);
       await res.status(200).send(result);
     } catch (e) {
       res.status(400).send('Something went wrong - /syncactivities');
     }
   })

// new default? old one acted weird
app.use(function(req, res, next){
     res.status(404);
})

/**
 *  get default reaction to undefined routes
 */
app.get('*', (req, res) => {
  console.log(`Error: default routing error - invalid request.`)
  res.sendStatus(500)
})

/*
app.listen(config.get('appPort'), () => {
  logger.info(`HDI CMS static content app listening on port ${config.get('appPort')}!`)
})
*/
app.listen(3000, () => {
  // logger.info(`Projectile-Timeular sync app listening on port 3000!`)
})
