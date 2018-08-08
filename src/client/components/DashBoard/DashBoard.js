import React from 'react';
import Nav from './Header/Nav'
import Main from './Main/Main'

class DashBoard extends React.Component {
  render() {
    return (
      <div>
        <Nav />
        <Main />
      </div>
    );
  }
}

export default DashBoard;
