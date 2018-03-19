const express = require('express');
const rp = require('request-promise');
const fs = require('fs');
const util = require('util');

const config = require('config');

const projectile = require('./projectileAPI.js');
const timeularapi = require('./timeularAPI.js');

const app = express();

const bodyParser = require('body-parser');

const winston = require('winston');
winston.level = config.get('winstonLevel');
// error > warn > info > verbose > debug > silly

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

const writeFileAsync = util.promisify(fs.writeFile);

let user;
let token;

let cookie = '';
let employee = '';
let jobList = '';

async function init() {
  try {
    // get user creds and timeular API token
    try {
      user = JSON.parse(fs.readFileSync('user.txt'));
    } catch (e) {
      winston.error('API No usercredential file seems to be available. Please run "node userCred.js" to create a credential file.');
      // process.exit();
    }

    try {
      token = JSON.parse(fs.readFileSync('timeularToken.txt'));
    } catch (e) {
      winston.error('API No token file seems to be available. Please run "node getTimularToken.js" to create a token file.');
      // process.exit();
    }

    // get cookie, employee and jobList
    if (token && user) {
      await projectile.initializeUser(user);
      await timeularapi.initializeToken(token);
      cookie = await projectile.login();
      employee = await projectile.getEmployee(cookie);
      jobList = await projectile.jobList(cookie, employee);
    } else {
      winston.warn('Initialization failed. token and/or user missing.');
    }
  } catch (e) {
    winston.error('Initialization failed. ', e);
  }
}

init();

let basePath = config.get('basePath');

/**
 *  route for healthstatus checks
 */
app.get(basePath + '/healthStatus', (req, res) => {
  res.status(200).send({ healthy: true })
})

/**
 *  route for base website
 */
app.get(basePath + '/', (req, res) => {
    winston.debug('Base website entered.');
    // dynamically set port for links in html files
    let html = fs.readFileSync(__dirname + '/src/index.html', {encoding: 'utf8'});
    html = html.replace(/\{port\}/g, config.get('appPort'));
    // delivering website with options
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
    res.end(html);
    // delivering website with options
    // res.sendFile(__dirname + '/src/index.html');
    winston.debug('/ base website done');
})

/**
 *  route for to retrieve files for base website
 */
app.get(basePath + '/src/:file', (req, res) => {
    winston.debug('Base website entered, file requested.');
    // dynamically set port for links in html files
    let content = fs.readFileSync(__dirname + '/src/' + req.params.file, {encoding: 'utf8'});
    content = content.replace(/\{port\}/g, config.get('appPort'));
    // delivering website with options
    res.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8'});
    res.end(content);
    // res.sendFile(__dirname + '/src/' + req.params.file);
    winston.debug('/ base website file request done');
})

/**
 *  route for start website
 */
app.get(basePath + '/start', (req, res) => {
    winston.debug('start website entered.');
    let html = fs.readFileSync(__dirname + '/src/start.html', {encoding: 'utf8'});
    html = html.replace(/\{port\}/g, config.get('appPort'));
    // delivering website with options
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
    res.end(html);
    // delivering website with options
    //res.sendFile(__dirname + '/src/start.html');
    winston.debug('/ start website done');
})

/**
 *  route for start website post request
 */
app.post(basePath + '/start', (req, res) => {
    winston.debug('Post request to /start');
    // receiving post requests for base website
    // winston.debug(req.body); // shows credentials!
    let json = req.body;

    // set projectile creds
    let user = {login: json.projectileUser,
        password: json.projectilePassword
    }
    fs.writeFile('user.txt', JSON.stringify(user), (err) => {
        if (err) throw err;
        console.log("Projectile User credentials have been saved.");

        rp.post('https://api.timeular.com/api/v2/developer/sign-in',{
          headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json;charset=UTF-8'
          },
          json: {
            'apiKey': json.timeularApiKey,
            'apiSecret': json.timeularApiSecret
          },
        }, (err, res, body) => {
          let apiToken = res.body.token;
          let timeularApi = {
              apiToken: apiToken
          }
          fs.writeFile('timeularToken.txt', JSON.stringify(timeularApi), (err) => {
              if (err) throw err;
              console.log("Timeular token has been saved.");
              winston.debug('/ base website post request done');
              init(); // fetch joblist, get cookie , employee

          });
        });
        res.status(200).send(true);
    });
});

// SYNC BOOKINGS
/**
 *  route for syncing timeular with dates within a certain date range
 */
app.get(basePath + '/syncbookings/:startDate/:endDate', (req, res) => {
    timeularapi.merge(req.params.startDate, req.params.endDate).then((result) => {
    winston.debug('Range ' + req.params.startDate + ' to ' + req.params.endDate);
    res.status(200).send(JSON.stringify(result));
  });
  winston.debug('/syncbookings/:startDate/:endDate done');
})

/**
 *  route for syncing timeular for fixed time ranges e.g. today, week, month
 */
app.get(basePath + '/syncbookings/:choice', (req, res) => {
  let today = new Date();
  let startDay = new Date();

  switch (req.params.choice) {
    case 'today':
      timeularapi.merge(startDay.toISOString().substr(0, 10), today.toISOString().substr(0, 10)).then((result) => {
        winston.debug('(api) Sync result: ' + util.inspect(result));
        res.status(200).send(JSON.stringify(result)); // 'Sync done for "today".'
        winston.debug('today ' + startDay.toISOString().substr(0, 10));
      });
      // timeularapi.main(startDay.toISOString().substr(0, 10), today.toISOString().substr(0, 10));
      // res.status(200).send('Sync done for today.');
      break;
    case 'week':
      startDay.setDate(today.getDate() - 6);
      timeularapi.merge(startDay.toISOString().substr(0, 10), today.toISOString().substr(0, 10)).then(() => {
        res.status(200).send(JSON.stringify(result));
        winston.debug('week ' + startDay.toISOString().substr(0, 10), today.toISOString().substr(0, 10));
      });
      // winston.debug('week ' + startDay.toISOString().substr(0, 10), today.toISOString().substr(0, 10));
      // res.status(200).send('Sync done for last 7 days.');
      break;
    case 'month':
      startDay.setMonth(today.getMonth() - 1);
      timeularapi.merge(startDay.toISOString().substr(0, 10), today.toISOString().substr(0, 10)).then(() => {
        res.status(200).send(JSON.stringify(result));
        winston.debug('month ' + startDay.toISOString().substr(0, 10), today.toISOString().substr(0, 10));
      });
      break;
    default:
      res.status(400).send('Something went wrong - /synctimeular/:choice');
  }
  // res.status(200).send(' ' + req.params.choice )
  winston.debug('/syncbookings/:choice done');
})

// SHOW
/**
 *  route for retrieving package list from Projectile in JSON format
 */
app.get(basePath + '/showListProjectile', async (req, res, next) => {
  try {
    jobList = await projectile.fetchNewJobList();
    res.status(200).send(JSON.stringify(jobList));
  } catch (err) {
     res.status(400).send('Something went wrong - /showListProjectile');
  }
  winston.debug('/showListProjectile done');
})

/**
 *  route for retrieving package list from timeular in JSON format
 */
app.get(basePath + '/showListTimeular', async (req, res, next) => {
  try {
    let timeularActivities = await timeularapi.getActivities();
    winston.debug(timeularActivities);
    // winston.debug(timeularapi.activityList);
    // res.status(200).send(JSON.stringify(timeularapi.activityList));
    res.status(200).send(JSON.stringify(timeularActivities));
  } catch (err) {
     res.status(400).send('Something went wrong - /showListProjectile');
  }
  winston.debug('/showListTimeular done');
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
     winston.debug('Debug packageActivity result: ' + packageActivity.Package, packageActivity.Activity);

     // book in TIMEULAR
     // OBOSLETE??  ENTSCHÄRFT timeularapi.bookActivity(req.params.date, req.params.duration, req.params.activity, req.params.note);
     let response = await timeularapi.bookActivityNG(req.params.date, req.params.duration, packageActivity.Activity, req.params.note).then((response) => {
       if(response) {
         winston.debug('bookActivity for timeular successfull');
       }
       return response;
     });

     // normalizing duration time if necessary (to x.xx and parse as float to avoid weird duration lengths)
     let time = await projectile.normalizetime(req.params.duration);
     time = parseFloat(time);
     // book in projectile
     projectile.save(req.params.date, time, packageActivity.Package, req.params.note).then(() => {
       winston.debug('save for projectile successfull');
       res.status(200).send(req.params.date + ' ' +  req.params.duration + ' ' +  req.params.activity + ' ' +  req.params.note)
     });
   } catch (e) {
     res.status(400).send('Something went wrong - /book/:date/:duration/:activity/:note');
   }
   winston.debug('/book/:date/:duration/:activity/:note done');
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

      // TODO check validity of duration, activitiy and note?

      // create package/activity table
      // analyse the provided "activity" parameter and find the fitting package or activity id pair
      let packageActivity = await timeularapi.packageActivityList(req.params.activity);
      winston.debug('Debug packageActivity result: ' + packageActivity.Package, packageActivity.Activity);

      // book in TIMEULAR
      // OBOSLETE??  ENTSCHÄRFT timeularapi.bookActivity(req.params.date, req.params.duration, req.params.activity, req.params.note);
      let response = await timeularapi.bookActivityNG(today, req.params.duration, packageActivity.Activity, req.params.note).then((response) => {
        if(response) {
          winston.debug('bookActivity for timeular successfull');
        }
        return response;
      });

      // normalizing duration time if necessary (to x.xx and parse as float to avoid weird duration lengths)
      let time = await projectile.normalizetime(req.params.duration);
      time = parseFloat(time);
      // book in projectile
      projectile.save(today, time, packageActivity.Package, req.params.note).then(() => {
        winston.debug('save for projectile successfull');
        res.status(200).send(today + ' ' +  req.params.duration + ' ' +  req.params.activity + ' ' +  req.params.note)
      });
      } catch (e) {
      res.status(400).send('Something went wrong - /book/:duration/:activity/:note');
      }
      winston.debug('/book/:duration/:activity/:note done');
  })

  // SYNC ACTIVITIES
  /**
   *  route for syncing activities of projectile and timeular
   */
   app.get(basePath + '/syncactivities', async (req, res) => {
     try {
       winston.debug('trying to sync activities and projectile packages...');
       // just creating, no archiving ATM as requested by Jan!
       let result = await timeularapi.updateActivities(true, false); // (create, archive)
       winston.debug('synactivities synchronized: ' + result);
       await res.status(200).send(result);
     } catch (e) {
       res.status(400).send('Something went wrong - /syncactivities');
     }
     winston.debug('/syncactivities done');
   })

// new default? old one acted weird
app.use(function(req, res, next){
     res.status(404);
     winston.debug('default route done');
})

/**
 *  get default reaction to undefined routes
 */
app.get('*', (req, res) => {
  winston.error(`Error: default routing error - invalid request.`)
  res.sendStatus(500)
})

/*
app.listen(config.get('appPort'), () => {
  logger.info(`HDI CMS static content app listening on port ${config.get('appPort')}!`)
})
*/
app.listen(config.get('appPort'), () => {
  console.log(`Projectile-Timeular API / APP is listenning on port ${config.get('appPort')}!` +
  ` - Open http://localhost:${config.get('appPort')}/ in your browser to access it.`);
  // logger.info(`Projectile-Timeular sync app listening on port 3000!`)
})
