import React from "react";
import { Link, withRouter } from "react-router-dom";
import { connect } from "react-redux";

import { logout } from "../../actions";
import { getToken } from '../../reducers';

class Nav extends React.Component {
  constructor(props) {
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleSubmit(event) {
    event.preventDefault();
    this.props.dispatch(logout());
    this.props.history.replace({
      pathName: "/"
    });
  }

  renderLoginLink() {
    return (
      <Link className="btn btn-outline-success my-2 my-sm-0" to="/login">
        Login
      </Link>
    );
  }

  renderLogoutButton() {
    return (
      <button className="btn btn-outline-danger my-2 my-sm-0" onClick={this.handleSubmit}>
        Logout
      </button>
    );
  }

  renderButtons() {
    if (this.props.token) {
      return this.renderLogoutButton();
    }

    return this.renderLoginLink();
  }

  render() {
    return (
      <nav className="navbar navbar-light bg-light justify-content-between">
        <Link to="/dashboard" className="navbar-brand">Projectile API</Link>
        {this.renderButtons()}
      </nav>
    );
  }
}

function mapStateToProps(state) {
  return {
    token: getToken(state)
  };
}

export default withRouter(connect(mapStateToProps)(Nav));
