import React, {Component} from 'React';
import ReactDOM from 'react-dom';
import ReviewsIndex from 'ReviewsIndex';

console.log('app init');

const rootNode = document.getElementById('app');

ReactDOM.render(
  <ReviewsIndex/>,
  rootNode
);