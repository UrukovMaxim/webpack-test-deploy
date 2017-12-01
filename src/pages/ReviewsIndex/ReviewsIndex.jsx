import React, {Component} from 'React';
import Footer from 'Footer';
import Header from '@ott/header';

class ReviewsIndex extends Component {
	constructor() {
		super();
	}

	render() {
		const {car} = this.props;
		
		return (
			<div styleName='ReviewsIndex'>
				<Header/>
				Test widget from reviews index<br/>
				{NODE_ENV}
				{car}
				<Footer/>
			</div>
		)
	}
}

export default ReviewsIndex;