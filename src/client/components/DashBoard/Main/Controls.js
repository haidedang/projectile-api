import React from 'react';
import { FaPlayCircle, FaStopCircle } from 'react-icons/fa';
import { IconContext } from 'react-icons';

class Controls extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { isRunning, start, stop } = this.props;
    return (
      <div>
        {!isRunning ? (
          <IconContext.Provider
            value={{ color: 'green', className: 'global-class-name' }}
          >
            <span>
              <FaPlayCircle onClick={this.props.start} id="start" size={50} />
            </span>
          </IconContext.Provider>
        ) : null}

        {isRunning ? (
          <IconContext.Provider
            value={{ color: 'red', className: 'global-class-name' }}
          >
            <span>
              <FaStopCircle onClick={this.props.stop} id="stop" size={50} />
            </span>
          </IconContext.Provider>
        ) : null}
      </div>
    );
  }
}

export default Controls;
