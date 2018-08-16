import React from 'react';

import Header from '../Header/Header';
import Main from '../Main/Main';
import './app.css';

class App extends React.Component {

  render() {
    return (
      <div>
        <Header/>
        <Main/>
      </div>
    );
  }
}

export default App;
