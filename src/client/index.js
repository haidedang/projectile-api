import React from 'react';
import ReactDOM from 'react-dom';
import { HashRouter, Route } from 'react-router-dom';
import {Provider} from 'react-redux'
import App from './components/App/App';
import Login from './components/Login/Login';
import DashBoard from './components/DashBoard/DashBoard'
import store from './store'

function checkAuth (nextState, cb){ 
  const {loggedIn} = store.getState();
  console.log(loggedIn);
}

ReactDOM.render(
  <Provider store={store}>
    <HashRouter>
      <div>
        <Route exact path="/" component={App} />
        <Route path="/login" component={Login} />
        <Route path="/dashBoard" component={DashBoard} />
      </div>
    </HashRouter>
  </Provider>,
  document.getElementById('root'));
