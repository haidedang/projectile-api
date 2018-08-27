import React from 'react';
import Timer from './Timer';
import Controls from './Controls';

import timeFormat from '../../../utils/timeFormat';

class StopWatch extends React.Component {
  constructor(props) {
    super(props);
    this.state = this.getDefaultState();
    this.timerRef = null;
  }

  componentDidMount() {
    const that = this;
    window.addEventListener('focus', function() {
      if (that.state.isRunning) {
        const now = (Date.now() - that.state.startTime) - that.state.pauseTime;
        that.setState({ time: now });
      }
    });
  }

  updateTimer(extraTime) {
    const { time } = this.state;
    this.setState({ time: time + extraTime });
  }

  start() {
    if (!this.state.notBooked) {
      this.setState({
        startTime: Date.now()
      });
    }

    if (this.state.pausedAt !== 0) {
      const newPauseTime = this.state.pauseTime + (Date.now() - this.state.pausedAt);
      this.setState({
        pauseTime: newPauseTime
      });
    }

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
    /* Remove second from duration time. Only full minutes get booked. */
    let newTime = timeFormat((Date.now() - this.state.startTime) - this.state.pauseTime).split(':');

    newTime.pop();

    this.setState({
      isRunning: false,
      time: (Date.now() - this.state.startTime) - this.state.pauseTime,
      notBooked: true,
      pausedAt: Date.now()
    },
    () => {
      clearInterval(this.timerRef);
    });

    this.props.handleClick(newTime.join(':'));
  }

  reset() {
    this.setState(this.getDefaultState());
  }

  getDefaultState() {
    return {
      notBooked: false,
      isRunning: false,
      time: 0,
      startTime: 0,
      currentTime: null,
      pauseTime: 0,
      pausedAt: 0
    };
  }

  render() {
    const { isRunning, time } = this.state;

    return (
      <div>
        <Timer time={time}/>
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
