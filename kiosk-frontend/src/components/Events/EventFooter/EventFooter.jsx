
import { useState } from "react";
import "./EventFooter.css";

function EventFooter({ activePage, onNavigate, event, photobooth }) {
    const [isRetracted, setIsRetracted] = useState(false);

    const handleNavigation = (page) => {
        onNavigate(page);
        setIsRetracted(false);
    };

    return (
        <>
        <footer aria-label={`${event.event_name} navigation`} className={`event-footer ${isRetracted ? "retracted" : ""}`}>

            {/* HOME */}
            <button
                className={`event-footer-button ${
                    activePage === "home" ? "active" : ""
                }`}
                onClick={() => handleNavigation("home")}
            >
                <span className="event-footer-icon" aria-hidden="true">⌂</span>

                <span className="event-footer-label">
                    Home
                </span>
            </button>


            {/* INFORMATION */}
            <button
                className={`event-footer-button ${
                    activePage === "information" ? "active" : ""
                }`}
                onClick={() => handleNavigation("information")}
            >
                <span className="event-footer-icon" aria-hidden="true">ⓘ</span>

                <span className="event-footer-label">
                    Information
                </span>
            </button>


            {/* PHOTOBOOTH */}
            <button
                className={`event-footer-button ${
                    activePage === "photobooth" ? "active" : ""
                }`}
                onClick={() => handleNavigation("photobooth")}
                title={photobooth.message}
            >
                <span className="event-footer-icon" aria-hidden="true">▣</span>

                <span className="event-footer-label">
                    Photobooth
                </span>
            </button>


            {/* HIGHLIGHTS */}
            <button
                className={`event-footer-button ${
                    activePage === "highlights" ? "active" : ""
                }`}
                onClick={() => handleNavigation("highlights")}
            >
                <span className="event-footer-icon" aria-hidden="true">★</span>

                <span className="event-footer-label">
                    Highlights
                </span>
            </button>

            <button
                className="event-footer-collapse"
                type="button"
                onClick={() => setIsRetracted(true)}
                aria-label="Hide event footer"
            >
                <span className="footer-collapse-arrow"></span>
            </button>
        </footer>

        {isRetracted && (
            <button
                className="event-footer-reveal"
                type="button"
                onClick={() => setIsRetracted(false)}
                aria-label="Show event footer"
            >
                <span className="footer-reveal-arrow"></span>
            </button>
        )}
        </>
    );
}

export default EventFooter;

