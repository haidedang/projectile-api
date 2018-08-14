import AbstractService, { METHOD } from './AbstractService';

class DashboardService extends AbstractService {
  /**
   * Gets the activity list for the employee.
   *
   * @returns {object} JSON object with the activities.
   * @throws {Error} An error if any happens when requesting the API.
   */
  async getActivityList() {
    try {
      const activityListResult = await this.sendRequest('showListProjectile', METHOD.GET);

      if (activityListResult.error) {
        throw new Error(activityListResult.message);
      }

      return activityListResult;
    } catch (e) {
      throw e;
    }
  }
}

export default DashboardService;
