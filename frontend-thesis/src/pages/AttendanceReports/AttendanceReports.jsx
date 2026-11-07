import { useState } from "react";
import "./AttendanceReports.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faCalendarDays,
  faChartColumn,
  faDownload,
  faUserCheck,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";

import { getCurrentUser } from "../../utils/cookiesUtils.js";
import DownloadAttendance from "../../components/Modal/DownloadAttendance/DownloadAttendance.jsx";


const attendanceRecords = [
  {
    id: 1,
    eventName: "Student Leadership Summit",
    eventAdmin: "Maria Santos",
    date: "September 4, 2026",
    time: "6:42 PM",
    attendees: 128,
    present: 119,
    absent: 9,
    fileName: "Student_Leadership_Summit_2026.xlsx",
    departmentBreakdown: [
      { department: "COE", program: "BS Computer Engineering", major: "", attendees: 44, present: 41, absent: 3 },
      { department: "CAS", program: "BS Psychology", major: "", attendees: 38, present: 35, absent: 3 },
      { department: "CTE", program: "Bachelor of Secondary Education", major: "English", attendees: 46, present: 43, absent: 3 },
    ],
  },
  {
    id: 2,
    eventName: "Technology and Innovation Expo",
    eventAdmin: "John Reyes",
    date: "August 28, 2026",
    time: "5:18 PM",
    attendees: 215,
    present: 201,
    absent: 14,
    fileName: "Technology_and_Innovation_Expo_2026.xlsx",
    departmentBreakdown: [
      { department: "CITCS", program: "BS Information Technology", major: "", attendees: 80, present: 75, absent: 5 },
      { department: "SEBA", program: "BS Business Administration", major: "Business Economics", attendees: 70, present: 67, absent: 3 },
      { department: "CTHM", program: "BS Tourism Management", major: "", attendees: 65, present: 59, absent: 6 },
    ],
  },
  {
    id: 3,
    eventName: "Career Development Seminar",
    eventAdmin: "Angela Cruz",
    date: "August 19, 2026",
    time: "4:35 PM",
    attendees: 96,
    present: 87,
    absent: 9,
    fileName: "Career_Development_Seminar_2026.xlsx",
    departmentBreakdown: [
      { department: "CAS", program: "AB Communication", major: "", attendees: 32, present: 29, absent: 3 },
      { department: "SOC", program: "BS Criminology", major: "", attendees: 30, present: 27, absent: 3 },
      { department: "CTE", program: "Bachelor of Secondary Education", major: "Mathematics", attendees: 34, present: 31, absent: 3 },
    ],
  },
  {
    id: 4,
    eventName: "University Sports Festival",
    eventAdmin: "Daniel Garcia",
    date: "August 10, 2026",
    time: "7:12 PM",
    attendees: 342,
    present: 318,
    absent: 24,
    fileName: "University_Sports_Festival_2026.xlsx",
    departmentBreakdown: [
      { department: "CTHM", program: "BS Hospitality Management", major: "", attendees: 120, present: 111, absent: 9 },
      { department: "COE", program: "BS Mechanical Engineering", major: "", attendees: 110, present: 103, absent: 7 },
      { department: "SEBA", program: "BS Accountancy", major: "", attendees: 112, present: 104, absent: 8 },
    ],
  },
  {
    id: 5,
    eventName: "Research and Innovation Forum",
    eventAdmin: "Sofia Mendoza",
    date: "July 29, 2026",
    time: "3:47 PM",
    attendees: 174,
    present: 165,
    absent: 9,
    fileName: "Research_and_Innovation_Forum_2026.xlsx",
    departmentBreakdown: [
      { department: "CITCS", program: "BS Computer Science", major: "", attendees: 60, present: 57, absent: 3 },
      { department: "COE", program: "BS Electrical Engineering", major: "", attendees: 58, present: 55, absent: 3 },
      { department: "CAS", program: "BS Mathematics", major: "", attendees: 56, present: 53, absent: 3 },
    ],
  },
];


function Attendance() {
  const [selectedReport, setSelectedReport] = useState(null);
  const user = getCurrentUser();
  const userRole = user?.role;

  const isSystemAdmin =
    userRole === "system-admin" ||
    userRole === "system_admin";

  const isEventAdmin =
    userRole === "event-admin" ||
    userRole === "event_admin";

  const currentAdminName =
    user?.fullname ||
    user?.fullName ||
    user?.name ||
    "";

  const visibleAttendanceRecords = isEventAdmin
    ? attendanceRecords.filter(
        (record) =>
          record.eventAdmin.toLowerCase() ===
          currentAdminName.toLowerCase()
      )
    : attendanceRecords;


  /* =====================================================
     SUMMARY CALCULATIONS
  ===================================================== */

  const totalEvents = visibleAttendanceRecords.length;

  const totalAttendees = visibleAttendanceRecords.reduce(
    (sum, record) => sum + record.attendees,
    0
  );

  const totalPresent = visibleAttendanceRecords.reduce(
    (sum, record) => sum + record.present,
    0
  );

  const overallRate =
    totalAttendees > 0
      ? Math.round((totalPresent / totalAttendees) * 100)
      : 0;


  const openPreview = (record) => {
    setSelectedReport(record);
  };

  const closePreview = () => {
    setSelectedReport(null);
  };


  /* =====================================================
     ACCESS DENIED
  ===================================================== */

  if (!isSystemAdmin && !isEventAdmin) {
    return (
      <div className="attendance-page">
        <div className="access-denied">
          <h2>Access Denied</h2>

          <p>
            You do not have permission to access
            Attendance Reports.
          </p>

          <p>
            Please contact your administrator if you
            need access.
          </p>
        </div>
      </div>
    );
  }


  return (
    <div className="attendance-page">

      

      {/* SUMMARY CARDS */}

      <div className="attendance-summary">

        <div className="summary-card">

          <div className="summary-icon events-icon">
            <FontAwesomeIcon icon={faCalendarDays} />
          </div>

          <div className="summary-content">

            <span className="summary-label">
              Events Recorded
            </span>

            <strong>{totalEvents}</strong>

            <small>
              {isEventAdmin
                ? "Your completed events"
                : "All completed events"}
            </small>

          </div>

        </div>


        <div className="summary-card">

          <div className="summary-icon attendees-icon">
            <FontAwesomeIcon icon={faUsers} />
          </div>

          <div className="summary-content">

            <span className="summary-label">
              Expected Attendees
            </span>

            <strong>{totalAttendees}</strong>

            <small>
              {isEventAdmin
                ? "Across your events"
                : "Across all events"}
            </small>

          </div>

        </div>


        <div className="summary-card">

          <div className="summary-icon present-icon">
            <FontAwesomeIcon icon={faUserCheck} />
          </div>

          <div className="summary-content">

            <span className="summary-label">
              Present
            </span>

            <strong>{totalPresent}</strong>

            <small>
              Successfully recorded
            </small>

          </div>

        </div>


        <div className="summary-card">

          <div className="summary-icon rate-icon">
            <FontAwesomeIcon icon={faChartColumn} />
          </div>

          <div className="summary-content">

            <span className="summary-label">
              Attendance Rate
            </span>

            <strong>{overallRate}%</strong>

            <small>
              Overall attendance
            </small>

          </div>

        </div>

      </div>


      {/* REPORT SECTION */}

      <section className="reports-section">

        <div className="reports-section-header">

          <div>

            <h2>Event Attendance Records</h2>

            <p>
              Latest attendance reports are displayed first.
            </p>

          </div>


          <div className="records-indicator">

            <span className="indicator-dot"></span>

            {totalEvents} Reports Available

          </div>

        </div>


        {/* =================================================
            DESKTOP TABLE
        ================================================= */}

        <div className="attendance-table-container">

          <table className="attendance-table">

            <thead>

              <tr>

                <th>EVENT</th>

                {/* SYSTEM ADMIN ONLY */}

                {isSystemAdmin && (
                  <th>EVENT ADMIN</th>
                )}

                <th>DATE & TIME SAVED</th>

                <th>ATTENDANCE</th>

                <th>ATTENDANCE REPORT</th>

              </tr>

            </thead>


            <tbody>

              {visibleAttendanceRecords.map(
                (record, index) => {

                  const attendanceRate = Math.round(
                    (record.present / record.attendees) * 100
                  );

                  return (

                    <tr key={record.id}>

                      {/* EVENT */}

                      <td>

                        <div className="event-cell">

                          <div className="event-number">
                            {String(index + 1).padStart(2, "0")}
                          </div>

                          <div>

                            <div className="event-name">
                              {record.eventName}
                            </div>

                            <div className="event-subtitle">
                              Attendance Record #{record.id}
                            </div>

                          </div>

                        </div>

                      </td>


                      {/* EVENT ADMIN
                          SYSTEM ADMIN ONLY */}

                      {isSystemAdmin && (

                        <td>

                          <div className="admin-cell">

                            <div className="admin-avatar">

                              {record.eventAdmin
                                .split(" ")
                                .map((name) => name[0])
                                .join("")
                                .substring(0, 2)}

                            </div>

                            <span>
                              {record.eventAdmin}
                            </span>

                          </div>

                        </td>

                      )}


                      {/* DATE */}

                      <td>

                        <div className="date-cell">

                          <strong>
                            {record.date}
                          </strong>

                          <span>
                            {record.time}
                          </span>

                        </div>

                      </td>


                      {/* ATTENDANCE */}

                      <td>

                        <div className="attendance-cell">

                          <div className="attendance-numbers">

                            <strong>
                              {record.present}
                            </strong>

                            <span>
                              / {record.attendees}
                            </span>

                          </div>


                          <div className="progress-wrapper">

                            <div className="progress-bar">

                              <div
                                className="progress-fill"
                                style={{
                                  width: `${attendanceRate}%`,
                                }}
                              ></div>

                            </div>

                            <span>
                              {attendanceRate}%
                            </span>

                          </div>


                          <div className="attendance-breakdown">

                            <span className="present-text">
                              {record.present} present
                            </span>

                            <span className="absent-text">
                              {record.absent} absent
                            </span>

                          </div>

                        </div>

                      </td>


                      {/* DOWNLOAD */}

                      <td>

                        <div className="file-cell">

                          <div className="file-icon">
                            <FontAwesomeIcon icon={faDownload} />
                          </div>


                          <div className="file-info">

                            <strong>
                              {record.fileName}
                            </strong>

                            <span>
                              Preview by department or program
                            </span>

                          </div>


                          <button
                            className="download-button"
                            onClick={() => openPreview(record)}
                            title="Preview and download attendance"
                          >
                            Click here to Download Attendance <FontAwesomeIcon icon={faArrowRight} />
                          </button>

                        </div>

                      </td>

                    </tr>

                  );

                }

              )}


              {/* NO RECORDS */}

              {visibleAttendanceRecords.length === 0 && (

                <tr>

                  <td
                    colSpan={isSystemAdmin ? 5 : 4}
                    style={{
                      textAlign: "center",
                      padding: "40px",
                    }}
                  >

                    No attendance records found for
                    your assigned events.

                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>


        {/* =================================================
            MOBILE CARDS
        ================================================= */}

        <div className="mobile-report-list">

          {visibleAttendanceRecords.map(
            (record, index) => {

              const attendanceRate = Math.round(
                (record.present / record.attendees) * 100
              );

              return (

                <div
                  className="mobile-report-card"
                  key={record.id}
                >

                  <div className="mobile-card-top">

                    <div className="event-number">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div>

                      <h3>
                        {record.eventName}
                      </h3>

                      <span>
                        {record.date} • {record.time}
                      </span>

                    </div>

                  </div>


                  {/* EVENT ADMIN
                      SYSTEM ADMIN ONLY */}

                  {isSystemAdmin && (

                    <div className="mobile-card-admin">

                      <div className="admin-avatar">

                        {record.eventAdmin
                          .split(" ")
                          .map((name) => name[0])
                          .join("")
                          .substring(0, 2)}

                      </div>

                      <span>
                        {record.eventAdmin}
                      </span>

                    </div>

                  )}


                  <div className="mobile-attendance">

                    <div className="attendance-numbers">

                      <strong>
                        {record.present}
                      </strong>

                      <span>
                        / {record.attendees} present
                      </span>

                    </div>


                    <div className="progress-wrapper">

                      <div className="progress-bar">

                        <div
                          className="progress-fill"
                          style={{
                            width: `${attendanceRate}%`,
                          }}
                        ></div>

                      </div>

                      <span>
                        {attendanceRate}%
                      </span>

                    </div>

                  </div>


                  <div className="mobile-file">

                    <div className="file-icon">
                      <FontAwesomeIcon icon={faDownload} />
                    </div>


                    <div className="file-info">

                      <strong>
                        {record.fileName}
                      </strong>

                      <span>
                        Preview by department or program
                      </span>

                    </div>


                    <button
                      className="download-button"
                      onClick={() => openPreview(record)}
                      title="Preview and download attendance"
                    >
                      Click here to Download Attendance <FontAwesomeIcon icon={faArrowRight} />
                    </button>

                  </div>

                </div>

              );

            }

          )}


          {visibleAttendanceRecords.length === 0 && (

            <div className="mobile-report-card">

              <p>
                No attendance records found for your
                assigned events.
              </p>

            </div>

          )}

        </div>


        <div className="reports-footer">

          <span>
            Showing {totalEvents} attendance records
          </span>

          <span className="latest-note">
            Newest records appear first
          </span>

        </div>

      </section>

      <DownloadAttendance report={selectedReport} onClose={closePreview} />

    </div>
  );
}


export default Attendance;