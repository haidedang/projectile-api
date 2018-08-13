import React from 'react';
import Timer from './Timer';
import Controls from './Controls';

import timeFormat from '../../../utils/timeFormat';

function getDefaultState() {
  return {
    isRunning: false,
    time: 0,
    startTime: Date.now(),
    currentTime: null
  };
}

class StopWatch extends React.Component {
  constructor(props) {
    super(props);
    this.state = getDefaultState();
    this.timerRef = null;
  }

  componentDidMount() {
    const that = this;
    window.addEventListener('focus', function() {
      if (that.state.isRunning) {
        const now = Date.now() - that.state.startTime;
        that.setState({ time: now });
      }
    });
  }

  updateTimer(extraTime) {
    const { time } = this.state;
    this.setState({ time: time + extraTime });
  }

  start() {
    this.setState(
      {
        isRunning: true
      },
      () => {
        this.timerRef = setInterval(() => {
          this.updateTimer(100);
        }, 100);
      }
    );
  }

  stop() {
    let newTime = timeFormat(this.state.time).split(':');
    newTime.pop();

    console.log(newTime.join(':'));

    this.setState(
      {
        isRunning: false
      },
      () => {
        clearInterval(this.timerRef);
      }
    );

    this.props.handleClick(newTime.join(':'));
  }

  reset() {
    this.setState(getDefaultState());
  }

  render() {
    const { isRunning, time } = this.state;

    return (
      <div>
        <Timer time={time} />
        <Controls
          isRunning={isRunning}
          start={() => this.start()}
          stop={() => this.stop()}
        />
      </div>
    );
  }
}

export default StopWatch;
