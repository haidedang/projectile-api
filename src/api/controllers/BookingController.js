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
      // check if date parameter is present or use current date
      let date = "";
      if (!req.body.date) {
        date = new Date().toISOString().substr(0, 10); // YYYY/MM/DD
      } else {
        date = req.body.date;
      }

      // normalizing duration time if necessary (to x.xx and parse as float to avoid weird duration lengths)
      let time = await projectile.normalizetime(req.body.duration);

      // Currently necessary to ensure that updates of a hypothetical second session of projectile (e.g. via browser) are recognized!
      // Without that updates might be invisible between those sessions, e.g. ignoring deletion of entries.
      await projectile.refreshProjectile(req.cookie, req.employee);

      // book in projectile
      await projectile
        .save(
          date,
          time,
          req.body.activity,
          req.body.note,
          req.cookie,
          req.employee
        )
        .then(result => {

          // handle result of save request!! TODO
          // res.status(200).send(date + ' ' + req.body.duration + ' ' + req.body.activity + ' ' + req.body.note);
          if (result.returnValue === false) {
            res.status(200).json(result);
            logger.warn('Saving in projectile unsuccessfull!');
          } else {
            res.status(200).json({
              bookedEntry: {
                date,
                duration: req.body.duration,
                activity: req.body.activity,
                note: req.body.note
              }
            });
            logger.debug('Saving in projectile successfull.');
          }
        });
    } catch (e) {
      res
        .status(400)
        .send(false);
      logger.error('Something went wrong - /book', e.stack);
      logger.info(e.stack);
    }
    logger.debug('/book done');
  }


  /**
   * Static middleware to update an activity.
   *
   * @param {object} req ExpressJS request object.
   * @param {string} req.body.date Optional date value.
   * @param {string} req.body.duration The duration time of the work on that activity.
   * @param {string} req.body.activity An ID or the name of the activity, that was retrieved by the showList method.
   * @param {string} req.body.note A description what has been done on that activity.
   * @param {string} req.body.line The line represents the entrys position in the entry list retrieved for a specific day.
   * @param {string} req.cookie Cookie from Projectile
   * @param {string} req.employee  Projectile Employee ID
   * @param {object} res ExpressJS response object.
   * @param {string} res.status String with 'ok' or 'error'.
   * @returns {void}
   */
  static async editEntry(req, res) {
    try {
      logger.debug('/edit --> editEntry() --> starting updating of entry/entries...');
      const projectile = new ProjectileService();
      const json = req.body; // array of entry objects

      /* no refresh prior to running the update routine necessary. The daylist was read, altered and now gets
      rewritten, no matter what happend in the meantime, to ensure consistency for this session */
      const result = await projectile.updateEntry(req.cookie, req.employee, json);

      res.status(200).send('All fine - post /booking');
      logger.debug('/editing results done');
    } catch(e) {
      res.status(400).send('Something went wrong - post /booking');
      logger.error('/editing results not successfull');
    }
  }

  static async showDayList(req, res) { 

  }

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
            "<tr><td>" +
            item.name +
            "</td><td>" +
            item.no +
            "</td><td>" +
            item.remainingTime +
            "</td><td>" +
            item.limitTime +
            "</td><td>" +
            item.Totaltime +
            "</td></tr>";
        });
        result =
          result +
          `</table>
          </tbody>`;
        res.status(200).send(result);
      } else {
        res.status(200).send(JSON.stringify(jobList));
      }
      logger.debug("/showListProjectile done");
    } catch (err) {
      console.log(err);
      res.status(400).send("Something went wrong - /showListProjectile");
    }
    logger.debug("/showListProjectile done");
  }
}

module.exports = BookingController;
