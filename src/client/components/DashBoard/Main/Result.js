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
   * Render everything.
   */
  render() {
    const { result } = this.props;
    if (result.status === 'ok') {
      return <div className="result success--font">Booking: {result.status}</div>;
    } else {
      /* error */
      return (
        <div className="result warn--border">
          <p className="warn--font">{result.status}</p>
          { this.createList(result.message) }
        </div>
      );
    }
  }
}

export default Result;
