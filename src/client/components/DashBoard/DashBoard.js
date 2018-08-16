import React from 'react';
import { connect } from 'react-redux';
import { withRouter, Redirect } from 'react-router-dom';

import { addSelectOptions } from '../../actions/PackageActions';
import Booking from './Main/Booking';
import DashboardService from '../../services/DashboardService';
import { getToken, getSelectOptions } from '../../reducers';
import SessionStorage from '../../utils/SessionStorage';

/**
 * Basic DashBoard react component.
 */
class DashBoard extends React.Component {
  /**
   * Static method to setup the state of the component.
   *
   * @param {object} state The Redux state object.
   * @returns {object} An object with the state for this component.
   */
  static mapStateToProps(state) {
    return {
      token: getToken(state),
      options: getSelectOptions(state)
    };
  }

  /**
   * The component is ready to use. Get the activity list then.
   *
   * @returns {void}
   */
  async componentDidMount() {
    const service = new DashboardService(SessionStorage.getItem('token'));

    try {
      let res = await service.getActivityList();
      this.props.dispatch(addSelectOptions(res));
    } catch (e) {
      console.log('Error', e);
    }
  }

  /**
   * Render the Redirect component when the token is not set. This redirects to the login route.
   *
   * @returns {React.Component} The Redirect component.
   */
  renderRedirect() {
    if (!SessionStorage.getItem('token')) {
      return <Redirect to="/login" />;
    }
  }

  /**
   * Render everything.
   */
  render() {
    return (
      <div>
        {this.renderRedirect()}
        <Booking options={this.props.options} />
      </div>
    );
  }
}

export default withRouter(connect(DashBoard.mapStateToProps)(DashBoard));
