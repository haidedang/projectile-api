import React from 'react';

// styles
import './Result.css'

class Result extends React.Component {
  constructor(props) {
    super(props);
  }

  /**
   * Returns a list of warning messages.
   *
   * @param {object} messages A JSON object with error and warning messages
   * @returns {Array} An array of prepared error and warning messages.
   */
  createList(messages) {
    let messageList = []

    for (const item in messages) {
      messageList.push(<div className="warn--info">{messages[item].message}</div>);
    }

    return messageList
  }

  /**
   * Returns success status html.
   *
   * @param {string} status The status returned from API request
   * @returns {html} The status as html output.
   */
  getSuccessMessage(status) {
    return <div className="result success--font">Booking: {status}</div>;
  }

  /**
   * Returns a list of formated warning messages and the status.
   *
   * @param {string} status The status returned from API request
   * @param {Array} message An array of warning and error messages
   * @returns {html} Html output.
   */
  getErrorMessage(status, message) {
    return (
      <div className="result warn--border">
        <p className="warn--font">{status}</p>
        { this.createList(message) }
      </div>
    );
  }

  /**
   * Render everything.
   */
  render() {
    const { result } = this.props;

    if (result.status === 'ok') {
      return this.getSuccessMessage(result.status);
    } else if (result.status === 'error') {
      return this.getErrorMessage(result.status, result.message);
    }
    return null;
  }
}

export default Result;
