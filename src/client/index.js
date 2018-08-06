import React from 'react';
import ReactDOM from 'react-dom';
import { HashRouter, Route } from 'react-router-dom';
import App from './App';
import Login from './components/Login/Login';

ReactDOM.render(
  <HashRouter>
    <div>
      <Route exact path="/" component={App} />
      <Route path="/login" component={Login}/>
    </div>
  </HashRouter>,
  document.getElementById('root'));
