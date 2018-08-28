import React from 'react';

// styles
import './Result.css'

class ShowResult extends React.Component {
  constructor(props) {
    super(props);
  }

  createList(messages) {
    let messageList = []

    for (const item in messages) {
      messageList.push(<div className="warn--info">{messages[item].message}</div>);
    }

    return messageList
  }

  render() {
    const { result } = this.props;
    if (result.status === 'ok') {
      return <div className="result success--font">Booking: {result.status}</div>;
    } else if (result.status === 'error'){
      return (
        <div className="result warn--border">
          <p className="warn--font">{result.status}</p>
          { this.createList(result.message) }
        </div>
      );
    }
    return null;
  }
}

export default ShowResult;
