import React, { Component } from "react";
import "./app.css";
import { Router, browserHistory } from 'react-router'
import { Route, IndexRoute } from 'react-router'
import Login from './components/Login/Login'
import { Link } from 'react-router-dom';

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = { username: null };
  }

  // API TEST
  componentDidMount() {
    fetch("/api/v1/test")
      .then(res => res.json())
      .then(user => this.setState({ username: user.username }));
  }

  render() {
    return (
      <div className="jumbotron">
        <div className="container">
          <div className="col-sm-8 col-sm-offset-2">
            <Login />
          </div>
        </div>
      </div>
    );
  }
}
