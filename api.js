const express = require('express');
const rp = require('request-promise');
const fs = require('fs');
const util = require('util');

//const config = require('config');

const projectile = require('./projectileAPI.js');
const timeularapi = require('./timeularAPI.js');

const app = express();

const bodyParser = require('body-parser');

const winston = require('winston');

// handle commandline parameters
let appPort = 3001;
let winstonLevel = 'warn';
let projectileOnly = false;

let re = new RegExp('[0-9]{4,6}', 'g');
process.argv.forEach(function (val, index, array) {
  // check if parameter is a port
  let portMatch = val.match(re);
  if (portMatch) {
    appPort = val;
  } else {
    // check if parameter is a winston debug level or help request or projectileOnly setting
    switch (val) {
        case 'error':
          winstonLevel = 'error';
          break;
        case 'warn':
          winstonLevel = 'warn';
          break;
        case 'info':
          winstonLevel = 'info';
          break;
        case 'verbose':
          winstonLevel = 'verbose';
          break;
        case 'debug':
          winstonLevel = 'debug';
          break;
        case 'silly':
          winstonLevel = 'silly';
          break;
        case 'projectileOnly':
          projectileOnly = true;
          console.log('### ProjectileOnly mode recognized and activated.');
          break;
        case 'help':
          console.log('Help: You can provide the following parameters to the application:');
          console.log('A port number can be set. Just provide a number between 1024 and 65335 e.g. 3000');
          console.log('A debug level can be set. Just provide ONE of the following level names: error, warn, info, verbose, debug, silly. The verbosity increases in sequence.');
          console.log('You can combine both parameters. e.g. "3000 error" or "silly 3333".');
          process.exit();
          break;
        default:
      }
  }
});

winston.level = winstonLevel;
// error > warn > info > verbose > debug > silly
console.log('Winston debug level: ' + winstonLevel);

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

const writeFileAsync = util.promisify(fs.writeFile);

let user;
let token;

let cookie = '';
let employee = '';
let jobList = '';

let config = {};
let defaultInterval = 300000; // 5min
let defaultProjectileAliveInterval = 10000;

let credsPresent = false;
let projectileStatus = false;

let basePath = '';

/**
 *  function init() to initialize projectile creds, timeular token, config.json and trigger necessary functions to get ready to rumble
 */
async function init() {
  try {
    // get projectile status before proceeding (access to projectile server)
    projectileStatus = await projectile.projectileAlive(); // checkProjectile();

    if (projectileStatus) {
      // get user creds and timeular API token
      try {
        user = JSON.parse(fs.readFileSync('user.txt'));
      } catch (e) {
        winston.error('API No usercredential file seems to be available. Please run "node userCred.js" to create a credential file.');
        // process.exit();
      }
      if (!projectileOnly) {
        try {
          token = JSON.parse(fs.readFileSync('timeularToken.txt'));
        } catch (e) {
          winston.error('API No token file seems to be available. Please run "node getTimularToken.js" to create a token file.');
          // process.exit();
        }
      }

      // get cookie, employee and jobList
      if ((!projectileOnly && token && user) || (projectileOnly && user)) {
        await projectile.initializeUser(user);
        if (!projectileOnly) {
          await timeularapi.initializeToken(token);
        }
        cookie = await projectile.login();
        employee = await projectile.getEmployee(cookie);
        jobList = await projectile.jobList(cookie, employee);
        credsPresent = true;

        // get config from config.json
        try {
          config = JSON.parse(fs.readFileSync('config.json'));
          winston.debug('Successfully read config.json.');
          winston.silly('config.json: ' + JSON.stringify( config, null, 2 ));
        } catch (e) {
          winston.warn('init() -> Failed to read config.json configurationfile on startup. Corrupted or non existent.');
        }

        try {
          // run cyclicPackageSync first time
          if (!projectileOnly) {
            cyclicPackageSync();
          }
        } catch (e) {
          winston.warn('init() -> Failed to run cyclicPackageSync() with setTimeout.');
        }
      } else {
        winston.warn('Initialization failed. token and/or user missing.');
      }
    } else { // end of if (projectileStatus) {
      winston.warn('init -> Projectile server seems to be unreachable. Establishing continuous checking for when he\'s reachable again. Every:', defaultProjectileAliveInterval/1000, 's' );
      setTimeout(init, defaultProjectileAliveInterval || 10000);
    }
  } catch (e) {
    winston.error('Initialization failed. ', e);
  }
}

// Gentlemen, lets start the engines
init();

/**
 *  function to synchronize the projectile packages to the timeular activities in intervals (default 300s)
 */
let cyclicPackageSync = async function() {
  winston.debug('cyclicPackageSync -> Starting syncing packages and activities with timeout of',
  (config.timeOutForSync?(config.timeOutForSync / 1000):(defaultInterval / 1000)), 's');
  // check projectile status
  projectileStatus = await projectile.projectileAlive();

  if (projectileStatus) {
    let result = await timeularapi.updateActivities(true, false); // (create, archive)
    if (result) {
      winston.silly('Automatically synced projectile packages to timeular activities.');
    } else {
      winston.warn('Automatic syncing of projectile packages to timeular activities failed.');
    }
    // continue cyclic package syncing
    setTimeout(cyclicPackageSync, config.timeOutForSync || defaultInterval);
  } else {
    // projectile server not reachable? --> trigger repeated checking
    winston.warn('cyclicPackageSync -> Projectile server seems to be unreachable. Establishing continuous checking for when he\'s reachable again. Every', defaultProjectileAliveInterval/1000, 's');
    setTimeout(checkProjectile, defaultProjectileAliveInterval || 10000); // likely shorter interval than cyclicPackageSync !!
  }
};

/**
 *  function to constantly check if projectile server is reachable (vpn, lokal)
 */
let checkProjectile = async function() {
  winston.silly('checkProjectile -> Trying to reach projectile server . . .');
  projectileStatus = await projectile.projectileAlive();
  if (projectileStatus) {
    winston.silly('checkProjectile -> projectile server status is true.');
    if(!projectileOnly) {
      cyclicPackageSync();
    }
  } else {
    winston.silly('checkProjectile -> projectile server status is still false. Keep checking every', defaultProjectileAliveInterval/1000, 's');
    setTimeout(checkProjectile, defaultProjectileAliveInterval || 10000);
  }
};

/**
 *  function to write content of config to config.json
 */
async function writeToConfig(parametername, value) {
  // read from config
  try {
    let config = JSON.parse(fs.readFileSync('config.json'));
  } catch (e) {
    winston.warn('writeToConfig -> Failed to read config.json configurationfile. Corrupted or non existent.');
    if (config.length <= 0) {
      winston.debug('writeToConfig -> Config json variable is empty, initialize it cleanly.');
      config = {};
    }
  }
  // set value
  config[parametername] = value;
  // write to config
  try {
    fs.writeFile('config.json', JSON.stringify(config), (err)=>{ if (err){
        winston.warn('writeToConfig -> writing to file ->', err);
      } else {
        winston.debug('writeToConfig -> writing to file done.');
      }
    });
  } catch (e) {
    winston.error('writeToConfig -> Failed to write config.json configurationfile. Corrupted or blocked.');
  }
}

/**
 *  route for healthstatus checks
 */
app.get(basePath + '/healthStatus', (req, res) => {
  res.status(200).send({ healthy: true })
})

/**
 *  route for credentials status checks
 */
app.get(basePath + '/credsStatus', (req, res) => {
  res.status(200).send({ credsPresent: credsPresent });
});

/**
 *  route for projectile status checks
 */
app.get(basePath + '/projectileStatus', (req, res) => {
  res.status(200).send({ projectileStatus: projectileStatus });
});

/**
 *  route for base website
 */
app.get(basePath + '/', (req, res) => {
    winston.debug('Base website entered.');
    // dynamically set port for links in html files
    let html = fs.readFileSync(__dirname + '/src/index.html', {encoding: 'utf8'});
    html = html.replace(/\{port\}/g, appPort);
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
    content = content.replace(/\{port\}/g, appPort);
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
    html = html.replace(/\{port\}/g, appPort);
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
app.post(basePath + '/start', async (req, res) => {
    winston.debug('Post request to /start');
    // receiving post requests for base website
    // winston.debug(req.body); // shows credentials!
    let json = req.body;

    // json content not empty?
    if ((!json.projectileOnly && json.projectileUser && json.projectilePassword) || (json.projectileOnly && json.projectileUser && json.projectilePassword && json.timeularApiKey && json.timeularApiSecret)){
        winston.debug('Credentials json from frontend not empty - trying to test and store those.');
        // set projectile creds
        let user = {login: json.projectileUser,
            password: json.projectilePassword
        }

        writeToConfig('projectileOnly', json.projectileOnly);

        async function testCredentials(user) {
          let options = {
              method: 'POST',
              url: 'https://projectile.office.sevenval.de/projectile/start',
              headers:
                  {'content-type': 'application/x-www-form-urlencoded'},
              form:
                  {
                      action: 'login2',
                      clientId: '0',
                      jsenabled: '1',
                      isAjax: '0',
                      develop: '0',
                      login: user.login,
                      password: user.password
                  },
              strictSSL: false, //TODO: SSL Zertifizierung mit node.js
              timeout: 7000
          };
          let result = rp(options, function (error, response, body) {
              if (error) { winston.error('testCredentials -> Login error in projectile.'); }
              result = response.body.substr(1, 2000).includes("Login</title>");
              winston.debug('testCredentials -> Login keyword existence after login attempt: ', response.body.substr(1, 2000).includes("Login</title>"));
              return result;
          }).then((result) => {
            winston.debug('testCredentials -> negated result before returning from function: ', !result);
            return !result; // reverse boolean, true = no login keyword found
          }).catch((err) => {
            if (!res.statusCode === 302) {
              winston.warn('testCredentials -> Something went wrong: ', err);
            }
            return true;
          });
          return result;
        }

        async function retrieveToken(json) {
          // let timeularApi = '';
          let timeularApi = await rp.post('https://api.timeular.com/api/v2/developer/sign-in',{
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json;charset=UTF-8'
            },
            json: {
              'apiKey': json.timeularApiKey,
              'apiSecret': json.timeularApiSecret
            },
          }, (err, res, body) => {
            if (res.statusCode === 200) {
              winston.debug('retrieveToken -> API credentials retrieved.');
              let apiToken = res.body.token;
              /*
              let timeularApi = {
                  apiToken: apiToken
              } */
              return apiToken; // timeularApi;
            }
          }).catch((err) => {
            if (!res.statusCode === 401) {
              winston.warn('retrieveToken -> Timeular api key and/or secret seem to be invalid. ', err);
            }
            return null;
          });
          // winston.debug('retrieveToken -> Token: ' + JSON.stringify( timeularApi, null, 2 ));
          return timeularApi;
        }

        // do projectile credentials work?
        let projectileCreds = false;

        await testCredentials(user).then((testCreds) => {
          winston.debug('testCredentials -> executed, projectile credentials test result is: ', testCreds);
          if (testCreds) { // !credsPresent.projectileCreds &&
                fs.writeFile('user.txt', JSON.stringify(user), (err) => {
                    if (err) {
                      throw err;
                      winston.warn('testCredentials -> issues while writing projectile credentials to file.');
                    }
                    winston.debug('testCredentials -> writing positivly tested projectile credentials to file user.txt.');
                    projectileCreds = true;
                });
          } else {
            winston.warn('testCredentials -> Test of projectile credentials failed - please check the input.');
          }
        });

        if (json.projectileOnly) {
            credsPresent = projectileCreds;
        }

        if (!json.projectileOnly) {
          await retrieveToken(json).then((timeularApi) => {
            winston.debug('retrieveToken -> executed, timeular token test result is: ' + (timeularApi?'token retrieved':'no token retrieved'));
            if (timeularApi) {
            let timeularApi2 = { // what happens here :o // TODO to check!
                  apiToken: timeularApi.token
              };
              fs.writeFile('timeularToken.txt', JSON.stringify(timeularApi2), (err) => {
                  if (err) {
                    throw err;
                    winston.warn('retrieveToken -> issues while writing timeular token to file.');
                  }
                  winston.debug('retrieveToken -> writing positivly tested timeular token to file timeularToken.txt.');
                  console.log('projectileCreds: ' + projectileCreds);
                  if (projectileCreds === true) {
                    credsPresent = true;
                    winston.debug('retrieveToken -> All credentials are available now. Initiate init sequence of api.');
                    init(); // fetch joblist, get cookie , employee
                  }
                  res.status(200).send(JSON.stringify({requestReceived: true, credsPresent: credsPresent}));
              });
            } else {
              winston.warn('retrieveToken -> Timeular api credentials seems to be invalid.');
              res.status(200).send(JSON.stringify({requestReceived: true, credsPresent: credsPresent}));
            }
            // res.status(200).send(JSON.stringify({requestReceived: true, credsPresent: credsPresent}));
          });
        } else {
          winston.info('ProjectileOnly mode activated. No timeular functions are going to work.');
          res.status(200).send(JSON.stringify({requestReceived: true, credsPresent: credsPresent}));
        }
    } else {
      winston.warn('Credentials json from frontend is empty or incomplete');
      res.status(200).send(JSON.stringify({requestReceived: true, credsPresent: credsPresent}));
    }
    // res.status(200).send(JSON.stringify({requestReceived: true, credsPresent: credsPresent}));
    winston.debug('Post request to /start handled.');
});



// SYNC BOOKINGS
/**
 *  route for syncing timeular with dates within a certain date range
 */
app.get(basePath + '/syncbookings/:startDate/:endDate', async (req, res) => {
  await checkProjectile();
  if (projectileStatus && !projectileOnly){
    winston.debug('(api) Sync range ' + req.params.startDate + ' to ' + req.params.endDate);
    timeularapi.merge(req.params.startDate, req.params.endDate).then((result) => {
      res.status(200).send(JSON.stringify(result));
    });
    winston.debug('/syncbookings/:startDate/:endDate done');
  } else {
    if (!projectileStatus) {
      res.status(504).send(false);
    }
    if (!projectileOnly) {
      await res.status(200).send('API in projectileOnly mode - function currently not available.');
      winston.info('/syncbookings/:startDate/:endDate not executed. ProjectileOnly mode is active.');
    }
  }
});

/**
 *  route for syncing timeular for fixed time ranges e.g. today, week, month
 */
app.get(basePath + '/syncbookings/:choice', async (req, res) => {
  await checkProjectile();
  if (projectileStatus && !projectileOnly){
    console.log('WTF')
    let today = new Date();
    let startDay = new Date();

    switch (req.params.choice) {
      case 'today':
        timeularapi.merge(startDay.toISOString().substr(0, 10), today.toISOString().substr(0, 10)).then((result) => {
          winston.debug('(api) Sync today result: ' + util.inspect(result));
          res.status(200).send(JSON.stringify(result)); // 'Sync done for "today".'
          winston.debug('Sync done for today ' + startDay.toISOString().substr(0, 10));
        });
        // timeularapi.main(startDay.toISOString().substr(0, 10), today.toISOString().substr(0, 10));
        // res.status(200).send('Sync done for today.');
        break;
      case 'week':
        startDay.setDate(today.getDate() - 6);
        timeularapi.merge(startDay.toISOString().substr(0, 10), today.toISOString().substr(0, 10)).then((result) => {
          winston.debug('(api) Sync week result: ' + util.inspect(result));
          res.status(200).send(JSON.stringify(result));
          winston.debug('Sync done for week ' + startDay.toISOString().substr(0, 10), today.toISOString().substr(0, 10));
        });
        // winston.debug('week ' + startDay.toISOString().substr(0, 10), today.toISOString().substr(0, 10));
        // res.status(200).send('Sync done for last 7 days.');
        break;
      case 'month':
        startDay.setMonth(today.getMonth() - 1);
        timeularapi.merge(startDay.toISOString().substr(0, 10), today.toISOString().substr(0, 10)).then((result) => {
          winston.debug('(api) Sync month result: ' + util.inspect(result));
          res.status(200).send(JSON.stringify(result));
          winston.debug('Sync done for month ' + startDay.toISOString().substr(0, 10), today.toISOString().substr(0, 10));
        });
        break;
      default:
        res.status(400).send('Something went wrong - /synctimeular/:choice');
    }
    // res.status(200).send(' ' + req.params.choice )
    winston.debug('/syncbookings/:choice done');
  } else {
    console.log('my oh my')
    if (!projectileStatus) {
      res.status(504).send(false);
    }
    if (projectileOnly === true) {
      await res.status(200).send('API in projectileOnly mode - function currently not available.');
      winston.info('/syncbookings/:choice not executed. ProjectileOnly mode is active.');
    }
  }
})

// SHOW
/**
 *  route for retrieving package list from Projectile in JSON format
 */
app.get(basePath + '/showListProjectile/:pretty?', async (req, res, next) => {
  try {
    jobList = await projectile.fetchNewJobList();
    if (req.params.pretty) { // any value for pretty should be ok
      let result = '<ul>';
      jobList.forEach((item) => {
        result = result + '<li>Name: ' + item.name + ' - No.: ' + item.no + ' - remaining Time: ' + item.remainingTime + ' - Time limit: ' + item.limitTime + ' - Total booked time: ' + item.Totaltime + '</li>';
      });
      result = result + '</ul>';
      res.status(200).send(result);
    } else {
      res.status(200).send(JSON.stringify(jobList));
    }
    // res.status(200).send(JSON.stringify(jobList));
  } catch (err) {
     res.status(400).send('Something went wrong - /showListProjectile');
  }
  winston.debug('/showListProjectile done');
})

/**
 *  route for retrieving package list from timeular in JSON format
 */
app.get(basePath + '/showListTimeular', async (req, res, next) => {
  if (!projectileOnly) {
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
  } else {
    res.status(200).send('API in projectileOnly mode - function currently not available.');
    winston.info('/showListTimeular can\'t work. API started in projectileOnly mode.');
  }
})

// BOOK
/**
 *  route for booking (date, duration, activity, note provided)
 */
 app.get(basePath + '/book/:date?/:duration/:activity/:note', async (req, res) => { // whats the spec duration format - 1,75? 1:45?
   try {
/*   e.g.
     http://localhost:3000/book/1/2788-3/testing
     http://localhost:3000/book/2018-05-23/1.5/2788-3/testing
*/
     // books in timeular and projectile!)
     // TODO check validity of date, duration, activitiy and note?

     // check if date parameter is present or use current date
     let date = '';
     if (!req.params.date) {
       date = new Date().toISOString().substr(0, 10); // YYYY/MM/DD
     } else {
       date = req.params.date;
     }
     // create package/activity table
     // analyse the provided "activity" parameter and find the fitting package or activity id pair
     if (!projectileOnly) {
       let packageActivity = await timeularapi.packageActivityList(req.params.activity);
       winston.debug('Debug packageActivity result: ' + packageActivity.Package, packageActivity.Activity);

       // book in TIMEULAR
       // OBOSLETE??  ENTSCHÄRFT timeularapi.bookActivity(req.params.date, req.params.duration, req.params.activity, req.params.note);
       let response = await timeularapi.bookActivityNG(date, req.params.duration, packageActivity.Activity, req.params.note).then((response) => {
         if(response) {
           winston.debug('bookActivity for timeular successfull');
         }
         return response;
       });
     } else {
       winston.info('bookActivity for timeular not executed. ProjectileOnly mode is active.');
     }

     // normalizing duration time if necessary (to x.xx and parse as float to avoid weird duration lengths)
     let time = await projectile.normalizetime(req.params.duration);
     time = parseFloat(time);
     // book in projectile
     projectile.save(date, time, packageActivity.Package, req.params.note).then(() => {
       winston.debug('save for projectile successfull');
       // handle result of save request!! TODO
       res.status(200).send(date + ' ' +  req.params.duration + ' ' +  req.params.activity + ' ' +  req.params.note)
     });
   } catch (e) {
     res.status(400).send('Something went wrong - /book/:date/:duration/:activity/:note');
   }
   winston.debug('/book/:date?/:duration/:activity/:note done');
 })

  // SYNC ACTIVITIES
  /**
   *  route for syncing activities of projectile and timeular
   */
   app.get(basePath + '/syncactivities', async (req, res) => {
     if (projectileStatus && !projectileOnly){
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
     } else {
       if (!projectileStatus) {
         res.status(504).send(false);
       }
       if (!projectileOnly) {
         await res.status(200).send('API in projectileOnly mode - function currently not available.');
         winston.info('/syncactivities not executed. ProjectileOnly mode is active.');
       }
     }
   });

   /**
    *  route for setting syncing interval for activities of projectile and timeular in seconds
    */
    app.get(basePath + '/syncinterval/:interval', async (req, res) => {
      try {
        winston.debug('Setting interval for auto syncing of activities... Value: ' + req.params.interval + 's');
        // timeOutForSync = req.params.interval * 1000;
        if (req.params.interval * 1000 !== config.timeOutForSync) {
          writeToConfig('timeOutForSync', req.params.interval * 1000);
          winston.debug('Sync interval set to: ' + req.params.interval + 's');
        } else {
          winston.debug('Sync interval not changed, because same value provided: ' + req.params.interval + 's');
        }
        await res.status(200).send(true);
      } catch (e) {
        winston.warn('Something went wrong - /syncinterval/:interval value: ' + req.params.interval);
        res.status(400).send(false);
      }
      winston.debug('/syncinterval/:interval done');
    })

    /**
     *  route for getting syncing interval for activities of projectile and timeular in seconds
     */
     app.get(basePath + '/syncinterval', async (req, res) => {
       try {
         winston.debug('/syncinterval -> Getting interval for auto syncing of activities... Value: ' + (config.timeOutForSync?(config.timeOutForSync/1000):(defaultInterval/1000)) + 's');
         //await res.status(200).send((config.timeOutForSync?(config.timeOutForSync/1000):(defaultInterval/1000)));
         res.send('' + (config.timeOutForSync?(config.timeOutForSync/1000):(defaultInterval/1000)));
       } catch (e) {
         res.status(400).send('Something went wrong - /syncinterval');
       }
       winston.debug('/syncinterval done');
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
if(!module.parent){app.listen(appPort, () => {
  console.log(`Projectile-Timeular API / APP is listenning on port ${appPort}!` +
  ` - Open http://localhost:${appPort}/ in your browser to access it.`);
  // logger.info(`Projectile-Timeular sync app listening on port 3000!`)
})}
