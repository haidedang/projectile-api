import React from 'react';
import { FaPlayCircle, FaStopCircle } from 'react-icons/fa';
import { IconContext } from 'react-icons';

// styles
import './Controls.css'

class Controls extends React.Component {
  /**
   * Returns the React play circle component.
   *
   * @returns {React.Component} A react component to display a circle with a play icon.
   */
  getPlayCircle() {
    return <FaPlayCircle className="play-circle" onClick={this.props.start} id="start" size={50} />;
  }

  /**
   * Returns the React stop circle component.
   *
   * @returns {React.Component} A react component to display a circle with stop icon.
   */
  getStopCircle() {
    return <FaStopCircle onClick={this.props.stop} id="stop" size={50} />;
  }

  /**
   * Create and return a React IconProvider with the given controlElement.
   *
   * @param {string} color The color used for the icon.
   * @param {React.Component} controlElement A react component that builds an SVG icon.
   * @returns {React.Component} The IconProvider component.
   */
  renderIconProvider(color, controlElement) {
    const providerValue = {
      color,
      className: 'global-class-name'
    };

    return (
      <IconContext.Provider value={providerValue}>
        {controlElement}
      </IconContext.Provider>
    );
  }

  /**
   * Decides which control to render.
   *
   * @returns {React.Component} The control element that should be rendered.
   */
  renderControl() {
    if (!this.props.isRunning) {
      const playControl = this.getPlayCircle();
      return this.renderIconProvider('green', playControl);
    }

    const stopControl = this.getStopCircle();
    return this.renderIconProvider('red', stopControl);
  }

  /**
   * Render everything.
   */
  render() {
    return (
      <div>
        {this.renderControl()}
      </div>
    );
  }
}

export default Controls;
