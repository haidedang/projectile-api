const logger = require('../../lib/logger');

const ProjectileService = require('../../api/services/ProjectileService');

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
      let date = '';
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
      let result = await projectile.save(
        date,
        time,
        req.body.activity,
        req.body.note,
        req.cookie,
        req.employee
      );

      if (result.returnValue === false) {
        res.status(200).json({
          status: 'error',
          message: result.errors ? result.errors : ''
        });
        logger.warn('Saving in projectile unsuccessfull!');
        return;
      }
      res.status(200).json({
        status: 'ok'
      });
      logger.debug('Saving in projectile successfull.');
      return;
    } catch (e) {
      res.status(200).json({
        status: 'error',
        message: e.message
      });
      logger.error('Something went wrong - /book');
      logger.error(e.stack);
    }
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
      logger.debug(
        '/edit --> editEntry() --> starting updating of entry/entries...'
      );
      const projectile = new ProjectileService();
      const json = req.body; // array of entry objects

      /* no refresh prior to running the update routine necessary. The daylist was read, altered and now gets
      rewritten, no matter what happend in the meantime, to ensure consistency for this session */
      const result = await projectile.updateEntry(
        req.cookie,
        req.employee,
        json
      );

      if (result.returnValue === false) {
        res.status(200).json({
          status: 'error',
          message: result.errors ? result.errors : ''
        });
        logger.warn('Editing in projectile unsuccessfull!');
        return;
      }

      res.status(200).json({
        status: 'ok'
      });
      logger.debug('Editing in projectile successfull.');
      return;
    } catch (e) {
      res.status(200).json({
        status: 'error',
        message: e.message
      });
      logger.error('Something went wrong - /edit');
      logger.error(e.stack);
    }
  }

  /**
   * Static middleware to handle getdaylist route.
   *
   * @param {object} req ExpressJS request object.
   * @param {string} req.body.date date value.
   * @param {string} req.cookie Cookie from Projectile
   * @param {string} req.employee  Projectile Employee ID
   * @param {object} res ExpressJS response object.
   * @param {string} res.status String with 'ok' or 'error'.
   * @returns {void}
   */
  static async getDayList(req, res) {
    try {
      logger.debug('/getDayList -> starting for date: ' + req.body.date);
      const projectile = new ProjectileService();
      const json = req.body;

      // Currently necessary to ensure that updates of a hypothetical second session of projectile (e.g. via browser) are recognized!
      // Without that updates might be invisible between those sessions, e.g. ignoring deletion of entries.
      await projectile.refreshProjectile(req.cookie, req.employee);

      const dayList = await projectile.getDayListNG(
        req.cookie,
        req.employee,
        json.date
      );

      if (dayList.problems !== undefined) {
        res.status(401).send({
          status: 'error',
          message: 'Unauthorized'
        });
        logger.debug('/getDayList -> unsuccessfull. Unauthorized access');
      } else {
        const result = {
          status: 'ok',
          response: dayList
        };
        res.status(200).send(result);
        logger.debug('/getDayList -> successfull');
        logger.debug(
          '/getDayList -> dayList of size ' + dayList.length + ' sent.'
        );
      }
    } catch (e) {
      res.status(200).send({ status: 'error' });
      logger.error('/getDayList -> not successfull.');
    }
  }

  /**
   * Static middleware to handle getjoblist route.
   *
   * @param {object} req ExpressJS request object.
   * @param {object} req.cookie The projectile cookie that is read from the bearer token.
   * @param {object} req.employee The projectile employee that is read from the bearer token.
   * @param {object} res ExpressJS response object.
   * @param {string} res.status String with 'ok' or 'error'.
   * @returns {void}
   */
  static async getJobList(req, res) {
    const projectile = new ProjectileService();
    try {
      const jobList = await projectile.getJobListNG(req.cookie, req.employee);

      if (jobList.problems !== undefined) {
        res.status(401).json({
          status: 'error',
          message: 'Unauthorized'
        });
        logger.debug('/getJobList -> unsuccessfull. Unauthorized access');
        return;
      }

      res.status(200).json({
        status: 'ok',
        response: jobList
      });
      logger.debug('/getJobList -> successfull');
      logger.debug(
        '/getJobList -> jobList of size ' + jobList.length + ' sent.'
      );
    } catch (err) {
      logger.error(err);
      res.status(200).json({
        status: 'error',
        message: err.message
      });
      logger.error('/getJobList -> not successfull.');
    }
  }
}

module.exports = BookingController;
