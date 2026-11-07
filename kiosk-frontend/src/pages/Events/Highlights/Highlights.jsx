import { useNavigate, useOutletContext } from 'react-router-dom';

import './Highlights.css';

function Highlights() {
	const navigate = useNavigate();
    const { eventPath } = useOutletContext();

	return (
		<section className="event-highlights-page">
			<p className="event-page-kicker">Highlights</p>
			<h1>Event Highlights</h1>
			<p>Photos and memorable moments will appear here.</p>
			<button type="button" onClick={() => navigate(eventPath())}>
				Back to Event Home
			</button>
		</section>
	);
}

export default Highlights;
