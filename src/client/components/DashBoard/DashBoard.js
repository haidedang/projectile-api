import React from 'react';
import Nav from './Header/Nav';
import Main from './Main/Main';
import { connect } from 'react-redux';

import { fetchSelectOptions } from '../../Actions/PackageActions';
import ApiCaller from '../../services/ApiCaller';
import { getToken, getSelectOptions } from '../../reducers';
import { addSelectOptions } from '../../Actions/PackageActions';

class DashBoard extends React.Component {
  async componentWillMount() {
    console.log(sessionStorage.token);
    console.log(sessionStorage);
    //Actions required to provide package data for Select Options
    const api = new ApiCaller(sessionStorage.token);
    try {
      let res = await api.callApi('showListProjectile');

      if (res.status == 'error') {
        console.error(res);
        return;
      } else {
        console.log(res)
        this.props.dispatch(addSelectOptions(res));
      }
    } catch (e) {
      console.log('Error', e);
    }
  }

  render() {
    return (
      <div>
        <Nav />
        <Main options={this.props.options} />
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

export default connect(mapStateToProps)(DashBoard);
