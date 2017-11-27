import React, {Component} from 'React';
import ReactDOM from 'react-dom';
import App from 'App';

console.log('app init');

const rootNode = document.getElementById('app');

ReactDOM.render(
  <App/>,
  rootNode
);