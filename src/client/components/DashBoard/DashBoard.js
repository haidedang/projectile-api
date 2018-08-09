import React from 'react';
import { connect } from 'react-redux';
import { withRouter, Redirect } from 'react-router-dom';

import { getToken } from '../../reducers';

class DashBoard extends React.Component {
  constructor(props) {
    super(props);
  }

  renderRedirect () {
    if (!this.props.token) {
      return <Redirect to='/login' />
    }
  }

  render() {
    return (
      <div>
        {this.renderRedirect()}
        <h1>Hello DashBoard</h1>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    token: getToken(state)
  };
}

export default withRouter(connect(mapStateToProps)(DashBoard));
