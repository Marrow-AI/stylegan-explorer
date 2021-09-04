import React from 'react';
import { Route, BrowserRouter as Router } from 'react-router-dom'
import './App.scss';
import Generate from './components/Generate.js';
import Home from './components/Home.js';
import About from './components/About.js';
import socketIOClient from "socket.io-client";
import store, { setSocket } from './state'
import { isMobile } from 'react-device-detect';

const socket = socketIOClient('https://latentspace.tools');

console.log("Connecting to socket");
socket.on('connect', () => {
  console.log("Socket connected!", socket.id);
  store.dispatch(setSocket(socket));
});


function App() {
  const ENDPOINT= 'https://latentspace.tools'
  
  store.dispatch({
    type: 'END_POINT',
    ENDPOINT: ENDPOINT
})

if (isMobile) {
  return (
    <div className='mobile-container'>
      <div className="mobileContainer">
        <p className="mobileMsg">This website is not suitable for mobile devices.
          <br />
          Please come back from your desktop.
          <br />
          <br />
          Thank you! </p>
      </div>
    </div>
  )
}
  return (
    <>
    <div className='mobile-container Main'>
        <div className="mobileContainer">
          <p className="mobileMsg">This website is not suitable for small size screens.
            <br />
            Please increase your window or revist from desktop.
            <br />
            <br />
            Thank you! </p>
        </div>
      </div>
    <div className='app-container'>
      <Router>
        <Route exact path="/" component={Home} />
        <Route exact path="/explore" component={Generate} />
        <Route exact path="/about" component={About} />
      </Router>
    </div>
    </>
  );
}

export default App;
