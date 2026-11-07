import { useNavigate, useOutletContext } from "react-router-dom";
import "./WelcomePage.css";
import { formatEventDate, formatEventTime } from '../../../utils/eventData.js';
import { assetUrl } from '../../../utils/api.js';

function Welcome() {
    const navigate = useNavigate();

    const { event, eventPath } = useOutletContext();
    const formattedDate = formatEventDate(event.event_date);

    return (
        <div className="welcome-page">

            {/* =================================
                DECORATIVE BACKGROUND
            ================================== */}
            <div className="welcome-decoration welcome-decoration-top"></div>
            <div className="welcome-decoration welcome-decoration-bottom"></div>


            {/* =================================
                EVENT WELCOME CONTENT
            ================================== */}
            <main className="welcome-content">

                {/* Welcome Text */}
                <h1 className="welcome-title">
                    WELCOME TO
                </h1>


                {/* Event Name */}
                <h2 className="event-name">
                    {event.event_name}
                </h2>


                {/* =================================
                    EVENT LOGO
                ================================== */}
                {event.event_logo && <div className="event-logo-container">

                    <div
                        className="event-logo"
                        role="img"
                        aria-label="Event logo"
                    >
                        <img className="event-logo-image" src={assetUrl(event.event_logo)} alt="Event logo" />
                    </div>

                </div>}

                {/* =================================
                    EVENT INFORMATION
                ================================== */}
                <div className="event-information">

                    {/* DATE */}
                    <div className="event-info-item">

                        <div className="info-icon calendar-icon">
                            <span></span>
                        </div>

                        <div className="info-content">
                            <span className="info-label">
                                Date:
                            </span>

                            <span className="info-value">
                                {formattedDate}
                            </span>
                        </div>

                    </div>


                    {/* TIME */}
                    <div className="event-info-item">

                        <div className="info-icon clock-icon">
                            <span></span>
                        </div>

                        <div className="info-content">
                            <span className="info-label">
                                Time:
                            </span>

                            <span className="info-value">
                                {formatEventTime(event.time_start)} – {formatEventTime(event.time_end)}
                            </span>
                        </div>

                    </div>


                    {/* LOCATION */}
                    <div className="event-info-item">

                        <div className="info-icon location-icon">
                            <span></span>
                        </div>

                        <div className="info-content">
                            <span className="info-label">
                                Where:
                            </span>

                            <span className="info-value">
                                {event.location || 'Location not provided'}
                            </span>
                        </div>

                    </div>

                </div>


                {/* =================================
                    ACTION BUTTONS
                ================================== */}
                <div className="welcome-buttons">

                    {/* VIEW EVENT */}
                    <button
                        className="welcome-button view-event-button"
                        onClick={() => navigate(eventPath('information'))}
                    >

                        <span className="button-icon eye-icon">
                            <span></span>
                        </span>

                        <span>
                            View Event
                        </span>

                    </button>


                    {/* ATTENDANCE REGISTRATION */}
                    <button
                        className="welcome-button attendance-button"
                        onClick={() => navigate(eventPath('attendance'))}
                    >

                        <span className="button-icon person-icon">
                            <span></span>
                        </span>

                        <span>
                            Attendance
                            <br />
                            Registration
                        </span>

                    </button>

                </div>

            </main>

        </div>
    );
}

export default Welcome;
