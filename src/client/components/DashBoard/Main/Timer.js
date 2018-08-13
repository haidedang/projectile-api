import React from 'react';

import timeFormat from '../../../utils/timeFormat';

class Timer extends React.Component {
  /* static defaultProps = {
    time: 0
  }; */

  render() {
    const { time } = this.props;

    return <div className="Timer">{timeFormat(time)}</div>;
  }
}

export default Timer;
