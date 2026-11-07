import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarDays, faUsers, faUserCheck, faUserShield,
  faClock, faLocationDot, faCircleCheck, faArrowRight,
  faPlus, faUserPlus, faCertificate, faFileCircleCheck,
  faUserClock, faBell
} from "@fortawesome/free-solid-svg-icons";

import "./Dashboard.css";
import { getCurrentUser } from "../../utils/cookiesUtils.js";
import { apiUrl } from "../../utils/api.js";

const Dashboard = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [events, setEvents] = useState([]);
  const [eventsError, setEventsError] = useState("");

  const isSystemAdmin =
    currentUser?.role === "system_admin" || currentUser?.role === "System Admin";
  const isEventAdmin =
    currentUser?.role === "event_admin" || currentUser?.role === "Event Admin";

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setEventsError("");
        const response = await fetch(apiUrl("/api/events"));
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load events.");
        }

        const backendEvents = Array.isArray(data.events) ? data.events : [];

        setEvents(backendEvents.map((event) => ({
          id: event.id,
          eventAdminId: event.event_admin_id,
          eventName: event.event_name || "Untitled Event",
          date: String(event.event_date || "").slice(0, 10),
          timeStart: event.time_start || "",
          timeEnd: event.time_end || "",
          time: [event.time_start, event.time_end].filter(Boolean).join(" - "),
          location: event.location || event.venue || "Location not set",
          status: event.status || event.event_status || "pending",
          eventAdmin: event.event_admin_name || "Unknown Admin",
          registrations: Number(event.registrations || 0),
          expectedAttendees: Number(event.expected_attendees || 0),
          attendees: Number(event.attendees || 0),
          certificates: Number(event.certificates || 0),
        })));
      } catch (error) {
        setEvents([]);
        setEventsError(error.message || "Unable to load events right now.");
      }
    };

    loadEvents();
  }, []);

  const recentActivities = [
    { id: 1, type: "attendance", title: "Student checked in", description: "A student was recorded through biometric attendance.", time: "5 minutes ago" },
    { id: 2, type: "certificate", title: "Certificate generated", description: "A certificate was generated for an attendee.", time: "18 minutes ago" },
    { id: 3, type: "approval", title: "Event approved", description: "WIS Foundation Day was approved.", time: "1 hour ago" },
    { id: 4, type: "event", title: "New event created", description: "A new event was added to the system.", time: "2 hours ago" },
  ];

  const pendingActions = isSystemAdmin
    ? [
        { id: 1, type: "approval", title: "Event approval required", description: "An event is waiting for your approval.", icon: faClock },
        { id: 2, type: "registration", title: "Registration review", description: "Review newly submitted registrations.", icon: faUserClock },
      ]
    : [
        { id: 1, type: "event", title: "Event information", description: "Review your pending or declined events.", icon: faCalendarDays },
        { id: 2, type: "certificate", title: "Certificate templates", description: "Check certificate templates for assigned events.", icon: faCertificate },
      ];

  const visibleEvents = useMemo(() => {
    if (!isEventAdmin) return events;

    return events.filter(
      (event) => Number(event.eventAdminId) === Number(currentUser?.id)
    );
  }, [currentUser, events, isEventAdmin]);

  const today = new Date();

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getEventDate = (event) => new Date(`${event.date}T00:00:00`);
  const getEventStart = (event) => new Date(`${event.date}T${event.timeStart || "00:00:00"}`);
  const getEventEnd = (event) => new Date(`${event.date}T${event.timeEnd || "23:59:59"}`);
  const approvedEvents = visibleEvents.filter(
    (event) => String(event.status).toLowerCase() === "approved"
  );
  const now = new Date();

  const upcomingEvents = [...approvedEvents]
    .filter((event) => getEventStart(event) > now)
    .sort((a, b) => getEventStart(a) - getEventStart(b));

  const eventHistory = [...approvedEvents]
    .filter((event) => getEventDate(event) < today)
    .filter((event) => getEventDate(event).getFullYear() === today.getFullYear())
    .sort((a, b) => getEventDate(b) - getEventDate(a));

  const currentEvent = approvedEvents.find(
    (event) => getEventStart(event) <= now && getEventEnd(event) >= now
  ) || null;

  const totalEvents = visibleEvents.length;
  const totalRegistrations = visibleEvents.reduce((sum, e) => sum + Number(e.registrations || 0), 0);
  const totalAttendees = visibleEvents.reduce((sum, e) => sum + Number(e.attendees || 0), 0);
  const activeEventAdmins = isSystemAdmin
    ? new Set(visibleEvents.map((e) => e.eventAdmin).filter(Boolean)).size
    : 0;

  const summaryCards = [
    { label: "Total Events", value: totalEvents, icon: faCalendarDays },
    ...(isSystemAdmin ? [{ label: "Total Registrations", value: totalRegistrations, icon: faUsers }] : []),
    { label: "Total Attendees", value: totalAttendees, icon: faUserCheck },
    ...(isSystemAdmin ? [{ label: "Active Event Admins", value: activeEventAdmins, icon: faUserShield }] : []),
  ];

  const pendingRegistrations = 0;
  const studentsRegisteredToday = 0;

  const activityIcon = (type) => {
    if (type === "attendance") return faUserCheck;
    if (type === "certificate") return faCertificate;
    if (type === "approval") return faCircleCheck;
    return faCalendarDays;
  };

  return (
    <div className="dashboard-page">
      {eventsError && <div className="dashboard-error-banner">{eventsError}</div>}

      <div className="dashboard-content">
        <header className="dashboard-welcome">
          <div>
            <p className="dashboard-eyebrow">
              {isSystemAdmin ? "SYSTEM ADMINISTRATION" : "EVENT ADMINISTRATION"}
            </p>
            <h1>Welcome back{currentUser?.name ? `, ${currentUser.name}` : ""}!</h1>
            <p>
              Monitor events, attendance, registrations, and important
              <br />
              system activities from one place.
            </p>
          </div>

          <div className="dashboard-date">
            <FontAwesomeIcon icon={faCalendarDays} />
            <span>
              {today.toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric", year: "numeric",
              })}
            </span>
          </div>
        </header>

        {/* TOP STATISTICS */}
        <section className="dashboard-summary">
          {summaryCards.map((card) => (
            <div className="summary-card" key={card.label}>
              <div className="summary-icon"><FontAwesomeIcon icon={card.icon} /></div>
              <div className="summary-details">
                <span>{card.label}</span>
                <strong>{card.value.toLocaleString()}</strong>
              </div>
            </div>
          ))}
        </section>

        {/* SYSTEM ADMIN REGISTRATION INFORMATION */}
        {isSystemAdmin && (
          <section className="dashboard-section">
            <div className="section-heading">
              <div>
                <p className="section-kicker">REGISTRATION OVERVIEW</p>
                <h2>Registration Information</h2>
              </div>
            </div>

            <div className="registration-cards">
              <div className="registration-info-card">
                <div className="registration-info-icon"><FontAwesomeIcon icon={faUserClock} /></div>
                <div>
                  <span>Pending Approvals</span>
                  <strong>{pendingRegistrations}</strong>
                  <small>Registrations waiting for review</small>
                </div>
              </div>

              <div className="registration-info-card">
                <div className="registration-info-icon"><FontAwesomeIcon icon={faUserPlus} /></div>
                <div>
                  <span>Students Registered Today</span>
                  <strong>{studentsRegisteredToday}</strong>
                  <small>New student registrations today</small>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* EVENT INFORMATION */}
        <section className="dashboard-section">
          <div className="section-heading">
            <div>
              <p className="section-kicker">EVENT INFORMATION</p>
              <h2>Event Information</h2>
            </div>
          </div>

          <div className="event-dashboard-layout">
            <main className="event-main-column">

              {/* CURRENT EVENT */}
              <section className="dashboard-panel current-event-card">
                <div className="panel-heading">
                  <div>
                    <p className="section-kicker">LIVE MONITORING</p>
                    <h3>Current Event</h3>
                  </div>
                  {currentEvent && (
                    <span className="live-badge"><span className="live-dot" />LIVE NOW</span>
                  )}
                </div>

                {currentEvent ? (
                  <div className="current-event-content">
                    <div className="current-event-details">
                      <h4>{currentEvent.eventName}</h4>

                      <div className="event-meta-grid">
                        <div><FontAwesomeIcon icon={faCalendarDays} /><span>{formatDate(currentEvent.date)}</span></div>
                        <div><FontAwesomeIcon icon={faClock} /><span>{currentEvent.time || "—"}</span></div>
                        <div><FontAwesomeIcon icon={faLocationDot} /><span>{currentEvent.location || "—"}</span></div>
                      </div>

                      <div className="live-attendance-box">
                        <div>
                          <span>Live Attendance</span>
                          <strong>{currentEvent.attendees || 0}<small> / {currentEvent.expectedAttendees || 0}</small></strong>
                        </div>
                        <div className="attendance-progress">
                          <div
                            className="attendance-progress-fill"
                            style={{
                              width: `${Math.min(((currentEvent.attendees || 0) / (currentEvent.expectedAttendees || 1)) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="latest-attendees">
                        <div className="subsection-title">
                          <h5>Latest Attendees</h5>
                          <button type="button" onClick={() => navigate("/attendance-reports")}>
                            View Attendance <FontAwesomeIcon icon={faArrowRight} />
                          </button>
                        </div>

                        {currentEvent.latestAttendees?.length ? (
                          <div className="latest-attendee-list">
                            {currentEvent.latestAttendees.map((attendee) => (
                              <div className="latest-attendee-row" key={attendee.id}>
                                <div className="attendee-avatar">{attendee.name?.charAt(0) || "S"}</div>
                                <div><strong>{attendee.name}</strong><span>{attendee.studentId}</span></div>
                                <time>{attendee.time}</time>
                              </div>
                            ))}
                          </div>
                        ) : <div className="empty-small">No recent check-ins yet.</div>}
                      </div>
                    </div>

                    <div className="certificate-preview">
                      <div className="subsection-title">
                        <h5>Latest Certificate</h5>
                        <FontAwesomeIcon icon={faCertificate} />
                      </div>
                      {currentEvent.latestCertificate ? (
                        <div className="certificate-preview-box">
                          <iframe title="Latest certificate preview" src={currentEvent.latestCertificate} />
                        </div>
                      ) : (
                        <div className="certificate-empty">
                          <FontAwesomeIcon icon={faCertificate} />
                          <strong>Certificate Preview</strong>
                          <span>The latest generated certificate will appear here once the kiosk is connected to the backend.</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="no-current-event">
                    <div className="no-current-event-icon"><FontAwesomeIcon icon={faCalendarDays} /></div>
                    <h4>No event is currently happening</h4>
                    <p>Live attendance, latest check-ins, and certificate previews will appear here automatically when an approved event is currently running.</p>
                  </div>
                )}
              </section>

              {/* UPCOMING EVENTS */}
              <section className="dashboard-panel">
                <div className="panel-heading">
                  <div>
                    <p className="section-kicker">SCHEDULE</p>
                    <h3>Upcoming Events</h3>
                  </div>
                  <button type="button" className="text-action" onClick={() => navigate("/events")}>
                    View All <FontAwesomeIcon icon={faArrowRight} />
                  </button>
                </div>

                {upcomingEvents.length ? (
                  <div className="dashboard-table-wrapper">
                    <table className="dashboard-table">
                      <thead>
                        <tr><th>Event</th><th>Date</th><th>Time</th>{isSystemAdmin && <th>Event Admin</th>}<th>Status</th></tr>
                      </thead>
                      <tbody>
                        {upcomingEvents.slice(0, 5).map((event) => (
                          <tr key={event.id}>
                            <td><div className="event-name-cell"><strong>{event.eventName}</strong><span>{event.location || "Location not set"}</span></div></td>
                            <td>{formatDate(event.date)}</td>
                            <td>{event.time || "—"}</td>
                            {isSystemAdmin && <td>{event.eventAdmin || "—"}</td>}
                            <td><span className={`status-badge status-${String(event.status).toLowerCase()}`}>{event.status === "approved" ? "Approved" : event.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state"><FontAwesomeIcon icon={faCalendarDays} /><span>No upcoming events found.</span></div>
                )}
              </section>

              {/* EVENT HISTORY */}
              <section className="dashboard-panel">
                <div className="panel-heading">
                  <div>
                    <p className="section-kicker">CURRENT YEAR</p>
                    <h3>Event History</h3>
                  </div>
                </div>

                {eventHistory.length ? (
                  <div className="dashboard-table-wrapper">
                    <table className="dashboard-table history-table">
                      <thead><tr><th>Event</th><th>Date</th><th>Attendance</th><th>Certificates</th></tr></thead>
                      <tbody>
                        {eventHistory.slice(0, 5).map((event) => (
                          <tr key={event.id}>
                            <td><div className="event-name-cell"><strong>{event.eventName}</strong><span>{event.location || "—"}</span></div></td>
                            <td>{formatDate(event.date)}</td>
                            <td><strong>{Number(event.attendees || 0).toLocaleString()}</strong><span className="table-muted"> / {Number(event.expectedAttendees || 0).toLocaleString()}</span></td>
                            <td>{Number(event.certificates || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state"><FontAwesomeIcon icon={faFileCircleCheck} /><span>No event history for this year.</span></div>
                )}
              </section>
            </main>

            {/* RIGHT COLUMN: PENDING ACTIONS → RECENT ACTIVITIES → QUICK ACTIONS */}
            <aside className="event-side-column">

              <section className="dashboard-panel side-panel">
                <div className="panel-heading">
                  <div><p className="section-kicker">ATTENTION</p><h3>Pending Actions</h3></div>
                  <FontAwesomeIcon className="panel-heading-icon" icon={faBell} />
                </div>
                <div className="pending-action-list">
                  {pendingActions.map((action) => (
                    <button
                      type="button"
                      className="pending-action-item"
                      key={action.id}
                      onClick={() => navigate("/events")}
                    >
                      <span className="pending-action-icon"><FontAwesomeIcon icon={action.icon} /></span>
                      <span className="pending-action-copy"><strong>{action.title}</strong><small>{action.description}</small></span>
                      <FontAwesomeIcon className="pending-action-arrow" icon={faArrowRight} />
                    </button>
                  ))}
                </div>
              </section>

              <section className="dashboard-panel side-panel">
                <div className="panel-heading">
                  <div><p className="section-kicker">SYSTEM ACTIVITY</p><h3>Recent Activities</h3></div>
                </div>
                <div className="activity-list">
                  {recentActivities.map((activity) => (
                    <div className="activity-item" key={activity.id}>
                      <div className="activity-icon"><FontAwesomeIcon icon={activityIcon(activity.type)} /></div>
                      <div className="activity-copy">
                        <strong>{activity.title}</strong>
                        <p>{activity.description}</p>
                        <time>{activity.time}</time>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* QUICK ACTIONS IS UNDER RECENT ACTIVITIES */}
              <section className="dashboard-panel side-panel quick-actions-panel">
                <div className="panel-heading">
                  <div><p className="section-kicker">SHORTCUTS</p><h3>Quick Actions</h3></div>
                  <FontAwesomeIcon className="panel-heading-icon" icon={faPlus} />
                </div>

                <div className="quick-actions-list">
                  <button type="button" className="quick-action-button" onClick={() => navigate("/events")}>
                    <span><FontAwesomeIcon icon={faPlus} /></span>
                    <div><strong>Create Event</strong><small>Add a new event</small></div>
                    <FontAwesomeIcon className="quick-action-arrow" icon={faArrowRight} />
                  </button>

                  {isSystemAdmin && (
                    <button type="button" className="quick-action-button" onClick={() => navigate("/users")}>
                      <span><FontAwesomeIcon icon={faUserPlus} /></span>
                      <div><strong>Add Event Admin</strong><small>Create an event administrator</small></div>
                      <FontAwesomeIcon className="quick-action-arrow" icon={faArrowRight} />
                    </button>
                  )}

                  <button type="button" className="quick-action-button" onClick={() => navigate("/certificates")}>
                    <span><FontAwesomeIcon icon={faCertificate} /></span>
                    <div><strong>Certificates</strong><small>Manage certificate templates</small></div>
                    <FontAwesomeIcon className="quick-action-arrow" icon={faArrowRight} />
                  </button>
                </div>
              </section>
            </aside>
          </div>
        </section>
      </div>

    </div>
  );
};

export default Dashboard;
