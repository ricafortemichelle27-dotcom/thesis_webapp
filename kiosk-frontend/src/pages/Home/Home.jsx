
import './Home.css';

import { useEffect, useState } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import { assetUrl, getKioskData } from '../../utils/api.js';


function EventDashboard() {

    const navigate = useNavigate();

    const [state, setState] = useState({ events: [], loading: true, error: '' });

    const [search, setSearch] = useState('');
    const [now, setNow] = useState(Date.now);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 30000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {

        const controller = new AbortController();

        getKioskData('/events', controller.signal).then((data) => {

            if (!Array.isArray(data.events)) {
                throw new Error('Invalid event list from server.');
            }

            setState({
                events: data.events,
                loading: false,
                error: ''
            });

        }).catch((error) => {

            if (error.name !== 'AbortError') {
                setState({
                    events: [],
                    loading: false,
                    error: error.message
                });
            }

        });

        return () => controller.abort();

    }, []);

    const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila'
    }).format(new Date(now));

    // Event schedules use Philippine time, including on differently configured devices.
    const startsAt = (event) => Date.parse(`${event.event_date}T${event.time_start}+08:00`);

    const matches = (event) =>
        event.event_name.toLowerCase().includes(search.toLowerCase());

    const todaysEvents = state.events.filter(
        (event) =>
            event.event_date === today &&
            matches(event)
    );

    const upcomingEvents = state.events
        .filter(
            (event) =>
                startsAt(event) > now &&
                matches(event)
        )
        .sort(
            (a, b) =>
                startsAt(a) - startsAt(b)
        );

    const eventLink = (event) =>
        `/event?eventId=${event.id}`;

    return (

        <section className="event-dashboard">

            {/* WELCOME + SEARCH */}

            <div className="dashboard-topline">

                <div>
                    <p className="welcome-label">
                        Welcome!
                    </p>

                    <h1>
                        WESTMEDIANS!
                    </h1>
                </div>

                <label className="dashboard-search">

                    <span className="sr-only">
                        Search
                    </span>

                    <input
                        type="search"
                        placeholder="Search"
                        value={search}
                        onChange={(e) =>
                            setSearch(e.target.value)
                        }
                    />

                    <span aria-hidden="true">
                        &#9906;
                    </span>

                </label>

            </div>


            {/* TODAY'S EVENTS */}

            <div className="dashboard-panels">

                <section className="dashboard-panel">

                    <h2>
                        <span aria-hidden="true">
                            &#9745;
                        </span>

                        Today's Events
                    </h2>

                    {state.loading ? (

                        <p role="status">
                            Loading events…
                        </p>

                    ) : state.error ? (

                        <p role="alert">
                            {state.error}
                        </p>

                    ) : todaysEvents.length ? (

                        <div className="today-events">

                            {todaysEvents.map((event) => (

                                <Link
                                    className="today-event-card"
                                    to={eventLink(event)}
                                    key={event.id}
                                >

                                    <div className="event-logo-wrapper">

                                        {event.event_logo ? (

                                            <img
                                                src={assetUrl(event.event_logo)}
                                                alt={`${event.event_name} logo`}
                                                className="event-logo"
                                            />

                                        ) : (

                                            <div className="event-logo-placeholder">
                                                No Logo
                                            </div>

                                        )}

                                    </div>

                                    <strong>
                                        {event.event_name}
                                    </strong>

                                </Link>

                            ))}

                        </div>

                    ) : (

                        <p className="empty-message">
                            No events scheduled today
                        </p>

                    )}

                </section>

            </div>


            {/* UPCOMING EVENTS HEADING */}

            <div className="events-heading">

                <h2>
                    UPCOMING EVENTS
                </h2>

                <span />

                <button
                    type="button"
                    onClick={() => navigate('/event')}
                >
                    View all

                    <b aria-hidden="true">
                        &#8250;
                    </b>

                </button>

            </div>


            {/* UPCOMING EVENTS */}

            <div className="upcoming-events">

                {upcomingEvents.map((event) => (

                    <Link
                        className="event-tile"
                        to={eventLink(event)}
                        key={event.id}
                    >

                        <div className="event-logo-wrapper">

                            {event.event_logo ? (

                                <img
                                    src={assetUrl(event.event_logo)}
                                    alt={`${event.event_name} logo`}
                                    className="event-logo"
                                />

                            ) : (

                                <div className="event-logo-placeholder">
                                    No Logo
                                </div>

                            )}

                        </div>

                        <strong>
                            {event.event_name}
                        </strong>

                    </Link>

                ))}

                {!state.loading &&
                    !state.error &&
                    !upcomingEvents.length && (

                        <p className="empty-message">
                            No upcoming events
                        </p>

                    )}

            </div>


            {/* SCROLL BUTTONS */}

            <button
                className="scroll-cue scroll-cue-up"
                type="button"
                aria-label="Scroll up"
            >
                &#8963;
            </button>

            <button
                className="scroll-cue scroll-cue-down"
                type="button"
                aria-label="Scroll down"
            >
                &#8964;
            </button>

        </section>

    );

}

export default EventDashboard;
