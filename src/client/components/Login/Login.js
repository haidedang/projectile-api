import React from 'react';
import { connect } from 'react-redux';
import { withRouter, Redirect } from 'react-router-dom';

import AuthentificationService from '../../services/AuthentificationService';
import { login } from '../../actions/AuthentificationActions';
import SessionStorage from '../../utils/SessionStorage';
import { getToken } from '../../reducers';

// eslint-disable-next-line
import styles from './Login.css';

class Login extends React.Component {
  constructor(props) {
    super(props);
    this.state = { username: '', password: '' };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  renderRedirect () {
    if (SessionStorage.getItem('token')) {
      return <Redirect to='/dashboard' />
    }
  }

  handleChange(event) {
    switch (event.target.type) {
      case 'text':
        this.setState({ username: event.target.value });
        break;
      case 'password':
        this.setState({ password: event.target.value });
    }
  }

  async handleSubmit(event) {
    event.preventDefault();

    try {
      const res = await AuthentificationService.login(
        this.state.username,
        this.state.password
      );

      if (!res.token) {
        return;
      }

      if (res.token) {
        this.props.dispatch(login(res.token));
        // this.props.history.push({ pathname: '/dashboard' });
      }
    } catch (e) {
      console.log('Error: ', e);
    }
  }

  render() {
    return (
      <div className="card card-container">
        {this.renderRedirect()}
        <img
          id="profile-img"
          className="profile-img-card"
          src="//ssl.gstatic.com/accounts/ui/avatar_2x.png"
        />
        <p id="profile-name" className="profile-name-card" />
        <form className="form-signin">
          <span id="reauth-email" className="reauth-email" />
          <input
            value={this.state.username}
            onChange={this.handleChange}
            type="text"
            id="inputEmail"
            className="form-control"
            placeholder="Email address"
            required
            autoFocus
          />
          <input
            type="password"
            id="inputPassword"
            value={this.state.handleChange}
            onChange={this.handleChange}
            className="form-control"
            placeholder="Password"
            required
          />
          <div id="remember" className="checkbox">
            <label>
              <input type="checkbox" value="remember-me" /> Remember me
            </label>
          </div>
          <button
            className="btn btn-lg btn-primary btn-block btn-signin"
            type="submit"
            onClick={this.handleSubmit}
          >
            Sign in
          </button>
        </form>
        <a href="#" className="forgot-password">
          Forgot the password?
        </a>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    token: getToken(state)
  };
}

export default withRouter(connect(mapStateToProps)(Login));

