import React from 'react';
import { connect } from 'react-redux';
import { withRouter, Redirect } from 'react-router-dom';
import Booking from './Main/Booking';

import ApiCaller from '../../services/ApiCaller';
import { getToken, getSelectOptions } from '../../reducers';
import { addSelectOptions } from '../../Actions/PackageActions';

class DashBoard extends React.Component {
  async componentDidMount() {
    console.log(sessionStorage.token);
    console.log(sessionStorage);
    //Actions required to provide package data for Select Options
    const api = new ApiCaller(sessionStorage.token);

    try {
      let res = await api.callApi('showListProjectile', 'GET');

      if (res.status === 'error') {
        console.error(res);
        return;
      } else {
        console.log(res);
        this.props.dispatch(addSelectOptions(res));
      }
    } catch (e) {
      console.log('Error', e);
    }
  }

  renderRedirect() {
    if (!sessionStorage.token) {
      return <Redirect to="/login" />;
    }
  }

  render() {
    return (
      <div>
        {this.renderRedirect()}
        <Booking options={this.props.options} />
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    token: getToken(state),
    options: getSelectOptions(state)
  };
}

export default withRouter(connect(mapStateToProps)(DashBoard));
