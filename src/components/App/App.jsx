import React, {Component} from 'React';
// import Header from 'Header';
// import Footer from 'Footer';

import './App.scss';

class App extends Component {
  constructor() {
    super();
  }

  render() {
    const {car} = this.props;

    return (
      <div className='privet App'>
        {/*<Header/>*/}
        Test widget 12<br/>
        {NODE_ENV}
        {car}
        {/*<Footer/>*/}
      </div>
    )
  }
}

export default App;