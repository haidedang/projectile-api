import React from 'react';
import { Switch, Route } from 'react-router-dom';

import DashBoard from '../DashBoard/DashBoard';
import Login from '../Login/Login';

export default class Main extends React.Component {

  render() {
    return (
      <main>
        <Switch>
          <Route exact path="/" component={DashBoard} />
          <Route path="/login" component={Login} />
          <Route path="/dashboard" component={DashBoard} />
        </Switch>
      </main>
    );
  }
}

