import React, { Component } from 'react';
// import { Router, browserHistory } from 'react-router';
// import { Route, IndexRoute } from 'react-router';
import Login from '../Login/Login';
import { Route, Switch } from 'react-router-dom';
// import { connect } from 'react-redux';
// import { getToken } from '../../reducers';
import DashBoard from '../DashBoard/DashBoard';

import './app.css';

class App extends Component {
  render() {
    if (sessionStorage.token === undefined) {
      return (
        <main className="jumbotron">
          <div className="container">
            <Login />
          </div>
        </main>
      );
    } else {
      return <DashBoard />;
    }
  }
}

/* function mapStateToProps(state) {
  return {
    token: getToken(state)
  };
} */

export default App;
