import "./Dashboard.css";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { getCurrentUser } from "../../utils/cookiesUtils.js";

import {
    faCalendarAlt,
    faUsers,
    faCheckCircle,
    faUserGraduate,
    faPlus,
    faCertificate,
    faChartBar,
    faCog,
    faClipboardList,
    faArrowRight,
    faChartColumn,
    faUserCheck,
} from "@fortawesome/free-solid-svg-icons";

import AddEvent from "../../components/Modal/AddEvent/AddEvent.jsx";


/* =========================================================
   SAMPLE DATA
   Replace this later with data from your backend/database.
   ========================================================= */

const summary = [
    {
        id: 1,
        title: "Total Events",
        value: 12,
        status: "2 new this month",
        icon: faCalendarAlt,
        color: "#ffd6d6",
    },
    {
        id: 2,
        title: "Total Registrations",
        value: "1,248",
        status: "18% increase from last month",
        icon: faUsers,
        color: "#f5dede",
        systemAdminOnly: true,
    },
    {
        id: 3,
        title: "Total Attendees",
        value: "1,102",
        status: "15% increase from last month",
        icon: faCheckCircle,
        color: "#fff4dc",
    },
    {
        id: 4,
        title: "Active Event Admins",
        value: 8,
        status: "1 new admin this month",
        icon: faUserGraduate,
        color: "#f0e7ff",
        systemAdminOnly: true,
    },
];


/*
    expected = number of people expected/eligible to attend
    attendees = number who actually attended

    Later, these values should come from the database.
*/

const events = [
    {
        id: 1,
        name: "WIS Foundation Day",
        status: "Active",
        date: "December 10, 2026",
        registrations: 250,
        expectedAttendees: 300,
        attendees: 248,
        eventAdmin: "Maria Santos",
    },
    {
        id: 2,
        name: "Inter-School Debate",
        status: "Active",
        date: "December 15, 2026",
        registrations: 180,
        expectedAttendees: 220,
        attendees: 165,
        eventAdmin: "Maria Santos",
    },
    {
        id: 3,
        name: "Sportsfest 2026",
        status: "Upcoming",
        date: "January 10, 2027",
        registrations: 320,
        expectedAttendees: 400,
        attendees: 0,
        eventAdmin: "John Dela Cruz",
    },
    {
        id: 4,
        name: "Career Development Seminar",
        status: "Active",
        date: "November 25, 2026",
        registrations: 210,
        expectedAttendees: 250,
        attendees: 198,
        eventAdmin: "John Dela Cruz",
    },
    {
        id: 5,
        name: "Technology and Innovation Expo",
        status: "Active",
        date: "November 30, 2026",
        registrations: 280,
        expectedAttendees: 350,
        attendees: 267,
        eventAdmin: "Maria Santos",
    },
];


const activities = [
    {
        id: 1,
        text: "New event created: WIS Foundation Day",
        time: "2 hours ago",
    },
    {
        id: 2,
        text: "Attendance recorded for Inter-School Debate",
        time: "5 hours ago",
    },
    {
        id: 3,
        text: "Certificate template updated",
        time: "Yesterday",
    },
    {
        id: 4,
        text: "Monthly attendance report generated",
        time: "Yesterday",
    },
    {
        id: 5,
        text: "New Event Admin account created",
        time: "2 days ago",
    },
];


/* =========================================================
   DASHBOARD COMPONENT
   ========================================================= */

function Dashboard() {

    const navigate = useNavigate();

    const user = getCurrentUser();

    const userRole = user?.role;
    const [isAddEventOpen, setIsAddEventOpen] = useState(false);


    /* Support both role naming formats */
    const isSystemAdmin =
        userRole === "system-admin" ||
        userRole === "system_admin";

    const isEventAdmin =
        userRole === "event-admin" ||
        userRole === "event_admin";


    /* =====================================================
       ACCESS CONTROL
       ===================================================== */

    if (!isSystemAdmin && !isEventAdmin) {

        return (
            <div className="dashboard-page">

                <div className="access-denied">

                    <h2>Access Denied</h2>

                    <p>
                        You do not have permission to access this dashboard.
                    </p>

                    <p>
                        Please contact your administrator if you need access.
                    </p>

                </div>

            </div>
        );
    }


    /* =====================================================
       CURRENT DATE
       ===================================================== */

    const currentDate = new Date();

    const formattedDate = currentDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });

    const formattedDay = currentDate.toLocaleDateString("en-US", {
        weekday: "long",
    });


    /* =====================================================
       EVENT ADMIN FILTERING
       
       System Admin:
       → sees all events

       Event Admin:
       → only sees events assigned to them
       ===================================================== */

    const currentAdminName =
        user?.fullname ||
        user?.fullName ||
        user?.name ||
        "";


    const visibleEvents = isSystemAdmin
        ? events
        : events.filter(
              (event) =>
                  event.eventAdmin?.toLowerCase() ===
                  currentAdminName?.toLowerCase()
          );


    /* =====================================================
       ROLE-BASED SUMMARY CARDS
       ===================================================== */

    const visibleSummary = summary.filter(
        (item) => !item.systemAdminOnly || isSystemAdmin
    );


    /* =====================================================
       ROLE-BASED QUICK ACTIONS
       ===================================================== */

    const quickActions = isSystemAdmin
        ? [
              {
                  id: 1,
                  title: "Manage Events",
                  icon: faClipboardList,
              },
              {
                  id: 2,
                  title: "View Reports",
                  icon: faChartBar,
              },
              {
                  id: 3,
                  title: "System Settings",
                  icon: faCog,
              },
          ]
        : [
              {
                  id: 1,
                  title: "Create Event",
                  icon: faPlus,
              },
              {
                  id: 2,
                  title: "Manage Events",
                  icon: faClipboardList,
              },
              {
                  id: 3,
                  title: "Certificates",
                  icon: faCertificate,
              },
              {
                  id: 4,
                  title: "View Reports",
                  icon: faChartBar,
              },
          ];


    /* =====================================================
       ATTENDANCE STATISTICS
       ===================================================== */

    const totalExpected = visibleEvents.reduce(
        (total, event) => total + event.expectedAttendees,
        0
    );

    const totalAttendees = visibleEvents.reduce(
        (total, event) => total + event.attendees,
        0
    );

    const attendancePercentage =
        totalExpected > 0
            ? Math.round((totalAttendees / totalExpected) * 100)
            : 0;


    return (

        <div className="dashboard-page">

            {/* =================================================
                WELCOME HEADER
            ================================================= */}

            <div className="dashboard-welcome">

                <div>

                    <h2>
                        Welcome,{" "}
                        {isSystemAdmin
                            ? "System Administrator"
                            : "Event Administrator"}{" "}
                       ! 
                    </h2>

                    <p>
                        Here's an overview of the Westmead Event Management
                        System.
                    </p>

                </div>


                <div className="date-card">

                    <div className="date-icon">

                        <FontAwesomeIcon icon={faCalendarAlt} />

                    </div>

                    <div>

                        <div className="date-day">
                            {formattedDate}
                        </div>

                        <div className="date-week">
                            {formattedDay}
                        </div>

                    </div>

                </div>

            </div>


            {/* =================================================
                SUMMARY CARDS
            ================================================= */}

            <div className="summary-row">

                {visibleSummary.map((item) => (

                    <div
                        key={item.id}
                        className="stat-card"
                    >

                        <div
                            className="stat-icon"
                            style={{
                                background: item.color,
                            }}
                        >

                            <FontAwesomeIcon
                                icon={item.icon}
                            />

                        </div>


                        <div className="stat-body">

                            <div className="stat-title">
                                {item.title}
                            </div>

                            <div className="stat-value">
                                {item.value}
                            </div>

                            <div className="stat-status">
                                ↑ {item.status}
                            </div>

                        </div>

                    </div>

                ))}

            </div>


            {/* =================================================
                MAIN GRID
            ================================================= */}

            <div className="main-grid">


                {/* =================================================
                    ATTENDEES PER EVENT CHART
                ================================================= */}

                <div className="panel-card chart-card">

                    <div className="card-head">

                        <div>

                            <h3>
                                Attendees per Event
                            </h3>

                            <p className="chart-subtitle">
                                Actual attendance compared with expected
                                attendees
                            </p>

                        </div>

                        <div className="chart-summary">

                            <span>
                                <FontAwesomeIcon icon={faUserCheck} />
                                {attendancePercentage}% overall attendance
                            </span>

                        </div>

                    </div>


                    <div className="attendance-chart">

                        {visibleEvents.length > 0 ? (

                            visibleEvents.map((event) => {

                                const percentage =
                                    event.expectedAttendees > 0
                                        ? Math.min(
                                              Math.round(
                                                  (event.attendees /
                                                      event.expectedAttendees) *
                                                      100
                                              ),
                                              100
                                          )
                                        : 0;

                                return (

                                    <div
                                        key={event.id}
                                        className="attendance-event"
                                    >

                                        <div className="attendance-event-header">

                                            <div className="attendance-event-name">

                                                <FontAwesomeIcon
                                                    icon={faCalendarAlt}
                                                />

                                                <span>
                                                    {event.name}
                                                </span>

                                            </div>

                                            <strong>
                                                {event.attendees.toLocaleString()}
                                                /
                                                {event.expectedAttendees.toLocaleString()}
                                            </strong>

                                        </div>


                                        <div className="attendance-progress">

                                            <div
                                                className="attendance-progress-fill"
                                                style={{
                                                    width: `${percentage}%`,
                                                }}
                                            />

                                        </div>


                                        <div className="attendance-event-footer">

                                            <span>
                                                {percentage}% attendance
                                            </span>

                                            <span>
                                                {event.expectedAttendees -
                                                    event.attendees}{" "}
                                                remaining
                                            </span>

                                        </div>

                                    </div>

                                );

                            })

                        ) : (

                            <div className="empty-chart">

                                <FontAwesomeIcon
                                    icon={faChartColumn}
                                />

                                <h4>
                                    No assigned events yet
                                </h4>

                                <p>
                                    Events assigned to you will appear here.
                                </p>

                            </div>

                        )}

                    </div>

                </div>


                {/* =================================================
                    UPCOMING EVENTS
                ================================================= */}

                <div className="panel-card upcoming-card">

                    <div className="card-head">

                        <h3>
                            Upcoming Events
                        </h3>

                        <button
                            type="button"
                            className="view-all"
                            onClick={() => navigate("/events")}
                        >
                            View All{" "}
                            <FontAwesomeIcon icon={faArrowRight} />
                        </button>

                    </div>


                    <div className="events-list">

                        {visibleEvents.length > 0 ? (

                            visibleEvents
                                .slice(0, 4)
                                .map((event) => (

                                    <div
                                        key={event.id}
                                        className="event-item"
                                    >

                                        <div className="event-thumb">

                                            <FontAwesomeIcon
                                                icon={faCalendarAlt}
                                            />

                                        </div>


                                        <div className="event-body">

                                            <div className="event-name">
                                                {event.name}
                                            </div>

                                            <div className="event-meta">

                                                {event.date} •{" "}
                                                {event.expectedAttendees} expected

                                            </div>

                                        </div>


                                        <span
                                            className={`badge ${
                                                event.status === "Active"
                                                    ? "active"
                                                    : "upcoming"
                                            }`}
                                        >
                                            {event.status}
                                        </span>

                                    </div>

                                ))

                        ) : (

                            <div className="empty-events">

                                <FontAwesomeIcon
                                    icon={faCalendarAlt}
                                />

                                <p>
                                    No assigned events found.
                                </p>

                            </div>

                        )}

                    </div>

                </div>

            </div>


            {/* =================================================
                LOWER GRID
            ================================================= */}

            <div className="lower-grid">


                {/* =================================================
                    RECENT ACTIVITIES
                ================================================= */}

                <div className="panel-card activities-card">

                    <div className="card-head">

                        <h3>
                            Recent Activities
                        </h3>

                        <button
                            type="button"
                            className="view-all"
                        >
                            View All{" "}
                            <FontAwesomeIcon icon={faArrowRight} />
                        </button>

                    </div>


                    <div className="activities">

                        {activities.map((activity) => (

                            <div
                                key={activity.id}
                                className="activity-row"
                            >

                                <div className="act-dot" />

                                <div className="act-text">
                                    {activity.text}
                                </div>

                                <div className="act-time">
                                    {activity.time}
                                </div>

                            </div>

                        ))}

                    </div>

                </div>


                {/* =================================================
                    QUICK ACTIONS
                ================================================= */}

                <div className="panel-card quick-card">

                    <h3>
                        Quick Actions
                    </h3>

                    <p className="quick-subtitle">
                        Quickly access frequently used functions.
                    </p>


                    <div className="quick-grid">

                        {quickActions.map((action) => (

                            <button
                                key={action.id}
                                type="button"
                                className="quick"
                                onClick={() => {

                                    if (
                                        action.title === "Create Event"
                                    ) {
                                        setIsAddEventOpen(true);
                                    }

                                    if (action.title === "Manage Events") {
                                        navigate("/events");
                                    }

                                    if (
                                        action.title === "Certificates"
                                    ) {
                                        navigate(
                                            "/event-admin/certificates"
                                        );
                                    }

                                    if (
                                        action.title === "View Reports"
                                    ) {
                                        navigate(
                                            "/attendance-reports"
                                        );
                                    }

                                    if (
                                        action.title === "System Settings"
                                    ) {
                                        navigate(
                                            "/system-settings"
                                        );
                                    }

                                }}
                            >

                                <FontAwesomeIcon
                                    icon={action.icon}
                                />

                                <span>
                                    {action.title}
                                </span>

                            </button>

                        ))}

                    </div>

                </div>

            </div>

            <AddEvent
                isOpen={isAddEventOpen}
                onClose={() => setIsAddEventOpen(false)}
                onCreate={() => {
                    setIsAddEventOpen(false);
                    navigate("/events");
                }}
            />
        </div>
    );
}

export default Dashboard;