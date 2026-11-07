import { useState } from "react";
import "./EventHeader.css";
import { assetUrl } from '../../../utils/api.js';

function EventHeader({ onMenuClick, event, onRefresh, onChooseEvent }) {
  const [isRetracted, setIsRetracted] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <header
        className={`event-header ${isRetracted ? "retracted" : ""}`}
      >
        {/* Hamburger Menu Button */}
        <button
          className="event-menu-button"
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-label="Open event menu"
          aria-expanded={isMenuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {event && <div className="event-header-identity">
          {event.event_logo && <img src={assetUrl(event.event_logo)} alt="Event logo" />}
          <span>{event.event_name}</span>
        </div>}
        {isMenuOpen && (
          <div className="event-header-menu">
            <button type="button" onClick={() => { setIsMenuOpen(false); onRefresh(); }}>Refresh event</button>
            {!import.meta.env.VITE_EVENT_ID && <button type="button" onClick={() => { setIsMenuOpen(false); onChooseEvent(); }}>Choose event</button>}
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                onMenuClick();
              }}
            >
              Go to Main Kiosk
            </button>
          </div>
        )}
      </header>

      {/* Reveal arrow */}
      {isRetracted && (
        <button
          className="event-header-reveal"
          type="button"
          onClick={() => setIsRetracted(false)}
          aria-label="Show header"
        >
          <span className="reveal-arrow"></span>
        </button>
      )}

      {!isRetracted && (
        <button
          className="event-header-collapse"
          type="button"
          onClick={() => setIsRetracted(true)}
          aria-label="Hide event header"
        >
          <span className="collapse-arrow"></span>
        </button>
      )}
    </>
  );
}

export default EventHeader;
