import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter as Router } from "react-router-dom";
import { Provider } from "react-redux";
import App from "./components/App/App";
import store from "./store";

// function checkAuth(nextState, cb) {
// const { loggedIn } = store.getState();
// console.log(loggedIn);
// }

// global document
ReactDOM.render(
  <Provider store={store}>
    <Router>
      <App foo="bar" />
    </Router>
  </Provider>,
  document.getElementById("root")
);
