import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import './Information.css';
import { assetUrl } from '../../../utils/api.js';

const text = (value) => typeof value === 'string' ? value.trim() : '';

function SpeakerPortrait({ photo, name }) {
    const [filePreview, setFilePreview] = useState(null);
    const [failedSource, setFailedSource] = useState(null);
    useEffect(() => {
        if (!(photo instanceof Blob)) return;
        const reader = new FileReader();
        reader.onload = () => setFilePreview({ photo, url: reader.result });
        reader.readAsDataURL(photo);
        return () => {
            reader.onload = null;
            if (reader.readyState === FileReader.LOADING) reader.abort();
        };
    }, [photo]);
    const source = typeof photo === 'string' ? photo : filePreview?.photo === photo ? filePreview.url : '';
    const initials = name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('');
    return <div className="information-portrait">
        {source && source !== failedSource
            ? <img src={source} alt={name} loading="lazy" onError={() => setFailedSource(source)} />
            : <span>{source ? 'Photo unavailable' : initials}</span>}
    </div>;
}

// Accept the admin event shape through props, outlet context, or navigation state.
function Information({ event: suppliedEvent }) {
    const navigate = useNavigate();
    const { state } = useLocation();
    const context = useOutletContext();
    const event = suppliedEvent ?? context?.event ?? state?.event ?? {};
    const title = text(event.event_name) || text(event.eventName) || text(event.name);
    const description = text(event.event_description) || text(event.eventDescription);
    const speakerData = event.speakers ?? event.eventSpeakers;
    const speakers = Array.isArray(speakerData)
        ? speakerData.filter((speaker) => speaker && typeof speaker === 'object') : [];

    return <section className="event-information-page" aria-labelledby="information-title">
        <header className="information-hero">
            <p className="information-eyebrow">Discover the event</p>
            <h1 id="information-title">{title || 'Event information unavailable'}</h1>
            <p className="information-hero-caption">The ideas. The people. The inspiration.</p>
            <a className="information-speaker-link" href="#information-speakers">Meet the guest speakers <span aria-hidden="true">↗</span></a>
        </header>
        <section className="information-about" aria-labelledby="information-about-title">
            <p className="information-eyebrow">A closer look</p>
            <h2 id="information-about-title">About this event</h2>
            <p className="information-description">{description || 'No event description has been provided.'}</p>
        </section>
        <section id="information-speakers" className="information-speakers" aria-labelledby="information-speakers-title">
            <div className="information-section-heading">
                <div><p className="information-eyebrow">Meet the voices</p><h2 id="information-speakers-title">Guest speakers</h2></div>
                {speakers.length > 0 && <span className="information-count" aria-label={`${speakers.length} guest speakers`}>{String(speakers.length).padStart(2, '0')}</span>}
            </div>
            {speakers.length > 0 ? <ul className="information-speaker-list">
                {speakers.map((speaker, index) => {
                    const name = text(speaker.name) || `Guest speaker ${index + 1}`;
                    return <li className="information-speaker-card" key={speaker.id ?? index}>
                        <SpeakerPortrait photo={assetUrl(speaker.photo)} name={name} />
                        <div className="information-speaker-copy">
                            <p className="information-eyebrow">In the spotlight · {String(index + 1).padStart(2, '0')}</p>
                            <h3>{name}</h3>
                            {text(speaker.role) && <p className="information-speaker-role">{speaker.role}</p>}
                            <p className="information-speaker-description">{text(speaker.description) || 'No speaker description has been provided.'}</p>
                        </div>
                    </li>;
                })}
            </ul> : <div className="information-empty">
                <span className="information-empty-symbol" aria-hidden="true">✦</span>
                <h3>No speakers have been added.</h3>
            </div>}
        </section>
        <button className="information-back" type="button" onClick={() => navigate(context?.eventPath?.() || '/event')}><span aria-hidden="true">←</span> Back to event home</button>
    </section>;
}

export default Information;
