const logger = require('../../lib/logger');

const ProjectileService = require('../../api/services/ProjectileService');
/* const projectile = require('../../../projectileAPI') */
const authenticationMiddleware = require('../../lib/AuthenticationMiddleware');

class BookingController {
  /**
   * Static middleware to book an activity.
   *
   * @param {object} req ExpressJS request object.
   * @param {string} req.body.date Optional date value.
   * @param {string} req.body.duration The duration time of the work on that activity.
   * @param {string} req.body.activity An ID or the name of the activity, that was retrieved by the showList method.
   * @param {string} req.body.note A description what has been done on that activity.
   * @param {string} req.cookie Cookie from Projectile
   * @param {string} req.employee  Projectile Employee ID
   * @param {object} res ExpressJS response object.
   * @param {string} res.status String with 'ok' or 'error'.
   * @returns {void}
   */
  static async bookEntry(req, res) {
    try {
      const projectile = new ProjectileService();

      /*   e.g.
           http://localhost:3000/book/1/2788-3/testing
           http://localhost:3000/book/2018-05-23/1.5/2788-3/testing
          */
      // books in timeular and projectile!
      // TODO: check validity of date, duration, activitiy and note?

      // check if date parameter is present or use current date
      let date = '';
      if (!req.body.date) {
        date = new Date().toISOString().substr(0, 10); // YYYY/MM/DD
      } else {
        date = req.body.date;
      }

      // normalizing duration time if necessary (to x.xx and parse as float to avoid weird duration lengths)
      let time = await projectile.normalizetime(req.body.duration);
      time = parseFloat(time);
      // book in projectile

      projectile
        .save(
          date,
          time,
          req.body.activity,
          req.body.note,
          req.cookie,
          req.employee
        )
        .then(result => {
          logger.debug('save for projectile successfull');
          // handle result of save request!! TODO
          // res.status(200).send(date + ' ' + req.body.duration + ' ' + req.body.activity + ' ' + req.body.note);
          if (result.resultValue == false) {
            res.status(200).json(result);
          } else {
            res.status(200).json({
              bookedEntry: {
                date: date,
                duration: req.body.duration,
                activity: req.body.activity,
                note: req.body.note
              }
            });
          }
        });
    } catch (e) {
      res
        .status(400)
        .send('Something went wrong - /book/:date/:duration/:activity/:note');
      logger.error('/book/:date?/:duration/:activity/:note');
      logger.info(e.stack);
    }
    logger.debug('/book/:date?/:duration/:activity/:note done');
  }

  static async showDayList(req, res) {}

  /**
   * Static middleware to handle showList route.
   *
   * @param {object} req ExpressJS request object.
   * @param {string} req.body.pretty Attribute to tell the return format.
   * @param {object} req.cookie The projectile cookie that is read from the bearer token.
   * @param {object} res ExpressJS response object.
   * @returns {void}
   */
  static async showList(req, res) {
    const projectile = new ProjectileService();
    /*   res.json({
      status: 'ok'
    }); */
    try {
      let jobList = await projectile.fetchNewJobList(req.cookie, req.employee);
      if (req.params.pretty) {
        // any value for pretty should be ok
        let result = `<table border="1">
          <tbody>
            <tr>
              <th>Paketname</td>
              <th>Paketnummer</td>
              <th>verfügbare Zeit</td>
              <th>Zeit Limit</td>
              <th>gebuchte Zeit</td>
            </tr>`;
        jobList.forEach(item => {
          result =
            result +
            '<tr><td>' +
            item.name +
            '</td><td>' +
            item.no +
            '</td><td>' +
            item.remainingTime +
            '</td><td>' +
            item.limitTime +
            '</td><td>' +
            item.Totaltime +
            '</td></tr>';
        });
        result =
          result +
          `</table>
          </tbody>`;
        res.status(200).send(result);
      } else {
        res.status(200).send(JSON.stringify(jobList));
      }
      logger.debug('/showListProjectile done');
    } catch (err) {
      console.log(err);
      res.status(400).send('Something went wrong - /showListProjectile');
    }
    logger.debug('/showListProjectile done');
  }
}

module.exports = BookingController;
