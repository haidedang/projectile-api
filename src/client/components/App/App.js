import React, { Component } from 'react';
import './app.css';
import { Router, browserHistory } from 'react-router';
import { Route, IndexRoute } from 'react-router';
import Login from '../Login/Login';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import { getToken } from '../../reducers';

class App extends Component {
  render() {
    if (sessionStorage.token == undefined) {
      return (
        <div className="jumbotron">
          <div id="root" className="container">
            <Login />
          </div>
        </div>
      );
    } else {
      return (
        <div>
          <h1>You are logged In.</h1>
        </div>
      );
    }
  }
}

/* function mapStateToProps(state) {
  return {
    token: getToken(state)
  };
} */

export default App;
