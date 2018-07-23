let BookController = {};
const api = require('../api');
const timeularapi = require('../timeularAPI');
const winston = require('winston');

const projectile = require('../projectileAPI.js');


let projectileOnly = false;
let projectileStatus = false;

BookController.bookEntry = async (req, res) => { 
    console.log('reached Controller')
    try {
      /*   e.g.
           http://localhost:3000/book/1/2788-3/testing
           http://localhost:3000/book/2018-05-23/1.5/2788-3/testing
          */
      // books in timeular and projectile!
      // TODO: check validity of date, duration, activitiy and note?

      // check if date parameter is present or use current date
      let date = '';
      if (!req.params.date) {
        date = new Date().toISOString().substr(0, 10); // YYYY/MM/DD
      } else {
        date = req.params.date;
      }

      // normalizing duration time if necessary (to x.xx and parse as float to avoid weird duration lengths)
      let time = await projectile.normalizetime(req.params.duration);
      time = parseFloat(time);
      // book in projectile
      /*
           use activity directly when projectileOnly mode is active, else use Package value processed from timeular,
           it allows to use activityId or packageId to be provided in url
           */
      projectile.save(date, time, req.params.activity, req.params.note).then((result) => {
        winston.debug('save for projectile successfull');
        // handle result of save request!! TODO
        // res.status(200).send(date + ' ' + req.params.duration + ' ' + req.params.activity + ' ' + req.params.note);
        if (result.resultValue == false) {
          res.status(200).send(result);
        } else {
          res.status(200).send(
            {
              bookedEntry: {
                date: date,
                duration:req.params.duration,
                activity: req.params.activity,
                note: req.params.note
              }
            }
          );
        }
      });

    } catch (e) {
      res.status(400).send('Something went wrong - /book/:date/:duration/:activity/:note');
      winston.error('/book/:date?/:duration/:activity/:note');
      winston.debug(e);
    }
    winston.debug('/book/:date?/:duration/:activity/:note done');
}

module.exports = BookController;
