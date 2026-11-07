import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';

import EventFooter from '../../components/Events/EventFooter/EventFooter.jsx';
import EventHeader from '../../components/Events/EventHeader/EventHeader.jsx';
import { loadEventTheme, WIS_EVENT_THEME } from '../../utils/eventTheme.js';
import { assetUrl, getKioskData } from '../../utils/api.js';
import { formatEventDate, photoboothStatus } from '../../utils/eventData.js';
import "./EventLayout.css";
import wisBackground from '../../assets/images/school_img.png';

function EventLayout() {

    const location = useLocation();
    const navigate = useNavigate();

    const [, refreshColors] = useState(0);
    const selectedId = new URLSearchParams(location.search).get('eventId') || import.meta.env.VITE_EVENT_ID || '';
    const [loadedResult, setResult] = useState(null);
    const [revision, setRevision] = useState(0);
    const [now, setNow] = useState(Date.now);
    const [failedBackground, setFailedBackground] = useState('');
    const requestKey = selectedId + ':' + revision;
    const result = loadedResult?.key === requestKey ? loadedResult : { loading: true, event: null, events: [], error: '' };

    useEffect(() => {
        const controller = new AbortController();
        let active = true;
        const load = async () => {
            try {
                const data = await getKioskData(selectedId ? `/events/${encodeURIComponent(selectedId)}` : '/events', controller.signal);
                if (!active) return;
                if (selectedId && (!data.event || !Array.isArray(data.event.speakers) || !Array.isArray(data.event.eligibility))) {
                    throw new Error('The event server returned incomplete event information.');
                }
                if (!selectedId && !Array.isArray(data.events)) throw new Error('The event server returned an invalid event list.');
                setResult({ key: requestKey, loading: false, event: data.event || null, events: data.events || [], error: '' });
            } catch (error) {
                if (active && error.name !== 'AbortError') setResult({ key: requestKey, loading: false, event: null, events: [], error: error.message });
            }
        };
        load();
        return () => { active = false; controller.abort(); };
    }, [selectedId, requestKey]);

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        const refresh = () => setRevision((value) => value + 1);
        window.addEventListener('focus', refresh);
        return () => { clearInterval(interval); window.removeEventListener('focus', refresh); };
    }, []);

    useEffect(() => {
        const handleStorageChange = () => refreshColors((value) => value + 1);

        window.addEventListener('storage', handleStorageChange);

        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const activePage = location.pathname.split('/')[2] || 'home';
    // Do not display a previous event while a new selection is loading.
    const event = result.event && String(result.event.id) === String(selectedId) ? result.event : null;
    const palette = event?.kiosk_theme_mode === 'custom' ? loadEventTheme(selectedId) : WIS_EVENT_THEME;
    const logo = assetUrl(event?.event_logo);
    const background = event?.kiosk_theme_mode === 'custom' ? assetUrl(event.background_display_photo) : wisBackground;
    useEffect(() => {
        if (!background) return;
        const image = new Image();
        image.onerror = () => setFailedBackground(background);
        image.onload = () => setFailedBackground('');
        image.src = background;
        return () => { image.onerror = null; image.onload = null; };
    }, [background, revision]);
    const booth = photoboothStatus(event, now);
    const eventPath = (page = '') => `/event${page ? `/${page}` : ''}${selectedId ? `?eventId=${encodeURIComponent(selectedId)}` : ''}`;

    const handleNavigation = (page) => {
        navigate(eventPath(page === 'home' ? '' : page));
    };

    return (
        <div
            className={`event-layout ${event?.kiosk_theme_mode === 'custom' ? '' : 'event-layout-wis'} ${activePage === 'photobooth' ? 'event-layout-photobooth' : ''}`}
            style={{
                "--event-primary": palette.primaryColor,
                "--event-secondary": palette.secondaryColor,
                "--event-accent": palette.accentColor,
                "--event-text": palette.primaryColor,
                "--event-background-image": background
                    ? `url("${background}")`
                    : 'none',
                "--event-logo-image": logo
                    ? `url("${logo}")`
                    : 'none',
                "--event-logo-display": logo ? 'block' : 'none',
                "--event-logo-placeholder-display": 'none',
            }}
        >

            {/* =================================
                EVENT HEADER
            ================================== */}
            <EventHeader event={event} onMenuClick={() => navigate('/')} onRefresh={() => setRevision((value) => value + 1)} onChooseEvent={() => navigate('/event')} />


            {/* =================================
                EVENT MAIN CONTENT
            ================================== */}
            <main className="event-main-content">

                {background && failedBackground === background && <p className="event-asset-error" role="alert">The custom background image could not be loaded.</p>}

                {result.loading ? <p role="status">Loading event information…</p>
                    : result.error ? <section className="event-data-state" role="alert"><h1>Unable to load event</h1><p>{result.error}</p><button onClick={() => setRevision((value) => value + 1)}>Retry</button></section>
                    : event ? <Outlet context={{ event, eventPath, photobooth: booth }} />
                    : <section className="event-data-state"><h1>Select an event</h1>
                        {result.events.length ? result.events.map((item) => <button key={item.id} onClick={() => navigate(`/event?eventId=${item.id}`)}>
                            <strong>{item.event_name}</strong><span>{formatEventDate(item.event_date)} · {item.location || 'Location not provided'}</span>
                        </button>) : <p>No approved events are available.</p>}
                    </section>}

            </main>


            {/* =================================
                EVENT FOOTER
            ================================== */}
            {event && <EventFooter
                event={event}
                photobooth={booth}
                activePage={activePage}
                onNavigate={handleNavigation}
            />}

        </div>
    );
}

export default EventLayout;

