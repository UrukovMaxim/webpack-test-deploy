import React, {Component} from 'React';
import Footer from 'Footer';

import './ReviewsIndex.scss';

class ReviewsIndex extends Component {
	constructor() {
		super();
	}

	render() {
		const {car} = this.props;

		return (
			<div className='ReviewsIndex'>
				Test widget from reviews index<br/>
				{NODE_ENV}
				{car}
				<Footer/>
			</div>
		)
	}
}

export default ReviewsIndex;