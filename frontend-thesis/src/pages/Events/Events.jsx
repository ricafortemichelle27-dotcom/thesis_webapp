import Notification from '../../components/Notification/Notification.jsx';
﻿import { useState, useEffect } from "react";

import {
    FontAwesomeIcon,
    faMagnifyingGlass,
    faCircleCheck,
    faXmark,
    faTrash,
    faPenToSquare,
    faEye,
    faFilePdf,
    faCalendarDays,
    faClock,
    faUserShield,
} from "../../utils/icons.js";

import { getCurrentUser } from "../../utils/cookiesUtils.js";
import AddEvent from "../../components/Modal/AddEvent/AddEvent.jsx";
import HistoryOfEvents from "../../components/Modal/HistoryOfEvents/HistoryOfEvents.jsx";
import ViewEventModal from "../../components/Modal/ViewEvent/ViewEvent.jsx";
import { apiBaseUrl, apiUrl } from "../../utils/api.js";

import "./Events.css";


function Events() {
    const user = getCurrentUser();
    const userRole = user?.role;

    /*
     * Support both possible role formats.
     *
     * system-admin  -> used by your current System Admin code
     * system_admin  -> commonly used by backend/database
     *
     * event-admin   -> Event Admin
     * event_admin   -> Event Admin
     */
    const isSystemAdmin =
        userRole === "system-admin" ||
        userRole === "system_admin";

    const isEventAdmin =
        userRole === "event-admin" ||
        userRole === "event_admin";


    /* =========================
       STATE
    ========================= */

    const [activeTab, setActiveTab] = useState(
        isSystemAdmin ? "pending" : "all"
    );

    const [searchTerm, setSearchTerm] = useState("");
    const [isAddEventOpen, setIsAddEventOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [viewEvent, setViewEvent] = useState(null);
    const [events, setEvents] = useState([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(true);
    const [eventsError, setEventsError] = useState("");
    const [successMessage, setSuccessMessage] = useState('');
    const [editingEvent, setEditingEvent] = useState(null);
    const [declineTargetEvent, setDeclineTargetEvent] = useState(null);
    const [declineReason, setDeclineReason] = useState("");
    const [declineError, setDeclineError] = useState("");


    /* =========================
       ACCESS CONTROL
    ========================= */

    if (!isSystemAdmin && !isEventAdmin) {
        return (
            <div className="event-management">
                <div className="access-denied">
                    <h2>Access Denied</h2>

                    <p>
                        You do not have permission to access
                        this page.
                    </p>

                    <p>
                        Please contact your administrator if
                        you need access.
                    </p>
                </div>
            </div>
        );
    }


    /* =========================
       SYSTEM ADMIN ACTIONS
    ========================= */

    const handleApprove = async (id) => {
        try {
            const response = await fetch(
                apiUrl(`/api/events/${id}/approve`),
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        requested_by_user_id: user?.id,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to approve event."
                );
            }

            await fetchEvents();
        } catch (error) {
            console.error(error);
            setEventsError(error.message || "Failed to approve event.");
        }
    };


    const handleDeclineClick = (event) => {
        setDeclineTargetEvent(event);
        setDeclineReason("");
        setDeclineError("");
    };

    const handleDeclineSubmit = async () => {
        if (!declineTargetEvent) {
            return;
        }

        const trimmedReason = declineReason.trim();

        if (!trimmedReason) {
            setDeclineError("Please provide a reason before declining this event.");
            return;
        }

        try {
            const response = await fetch(
                apiUrl(`/api/events/${declineTargetEvent.id}/decline`),
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        decline_reason: trimmedReason,
                        requested_by_user_id: user?.id,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to decline event."
                );
            }

            setDeclineTargetEvent(null);
            setDeclineReason("");
            setDeclineError("");
            setEventsError("");
            await fetchEvents();
        } catch (error) {
            console.error(error);
            setDeclineError(error.message || "Failed to decline event.");
        }
    };


    const handleDelete = async (id) => {
        try {
            const response = await fetch(
                apiUrl(`/api/events/${id}`),
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        requested_by_user_id: user?.id,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to delete event."
                );
            }

            await fetchEvents();
        } catch (error) {
            console.error(error);
            setEventsError(error.message || "Failed to delete event.");
        }
    };

    /* =========================
       EVENT ADMIN
       ONLY SHOW THEIR EVENTS
    ========================= */

    const currentAdminName =
        user?.fullname ||
        user?.name ||
        user?.fullName ||
        "Maria Santos";

    const allDepartmentsLabel = "All Departments";
    const allMajorProgramsLabel = "All Major/Programs";
    const allYearLevelsLabel = "All Year Levels";

    const formatDisplayTime = (timeValue) => {
        if (!timeValue) {
            return "—";
        }

        return typeof timeValue === "string"
            ? timeValue.trim()
            : timeValue;
    };

    const formatDisplayDate = (dateValue) => {
        if (!dateValue) {
            return "—";
        }

        const parsedDate = new Date(dateValue);

        if (Number.isNaN(parsedDate.getTime())) {
            return dateValue;
        }

        return parsedDate.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
        });
    };

    // Archive by Philippine calendar date, regardless of approval status.
    const [today, setToday] = useState(() => new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date()));

    useEffect(() => {
        const updateDay = () => setToday(new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
        }).format(new Date()));
        const timer = setInterval(updateDay, 30000);
        window.addEventListener('focus', updateDay);
        return () => { clearInterval(timer); window.removeEventListener('focus', updateDay); };
    }, []);

    const isPastEvent = (event) => {
        const date = event.eventDate || event.event_date;
        return Boolean(date && date.slice(0, 10) < today);
    };
    const isCurrentApprovedEvent = (event) => event.status === 'approved' && !isPastEvent(event);

    const summarizeEligibility = (eligibility = []) => {
        const departments = [
            ...new Set(
                eligibility
                    .map((item) => item.department)
                    .filter(Boolean)
            ),
        ];

        const majorPrograms = [
            ...new Set(
                eligibility
                    .map((item) => item.major_program)
                    .filter(Boolean)
            ),
        ];

        const yearLevels = [
            ...new Set(
                eligibility
                    .map((item) => item.year_level)
                    .filter(Boolean)
            ),
        ];

        return {
            department:
                departments.length > 0
                    ? departments.join(", ")
                    : "Multiple",
            majorProgram:
                majorPrograms.length > 0
                    ? majorPrograms.join(", ")
                    : "Multiple",
            yearLevel:
                yearLevels.length > 0
                    ? yearLevels.join(", ")
                    : "Multiple",
        };
    };

    const fetchEvents = async () => {
        try {
            setIsLoadingEvents(true);
            setEventsError("");

            const response = await fetch(apiUrl("/api/events"));
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to load events."
                );
            }

            const rawEvents = Array.isArray(data.events)
                ? data.events
                : [];

            const normalizedEvents = await Promise.all(
                rawEvents.map(async (event) => {
                    const eligibilityResponse = await fetch(
                        apiUrl(`/api/events/${event.id}/eligibility`)
                    );
                    const eligibilityData = await eligibilityResponse.json();
                    if (!eligibilityResponse.ok || !Array.isArray(eligibilityData.eligibility)) {
                        throw new Error(eligibilityData.message || 'Unable to load event eligibility.');
                    }
                    const eligibility = eligibilityData.eligibility;

                    const eligibilitySummary = summarizeEligibility(eligibility);

                    return {
                        ...event,
                        id: event.id,
                        eventAdminId: event.event_admin_id,
                        name: event.event_name || event.name || "Untitled Event",
                        admin: event.event_admin_name || event.admin || "Unknown Admin",
                        department: eligibilitySummary.department,
                        majorProgram: eligibilitySummary.majorProgram,
                        yearLevel: eligibilitySummary.yearLevel,
                        eventDate: event.event_date || event.date || "",
                        date: formatDisplayDate(event.event_date || event.date),
                        location: event.location || event.event_location || "—",
                        timeStart: event.time_start || event.timeIn || "",
                        timeIn: formatDisplayTime(event.time_start || event.timeIn),
                        timeEnd: event.time_end || event.timeOut || "",
                        timeOut: formatDisplayTime(event.time_end || event.timeOut),
                        letterOfApproval:
                            event.letter_of_approval || event.letterOfApproval || "—",
                        certificateTemplate:
                            event.certificate_template || event.certificateTemplate || "—",
                        status: event.status || event.event_status || "pending",
                        decline_reason: event.decline_reason || null,
                        eligibility,
                    };
                })
            );

            setEvents(normalizedEvents);
        } catch (error) {
            setEvents([]);
            setEventsError(
                error.message || "Unable to load events right now."
            );
        } finally {
            setIsLoadingEvents(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const historyEvents = events.filter((event) => {
        if (isEventAdmin) {
            const belongsToCurrentAdmin =
                Number(event.eventAdminId) === Number(user?.id) ||
                (!event.eventAdminId &&
                    event.admin.toLowerCase() === currentAdminName.toLowerCase());

            if (!belongsToCurrentAdmin) {
                return false;
            }
        }

        return isPastEvent(event);
    });

    const filteredEvents = events.filter((event) => {
        if (isPastEvent(event)) return false;
        if (isEventAdmin) {
            const belongsToCurrentAdmin =
                Number(event.eventAdminId) === Number(user?.id) ||
                (!event.eventAdminId &&
                    event.admin.toLowerCase() === currentAdminName.toLowerCase());

            if (!belongsToCurrentAdmin) {
                return false;
            }
        }

        if ((isSystemAdmin || isEventAdmin) && activeTab !== "all") {
            if (event.status !== activeTab) {
                return false;
            }

            if (activeTab === "approved" && !isCurrentApprovedEvent(event)) {
                return false;
            }
        }

        const search = searchTerm.toLowerCase().trim();

        if (!search) {
            return true;
        }

        return (
            event.name.toLowerCase().includes(search) ||
            event.department.toLowerCase().includes(search) ||
            event.majorProgram.toLowerCase().includes(search) ||
            event.yearLevel.toLowerCase().includes(search)
        );
    });


    /* =========================
       EVENT COUNTS
    ========================= */

    const activeEvents = events.filter((event) => !isPastEvent(event));
    const visibleEvents = isEventAdmin
        ? activeEvents.filter(
              (event) =>
                  Number(event.eventAdminId) === Number(user?.id) ||
                  (!event.eventAdminId &&
                      event.admin.toLowerCase() === currentAdminName.toLowerCase())
          )
        : activeEvents;

    const pendingCount = visibleEvents.filter(
        (event) => event.status === "pending"
    ).length;

    const approvedCount = visibleEvents.filter(
        (event) => isCurrentApprovedEvent(event)
    ).length;

    const declinedCount = visibleEvents.filter(
        (event) => event.status === "declined"
    ).length;


    /* =========================
       ADD EVENT
    ========================= */

    const handleAddEvent = () => {
        setEditingEvent(null);
        setIsAddEventOpen(true);
    };

    const handleEditEvent = (event) => {
        setEditingEvent(event);
        setIsAddEventOpen(true);
    };

    const buildEligibilityPayload = (eligibleParticipants = []) => {
        const rows = [];

        eligibleParticipants.forEach((entry) => {
            const department = entry.department || allDepartmentsLabel;
            const majorPrograms = Array.isArray(entry.majorPrograms) && entry.majorPrograms.length > 0
                ? entry.majorPrograms
                : [allMajorProgramsLabel];
            const yearLevels = Array.isArray(entry.yearLevels) && entry.yearLevels.length > 0
                ? entry.yearLevels
                : [allYearLevelsLabel];

            const majorProgramValues = majorPrograms.includes(allMajorProgramsLabel)
                ? [null]
                : majorPrograms;
            const yearLevelValues = yearLevels.includes(allYearLevelsLabel)
                ? [null]
                : yearLevels;

            majorProgramValues.forEach((major_program) => {
                yearLevelValues.forEach((yearLevel) => {
                    rows.push({
                        department,
                        major_program,
                        year_level: yearLevel,
                    });
                });
            });
        });

        return rows;
    };

    const handleCreateEvent = async (eventData, existingEvent = null) => {
        const formatTime = ({ hour, minute, period }) => {
            const hourValue = Number(hour);
            let normalizedHour = hourValue;

            if (period === "AM" && hourValue === 12) {
                normalizedHour = 0;
            } else if (period === "PM" && hourValue < 12) {
                normalizedHour = hourValue + 12;
            }

            return `${String(normalizedHour).padStart(2, "0")}:${minute}:00`;
        };

        const userId = user?.id;

        if (!userId) {
            throw new Error("Current user information is missing.");
        }

        const formData = new FormData();

        formData.append("event_name", eventData.eventName.trim());
        formData.append("event_admin_id", String(userId));
        formData.append("requested_by_user_id", String(userId));
        formData.append("event_date", eventData.date);
        formData.append("location", eventData.location);
        formData.append("time_start", formatTime(eventData.time.starts));
        formData.append("time_end", formatTime(eventData.time.ends));
        formData.append(
            "eligibility",
            JSON.stringify(buildEligibilityPayload(eventData.eligibleParticipants))
        );
        formData.append("status", existingEvent?.status || "pending");
        formData.append(
            "decline_reason",
            existingEvent?.decline_reason || ""
        );

        if (eventData.letterOfApproval instanceof File) {
            formData.append("letter_of_approval", eventData.letterOfApproval);
        } else if (existingEvent?.letterOfApproval) {
            formData.append("letter_of_approval", existingEvent.letterOfApproval);
        }

        if (eventData.certificateTemplate instanceof File) {
            formData.append("certificate_template", eventData.certificateTemplate);
        } else if (existingEvent?.certificateTemplate) {
            formData.append("certificate_template", existingEvent.certificateTemplate);
        }

        const requestUrl = existingEvent
            ? apiUrl(`/api/events/${existingEvent.id}`)
            : apiUrl("/api/events");

        const response = await fetch(requestUrl, {
            method: existingEvent ? "PUT" : "POST",
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to save event."
            );
        }

        setEditingEvent(null);
        setIsAddEventOpen(false);
        setSuccessMessage(existingEvent ? 'Event updated Successfully' : 'Event Added Successfully');
        void fetchEvents();
        setActiveTab(isSystemAdmin ? "pending" : "all");

        return data;
    };


    /* =========================
       VIEW PDF
    ========================= */

    const handleViewPDF = (fileName) => {
        if (!fileName || fileName === "—") {
            setEventsError("No PDF file is available for this event.");
            return;
        }

        const fileUrl = fileName.startsWith("http")
            ? fileName
            : `${apiBaseUrl}${fileName.startsWith("/") ? "" : "/uploads/"}${fileName}`;

        window.open(fileUrl, "_blank", "noopener,noreferrer");
    };


    /* =========================
       VIEW EVENT
    ========================= */

    const handleViewEvent = async (event) => {
        setSuccessMessage('');
        try {
            const response = await fetch(apiUrl(`/api/events/${event.id}`));
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Unable to load event.');
            setViewEvent(data.event);
        } catch (error) {
            setEventsError(error.message);
        }
    };

    const handleSaveKioskSettings = async (eventId, formData) => {
        const userId = user?.id || user?.user_id;
        if (!userId) throw new Error('Current user information is missing.');
        formData.append('requested_by_user_id', String(userId));
        const response = await fetch(apiUrl(`/api/events/${eventId}/configuration`), {
            method: 'PUT', body: formData,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to save event configuration.');
        setViewEvent(null);
        setSuccessMessage('Kiosk Settings is saved Successfully');
        await fetchEvents();
        return data.event;
    };


    return (
        <div className="event-management">

            <Notification message={successMessage} onDismiss={() => setSuccessMessage('')} />

            {eventsError && (
                <div className="event-error-banner">
                    {eventsError}
                </div>
            )}


            {/* =========================
                SYSTEM ADMIN STATISTICS
            ========================= */}

            {isSystemAdmin && (
                <div className="event-statistics">

                    <div className="event-stat-card pending-stat">

                        <div className="stat-icon">
                            <FontAwesomeIcon icon={faClock} />
                        </div>

                        <div>
                            <span className="stat-label">
                                Pending
                            </span>

                            <strong>
                                {pendingCount}
                            </strong>
                        </div>

                    </div>


                    <div className="event-stat-card approved-stat">

                        <div className="stat-icon">
                            <FontAwesomeIcon icon={faCircleCheck} />
                        </div>

                        <div>
                            <span className="stat-label">
                                Approved
                            </span>

                            <strong>
                                {approvedCount}
                            </strong>
                        </div>

                    </div>


                    <div className="event-stat-card deleted-stat">

                        <div className="stat-icon">
                            <FontAwesomeIcon icon={faTrash} />
                        </div>

                        <div>
                            <span className="stat-label">
                                Declined
                            </span>

                            <strong>
                                {declinedCount}
                            </strong>
                        </div>

                    </div>

                </div>
            )}


            {/* =========================
                MAIN EVENT CARD
            ========================= */}

            <div className="event-card">


                {/* =========================
                    SYSTEM ADMIN TOOLBAR
                ========================= */}

                {isSystemAdmin && (
                    <div className="event-toolbar">

                        <div className="event-tabs">

                            <button
                                type="button"
                                className={`event-tab ${
                                    activeTab === "pending"
                                        ? "active"
                                        : ""
                                }`}
                                onClick={() =>
                                    setActiveTab("pending")
                                }
                            >
                                Pending

                                <span className="tab-count">
                                    {pendingCount}
                                </span>
                            </button>


                            <button
                                type="button"
                                className={`event-tab ${
                                    activeTab === "approved"
                                        ? "active"
                                        : ""
                                }`}
                                onClick={() =>
                                    setActiveTab("approved")
                                }
                            >
                                Approved

                                <span className="tab-count">
                                    {approvedCount}
                                </span>
                            </button>


                            <button
                                type="button"
                                className={`event-tab ${
                                    activeTab === "declined"
                                        ? "active"
                                        : ""
                                }`}
                                onClick={() =>
                                    setActiveTab("declined")
                                }
                            >
                                Declined

                                <span className="tab-count">
                                    {declinedCount}
                                </span>
                            </button>


                        </div>


                        <div className="event-toolbar-actions">
                            <div className="event-search">

                                <FontAwesomeIcon icon={faMagnifyingGlass} />

                                <input
                                    type="text"
                                    placeholder="Search events or admin..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(
                                            e.target.value
                                        )
                                    }
                                />

                            </div>

                            <button
                                type="button"
                                className="history-btn"
                                onClick={() => setIsHistoryOpen(true)}
                            >
                                <span aria-hidden="true">⏱</span>
                                History
                            </button>
                        </div>

                    </div>
                )}


                {/* =========================
                    EVENT ADMIN TOOLBAR
                ========================= */}

                {isEventAdmin && (
                    <div className="event-toolbar event-admin-toolbar">

                        <div className="event-tabs">

                            <button
                                type="button"
                                className={`event-tab ${
                                    activeTab === "all"
                                        ? "active"
                                        : ""
                                }`}
                                onClick={() =>
                                    setActiveTab("all")
                                }
                            >
                                All

                                <span className="tab-count">
                                    {visibleEvents.length}
                                </span>
                            </button>

                            <button
                                type="button"
                                className={`event-tab ${
                                    activeTab === "pending"
                                        ? "active"
                                        : ""
                                }`}
                                onClick={() => setActiveTab("pending")}
                            >
                                Pending

                                <span className="tab-count">
                                    {pendingCount}
                                </span>
                            </button>

                            <button
                                type="button"
                                className={`event-tab ${
                                    activeTab === "approved"
                                        ? "active"
                                        : ""
                                }`}
                                onClick={() => setActiveTab("approved")}
                            >
                                Approved

                                <span className="tab-count">
                                    {approvedCount}
                                </span>
                            </button>

                            <button
                                type="button"
                                className={`event-tab ${
                                    activeTab === "declined"
                                        ? "active"
                                        : ""
                                }`}
                                onClick={() => setActiveTab("declined")}
                            >
                                Declined

                                <span className="tab-count">
                                    {declinedCount}
                                </span>
                            </button>

                        </div>


                        <div className="event-toolbar-actions">

                            <div className="event-search">

                                <FontAwesomeIcon icon={faMagnifyingGlass} />

                                <input
                                    type="text"
                                    placeholder="Search your events..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(
                                            e.target.value
                                        )
                                    }
                                />

                            </div>

                            <button
                                type="button"
                                className="add-event-btn"
                                onClick={handleAddEvent}
                            >
                                <span aria-hidden="true">+</span>
                                Add Event
                            </button>

                            <button
                                type="button"
                                className="history-btn history-btn-gold"
                                onClick={() => setIsHistoryOpen(true)}
                            >
                                <span aria-hidden="true">⏱</span>
                                History
                            </button>

                        </div>

                    </div>
                )}


                {/* =========================
                    TABLE
                ========================= */}

                <div className="event-table-wrapper">

                    <table className="event-table">

                        <thead>

                            <tr>

                                <th>Event</th>


                                {/* SYSTEM ADMIN ONLY */}

                                {isSystemAdmin && (
                                    <th>Event Admin</th>
                                )}


                                <th>
                                    Eligible Participants
                                </th>

                                <th>Time Start-End</th>

                                <th>Location</th>

                                <th>Letter of Approval</th>

                                <th>Certificate Template</th>


                                {/* SYSTEM ADMIN ONLY */}

                                {(isSystemAdmin || isEventAdmin) && (
                                    <th>Actions</th>
                                )}

                            </tr>

                        </thead>


                        <tbody>

                            {isLoadingEvents ? (

                                <tr>

                                    <td
                                        colSpan={
                                            isSystemAdmin
                                                ? 8
                                                : 7
                                        }
                                        className="no-events"
                                    >

                                        <div className="empty-state">

                                            <div className="empty-icon">

                                                <FontAwesomeIcon
                                                    icon={
                                                        faCalendarDays
                                                    }
                                                />

                                            </div>

                                            <h3>
                                                Loading events...
                                            </h3>

                                            <p>
                                                Please wait while the
                                                event list is being
                                                refreshed.
                                            </p>

                                        </div>

                                    </td>

                                </tr>

                            ) : filteredEvents.length > 0 ? (

                                filteredEvents.map((event) => (

                                    <tr key={event.id}>

                                        {/* =====================
                                            EVENT
                                        ===================== */}

                                        <td>

                                            <div className="event-name-cell">

                                                <div className="event-icon">

                                                    <FontAwesomeIcon
                                                        icon={
                                                            faCalendarDays
                                                        }
                                                    />

                                                </div>


                                                <div>

                                                    <strong>
                                                        {event.name}
                                                    </strong>

                                                    <span>
                                                        Event #
                                                        {event.id}
                                                    </span>

                                                    <span
                                                        className={`status-badge ${event.status}`}
                                                    >
                                                        {event.status
                                                            .charAt(0)
                                                            .toUpperCase() +
                                                            event.status.slice(
                                                                1
                                                            )}
                                                    </span>

                                                    {event.status === "declined" &&
                                                        event.decline_reason && (
                                                            <span className="status-detail">
                                                                Reason: {event.decline_reason}
                                                            </span>
                                                        )}

                                                </div>

                                            </div>

                                        </td>


                                        {/* =====================
                                            EVENT ADMIN
                                            SYSTEM ADMIN ONLY
                                        ===================== */}

                                        {isSystemAdmin && (
                                            <td>

                                                <div className="admin-cell">

                                                    <div className="admin-icon">

                                                        <FontAwesomeIcon
                                                            icon={faUserShield}
                                                        />

                                                    </div>

                                                    <span>
                                                        {event.admin}
                                                    </span>

                                                </div>

                                            </td>
                                        )}


                                        {/* =====================
                                            ELIGIBLE PARTICIPANTS
                                        ===================== */}

                                        <td>

                                            <div className="participant-details">

                                                <strong>
                                                    Department
                                                </strong>

                                                <span>
                                                    {
                                                        event.department
                                                    }
                                                </span>


                                                <strong>
                                                    Major/Program
                                                </strong>

                                                <span>
                                                    {event.majorProgram}
                                                </span>


                                                <strong>
                                                    Year Level
                                                </strong>

                                                <span>
                                                    {event.yearLevel}
                                                </span>

                                            </div>

                                        </td>


                                        {/* =====================
                                            DATE AND TIME
                                        ===================== */}

                                        <td>

                                            <div className="date-time">

                                                <strong>
                                                    {event.date}
                                                </strong>

                                                <span>
                                                    {event.timeIn}
                                                    {" - "}
                                                    {event.timeOut}
                                                </span>

                                            </div>

                                        </td>


                                        {/* =====================
                                            LOCATION
                                        ===================== */}

                                        <td>
                                            {event.location}
                                        </td>


                                        {/* =====================
                                            LETTER OF APPROVAL
                                        ===================== */}

                                        <td>

                                            <button
                                                type="button"
                                                className="pdf-btn"
                                                onClick={() =>
                                                    handleViewPDF(
                                                        event.letterOfApproval
                                                    )
                                                }
                                            >

                                                <FontAwesomeIcon
                                                    icon={faFilePdf}
                                                />

                                                <span>
                                                    View PDF
                                                </span>

                                            </button>

                                        </td>


                                        {/* =====================
                                            CERTIFICATE TEMPLATE
                                        ===================== */}

                                        <td>

                                            <button
                                                type="button"
                                                className="pdf-btn"
                                                onClick={() =>
                                                    handleViewPDF(
                                                        event.certificateTemplate
                                                    )
                                                }
                                            >

                                                <FontAwesomeIcon
                                                    icon={faFilePdf}
                                                />

                                                <span>
                                                    View PDF
                                                </span>

                                            </button>

                                        </td>


                                        {/* =====================
                                            SYSTEM ADMIN ACTIONS
                                        ===================== */}

                                        {(isSystemAdmin || isEventAdmin) && (

                                            <td>

                                                <div className="event-actions">

                                                    {!isEventAdmin && event.status !==
                                                        "deleted" && (

                                                        <button
                                                            type="button"
                                                            className="view-btn"
                                                            aria-label="View Event"

                                                            title="View Event"
                                                            onClick={() =>
                                                                handleViewEvent(event)
                                                            }
                                                        >

                                                            <FontAwesomeIcon
                                                                icon={
                                                                    faEye
                                                                }
                                                            />

                                                        </button>

                                                    )}


                                                    {isSystemAdmin && event.status === "pending" && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                className="approve-btn review-action-btn"
                                                                aria-label="Approve Event"
                                                                title="Approve Event"
                                                                onClick={() => handleApprove(event.id)}
                                                            >
                                                                <FontAwesomeIcon icon={faCircleCheck} />
                                                                <span>Approve</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="delete-btn review-action-btn"
                                                                aria-label="Decline Event"
                                                                title="Decline Event"
                                                                onClick={() => handleDeclineClick(event)}
                                                            >
                                                                <FontAwesomeIcon icon={faXmark} />
                                                                <span>Decline</span>
                                                            </button>
                                                        </>
                                                    )}

                                                   {/* =========================
                                                        EVENT ADMIN ACTIONS
                                                    ========================= */}

                                                    {isEventAdmin && (
                                                        <>
                                                            {/* PENDING / DECLINED EVENTS */}
                                                            {(event.status === "pending" ||
                                                                event.status === "declined") && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        className="view-btn"
                                                                        aria-label="Edit Event"

                                                                        title="Edit Event"
                                                                        onClick={() => handleEditEvent(event)}
                                                                    >
                                                                        <FontAwesomeIcon icon={faPenToSquare} />
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        className="delete-btn"
                                                                        aria-label="Delete Event"

                                                                        title="Delete Event"
                                                                        onClick={() => handleDelete(event.id)}
                                                                    >
                                                                        <FontAwesomeIcon icon={faTrash} />
                                                                    </button>
                                                                </>
                                                            )}

                                                            {/* APPROVED EVENTS */}
                                                            {event.status === "approved" && (
                                                                <button
                                                                    type="button"
                                                                    className="view-btn"
                                                                    aria-label="View Event"

                                                                    title="View Event"
                                                                    onClick={() => handleViewEvent(event)}
                                                                >
                                                                    <FontAwesomeIcon icon={faEye} />                                                                </button>
                                                            )}
                                                        </>
                                                    )}

                                                </div>

                                            </td>

                                        )}

                                    </tr>

                                ))

                            ) : (

                                <tr>

                                    <td
                                        colSpan={
                                            isSystemAdmin
                                                ? 8
                                                : 7
                                        }
                                        className="no-events"
                                    >

                                        <div className="empty-state">

                                            <div className="empty-icon">

                                                <FontAwesomeIcon
                                                    icon={
                                                        faCalendarDays
                                                    }
                                                />

                                            </div>

                                            <h3>
                                                No events found
                                            </h3>

                                            <p>
                                                There are currently no
                                                events matching your
                                                search or filter.
                                            </p>

                                        </div>

                                    </td>

                                </tr>

                            )}

                        </tbody>

                    </table>

                </div>


                {/* =========================
                    FOOTER
                ========================= */}

                <div className="events-footer">

                    <span>
                        Showing {filteredEvents.length} of{" "}
                        {isEventAdmin
                            ? visibleEvents.length
                            : events.length}{" "}
                        events
                    </span>

                </div>

                <HistoryOfEvents
                    isOpen={isHistoryOpen}
                    onClose={() => setIsHistoryOpen(false)}
                    events={historyEvents}
                    isSystemAdmin={isSystemAdmin}
                />

                <AddEvent
                    isOpen={isAddEventOpen}
                    onClose={() => {
                        setIsAddEventOpen(false);
                        setEditingEvent(null);
                    }}
                    onCreate={handleCreateEvent}
                    existingEvent={editingEvent}
                />

                <ViewEventModal
                    key={viewEvent?.id || 'closed'}
                    isOpen={Boolean(viewEvent)}
                    event={viewEvent}
                    isEventAdmin={isEventAdmin}
                    onClose={() => setViewEvent(null)}
                    onSaveKioskSettings={handleSaveKioskSettings}
                />
            </div>

            {declineTargetEvent && (
                <div className="decline-modal-backdrop">
                    <div className="decline-modal" role="dialog" aria-modal="true" aria-labelledby="decline-modal-title">
                        <div className="decline-modal-header">
                            <h3 id="decline-modal-title">Decline Event</h3>
                        </div>

                        <p className="decline-modal-message">
                            Please provide a reason for declining "{declineTargetEvent.name}".
                        </p>

                        <label className="decline-modal-label" htmlFor="decline-reason">
                            Decline reason
                        </label>

                        <textarea
                            id="decline-reason"
                            required
                            autoFocus
                            aria-invalid={Boolean(declineError)}
                            className="decline-modal-input"
                            value={declineReason}
                            onChange={(e) => {
                                setDeclineReason(e.target.value);
                                setDeclineError("");
                            }}
                            placeholder="Enter the reason for declining this event"
                            rows={5}
                        />

                        {declineError && (
                            <p className="decline-modal-error">
                                {declineError}
                            </p>
                        )}

                        <div className="decline-modal-actions">
                            <button
                                type="button"
                                className="decline-modal-cancel"
                                onClick={() => {
                                    setDeclineTargetEvent(null);
                                    setDeclineReason("");
                                    setDeclineError("");
                                }}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="decline-modal-submit"
                                onClick={handleDeclineSubmit}
                            >
                                Decline Event
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


export default Events;
