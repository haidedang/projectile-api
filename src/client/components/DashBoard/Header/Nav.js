import React from 'react';
import { logout } from '../../../actions';
import { withRouter } from 'react-router-dom';
import { connect } from 'react-redux';

class Nav extends React.Component {
  constructor(props) {
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleSubmit(event) {
    event.preventDefault();
    this.props.dispatch(logout());
    this.props.history.replace({
      pathName: '/'
    });
  }

  render() {
    return (
      <div>
        <nav className="navbar navbar-light bg-light justify-content-between">
          <a className="navbar-brand">Projectile API</a>
          <form className="form-inline">
            <button
              className="btn btn-outline-danger my-2 my-sm-0"
              onClick={this.handleSubmit}
            >
              Logout
            </button>
          </form>
        </nav>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {};
}

export default withRouter(connect(mapStateToProps)(Nav));
