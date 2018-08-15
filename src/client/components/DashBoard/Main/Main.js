import React from 'react';
import Booking from './Booking';

class Main extends React.Component {
  render() {
    return (
      <Booking options = {this.props.options} />
    );
  }
}

export default Main;
