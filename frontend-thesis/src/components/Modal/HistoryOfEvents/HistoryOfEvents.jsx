import { useMemo, useState } from "react";

import {
    FontAwesomeIcon,
    faMagnifyingGlass,
    faClockRotateLeft,
    faCalendarCheck,
    faLocationDot,
    faUserShield,
} from "../../../utils/icons.js";

import "./HistoryOfEvents.css";

/**
 * History
 *
 * Read-only modal listing events that have already
 * taken place (event date is in the past).
 *
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - events: array of already-filtered historical events
 *             (each: { id, name, admin, date, timeIn, timeOut, location })
 *  - isSystemAdmin: boolean, shows the "Event Admin" column when true
 */
function History({ isOpen, onClose, events = [], isSystemAdmin = false }) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredEvents = useMemo(() => {
        const search = searchTerm.toLowerCase().trim();

        if (!search) {
            return events;
        }

        return events.filter((event) =>
            (event.name || "").toLowerCase().includes(search) ||
            (event.admin || "").toLowerCase().includes(search) ||
            (event.location || "").toLowerCase().includes(search)
        );
    }, [events, searchTerm]);

    if (!isOpen) {
        return null;
    }

    return (
        <div className="history-backdrop" onClick={onClose}>
            <div
                className="history-modal"
                onClick={(event) => event.stopPropagation()}
            >

                {/* ========================= HEADER ========================= */}

                <div className="history-header">

                    <div className="history-header-left">

                        <div className="history-header-icon">
                            <FontAwesomeIcon icon={faClockRotateLeft} />
                        </div>

                        <div>
                            <h3>Event History</h3>
                            <p>Events whose scheduled dates have passed.</p>
                        </div>

                    </div>

                    <button
                        type="button"
                        className="history-close-btn"
                        onClick={onClose}
                        aria-label="Close history"
                    >
                        ×
                    </button>

                </div>

                {/* ========================= TOOLBAR ========================= */}

                <div className="history-toolbar">

                    <div className="history-search">
                        <FontAwesomeIcon icon={faMagnifyingGlass} />

                        <input
                            type="text"
                            placeholder="Search past events..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <span className="history-count-pill">
                        {filteredEvents.length} event
                        {filteredEvents.length === 1 ? "" : "s"}
                    </span>

                </div>

                {/* ========================= CONTENT ========================= */}

                {filteredEvents.length > 0 ? (

                    <div className="history-table-wrapper">
                        <table className="history-table">

                            <thead>
                                <tr>
                                    <th>Event</th>
                                    {isSystemAdmin && <th>Event Admin</th>}
                                    <th>Date</th>
                                    <th>Time In</th>
                                    <th>Time Out</th>
                                    <th>Location</th>
                                    <th>Status</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredEvents.map((event) => (
                                    <tr key={`history-${event.id}`}>

                                        <td>
                                            <div className="history-event-cell">
                                                <div className="history-event-icon">
                                                    <FontAwesomeIcon icon={faCalendarCheck} />
                                                </div>

                                                <div>
                                                    <strong>{event.name}</strong>
                                                    <span>Event #{event.id}</span>
                                                </div>
                                            </div>
                                        </td>

                                        {isSystemAdmin && (
                                            <td>
                                                <div className="history-admin-cell">
                                                    <FontAwesomeIcon icon={faUserShield} />
                                                    <span>{event.admin}</span>
                                                </div>
                                            </td>
                                        )}

                                        <td>{event.date}</td>
                                        <td>{event.timeIn}</td>
                                        <td>{event.timeOut}</td>

                                        <td>
                                            <div className="history-location-cell">
                                                <FontAwesomeIcon icon={faLocationDot} />
                                                <span>{event.location}</span>
                                            </div>
                                        </td>

                                        <td>
                                            <span className="history-status-badge">
                                                {event.status === "approved" ? "Completed" : event.status === "declined" ? "Declined" : "Expired (not approved)"}
                                            </span>
                                        </td>

                                    </tr>
                                ))}
                            </tbody>

                        </table>
                    </div>

                ) : (

                    <div className="history-empty-state">
                        <div className="history-empty-icon">
                            <FontAwesomeIcon icon={faClockRotateLeft} />
                        </div>

                        <h4>No historical events</h4>
                        <p>
                            {searchTerm
                                ? "No past events match your search."
                                : "There are currently no events in the past."}
                        </p>
                    </div>

                )}

            </div>
        </div>
    );
}

export default History;