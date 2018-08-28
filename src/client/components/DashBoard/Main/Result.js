import React from 'react';

class ShowResult extends React.Component {
  constructor(props) {
    super(props);
  }

  createList(messages) {
    let messageList = []

    for (const item in messages) {
      messageList.push(<li key={item}>{messages[item].message}</li>);
    }
    return messageList
  }

  render() {
    const { result } = this.props;
    if (result.status === 'ok') {
      return <div className="result">{result.status}</div>;
    } else if (result.status === 'error'){
      return (
        <div className="result">
          <p>{result.status}</p>
          <ul>
            { this.createList(result.message) }
          </ul>
        </div>
      );
    }
    return null;
  }
}

export default ShowResult;
