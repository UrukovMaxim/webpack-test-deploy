import React, {Component} from 'React';
import Header from 'header';
import Footer from 'footer';

class App extends Component {
  constructor() {
    super();
  }

  render() {
    return (
      <div className='privet'>
        <Header/>
        Test widget <br/>
        {NODE_ENV}
        <Footer/>
      </div>
    )
  }
}

export default App;