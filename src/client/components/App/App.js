import React from 'react';

import Header from '../Header/Header';
import Main from '../Main/Main';
import SessionStorage from '../../utils/SessionStorage';
import './app.css';

class App extends React.Component {
  /**
   * Return the header component when the user has a token.
   */
  renderHeader() {
    if (!SessionStorage.getItem('token')) {
      return;
    }

    return <Header />;
  }

  /**
   * Render everything.
   */
  render() {
    return (
      <div>
        {this.renderHeader()}
        <Main/>
      </div>
    );
  }
}

export default App;
