import { useState } from "react";
import { useOutletContext } from 'react-router-dom';
import { formatEventDate, formatEventTime } from '../../utils/eventData.js';

import {
    FontAwesomeIcon,
    faFingerprint,
    faRightToBracket,
    faRightFromBracket,
    faCalendarDays,
    faClock,
    faLocationDot,
    faCircleCheck,
    faTriangleExclamation,
} from "../../utils/icons.js";

import "./Attendance.css";

/**
 * AttendanceKiosk
 *
 * Student-facing check-in screen shown on the kiosk for a
 * single event. Presents a Log In (time in) and Log Out
 * (time out) action, each triggering a biometric scan.
 *
 * Props:
 *  - eventName: string
 *  - eventDate: string (already formatted, e.g. "March 14, 2026")
 *  - timeIn: string (e.g. "8:00 AM")
 *  - timeOut: string (e.g. "5:00 PM")
 *  - location: string
 *  - onLogIn: () => Promise<{ name: string }> | void
 *  - onLogOut: () => Promise<{ name: string }> | void
 */
function AttendanceKiosk({
    eventName: suppliedEventName,
    eventDate: suppliedEventDate,
    timeIn: suppliedTimeIn,
    timeOut: suppliedTimeOut,
    location: suppliedLocation,
    onLogIn,
    onLogOut,
}) {
    const event = useOutletContext()?.event;
    const eventName = suppliedEventName ?? event?.event_name ?? 'the event';
    const eventDate = suppliedEventDate ?? (event?.event_date ? formatEventDate(event.event_date) : undefined);
    const timeIn = suppliedTimeIn ?? (event?.time_start ? formatEventTime(event.time_start) : undefined);
    const timeOut = suppliedTimeOut ?? (event?.time_end ? formatEventTime(event.time_end) : undefined);
    const location = suppliedLocation ?? event?.location;
    // idle | scanning | success | error
    const [status, setStatus] = useState("idle");
    const [mode, setMode] = useState(null); // "in" | "out"
    const [feedback, setFeedback] = useState("");

    const runScan = async (type) => {
        setMode(type);
        setStatus("scanning");
        setFeedback("");

        try {
            const handler = type === "in" ? onLogIn : onLogOut;
            const result = handler ? await handler() : null;

            setStatus("success");

            setFeedback(
                result?.name
                    ? `Welcome, ${result.name}!`
                    : type === "in"
                        ? "Time in recorded successfully."
                        : "Time out recorded successfully."
            );
        } catch (error) {
            setStatus("error");

            setFeedback(
                error?.message ||
                "We couldn't read your biometric. Please try again."
            );
        }

        window.setTimeout(() => {
            setStatus("idle");
            setMode(null);
            setFeedback("");
        }, 3200);
    };

    return (
        <div className="kiosk-screen event-themed-attendance">

            {/* =========================
                ATTENDANCE CONTENT
            ========================= */}
            <div className="attendance-kiosk-content">

                {/* =========================
                    HEADER
                ========================= */}
                <div className="attendance-kiosk-header">

                    <div className="attendance-kiosk-header-icon">
                        <FontAwesomeIcon icon={faFingerprint} />
                    </div>

                    <h1>
                        Welcome! You are registering for{" "}
                        <span>{eventName}</span> attendance using biometrics.
                    </h1>

                    <p>
                        Please tap Log In when you arrive, or Log Out when
                        you leave, then scan your fingerprint to confirm.
                    </p>

                    {(eventDate || timeIn || timeOut || location) && (
                        <div className="kiosk-event-meta">

                            {eventDate && (
                                <span>
                                    <FontAwesomeIcon icon={faCalendarDays} />
                                    {eventDate}
                                </span>
                            )}

                            {(timeIn || timeOut) && (
                                <span>
                                    <FontAwesomeIcon icon={faClock} />
                                    {timeIn}
                                    {timeIn && timeOut ? " – " : ""}
                                    {timeOut}
                                </span>
                            )}

                            {location && (
                                <span>
                                    <FontAwesomeIcon icon={faLocationDot} />
                                    {location}
                                </span>
                            )}

                        </div>
                    )}

                </div>

                {/* =========================
                    SCAN PANEL
                ========================= */}
                {status !== "idle" && (
                    <div className="kiosk-panel">

                    {status === "scanning" && (
                        <div className="kiosk-scanning">

                            <div className="kiosk-scan-icon scanning">
                                <FontAwesomeIcon icon={faFingerprint} />
                            </div>

                            <p>
                                Scanning fingerprint for{" "}
                                {mode === "in" ? "log in" : "log out"}...
                            </p>

                        </div>
                    )}

                    {status === "success" && (
                        <div className="kiosk-result kiosk-result-success">

                            <FontAwesomeIcon icon={faCircleCheck} />

                            <p>{feedback}</p>

                        </div>
                    )}

                    {status === "error" && (
                        <div className="kiosk-result kiosk-result-error">

                            <FontAwesomeIcon icon={faTriangleExclamation} />

                            <p>{feedback}</p>

                        </div>
                    )}

                    </div>
                )}

                {/* =========================
                    ACTIONS
                ========================= */}
                <div className="kiosk-actions">

                    <button
                        type="button"
                        className="kiosk-btn kiosk-btn-login"
                        onClick={() => runScan("in")}
                        disabled={status === "scanning"}
                    >
                        <FontAwesomeIcon icon={faRightToBracket} />
                        Log In
                    </button>

                    <button
                        type="button"
                        className="kiosk-btn kiosk-btn-logout"
                        onClick={() => runScan("out")}
                        disabled={status === "scanning"}
                    >
                        <FontAwesomeIcon icon={faRightFromBracket} />
                        Log Out
                    </button>

                </div>

            </div>

            {status === "idle" && (
                <div className="scan-here-prompt" aria-label="Scan here at the fingerprint scanner below">
                    <span className="scan-here-label">SCAN HERE</span>
                    <span className="scan-here-caption">Fingerprint scanner</span>
                    <span className="scan-here-icon" aria-hidden="true">
                        <FontAwesomeIcon icon={faFingerprint} />
                    </span>
                    <span className="scan-here-arrow" aria-hidden="true" />
                </div>
            )}
        </div>
    );
}

export default AttendanceKiosk;
