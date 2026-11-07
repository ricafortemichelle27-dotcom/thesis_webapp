import Notification from '../../components/Notification/Notification.jsx';
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faCircleExclamation,
  faClock,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import "./Users.css";
import AddAdmin from "../../components/Modal/AddAdmin/AddAdmin";
import { apiUrl } from "../../utils/api.js";

function Users() {
  // =========================================
  // USER TYPE
  // =========================================

  const [userType, setUserType] = useState("Students");

  // =========================================
  // STUDENT STATUS
  // =========================================

  const [studentStatus, setStudentStatus] = useState("Pending");

  // =========================================
  // SEARCH
  // =========================================

  const [searchTerm, setSearchTerm] = useState("");

  // =========================================
  // STUDENT DATA
  // =========================================
  const [successMessage, setSuccessMessage] = useState('');
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [students, setStudents] = useState([
    {
      id: 1,
      lastName: "Dela Cruz",
      firstName: "Juan",
      middleName: "Santos",
      suffix: "",
      studentId: "2026-00123",
      email: "juan.delacruz@wis.edu.ph",
      department: "CITCS",
      major: "BS Information Technology",
      yearLevel: "4th Year",
      status: "Pending",
    },
    {
      id: 2,
      lastName: "Santos",
      firstName: "Maria",
      middleName: "Reyes",
      suffix: "",
      studentId: "2026-00124",
      email: "maria.santos@wis.edu.ph",
      department: "CITCS",
      major: "BS Computer Science",
      yearLevel: "3rd Year",
      status: "Pending",
    },
    {
      id: 3,
      lastName: "Reyes",
      firstName: "Pedro",
      middleName: "Garcia",
      suffix: "",
      studentId: "2026-00125",
      email: "pedro.reyes@wis.edu.ph",
      department: "CITCS",
      major: "BS Computer Science",
      yearLevel: "2nd Year",
      status: "Approved",
    },
    {
      id: 4,
      lastName: "Garcia",
      firstName: "Ana",
      middleName: "Lopez",
      suffix: "",
      studentId: "2026-00126",
      email: "ana.garcia@wis.edu.ph",
      department: "SEBA",
      major: "BS Business Administration",
      yearLevel: "1st Year",
      status: "Rejected",
    },
  ]);

  // =========================================
  // EVENT ADMIN DATA
  // =========================================

  const [eventAdmins, setEventAdmins] = useState([]);
  const [isLoadingEventAdmins, setIsLoadingEventAdmins] = useState(false);
  const [eventAdminError, setEventAdminError] = useState("");

  // =========================================
  // FETCH EVENT ADMINS
  // =========================================

  useEffect(() => {
    if (userType !== "Event Admins") {
      return;
    }

    const fetchEventAdmins = async () => {
      setIsLoadingEventAdmins(true);
      setEventAdminError("");

      try {
        const response = await fetch(
          apiUrl("/api/users/event-admins")
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to retrieve Event Admins."
          );
        }

        setEventAdmins(data.eventAdmins || []);
      } catch (error) {
        console.error("Fetch Event Admins error:", error);
        setEventAdminError(
          "Unable to load Event Admins. Please check the backend server."
        );
      } finally {
        setIsLoadingEventAdmins(false);
      }
    };

    fetchEventAdmins();
  }, [userType]);

  // =========================================
  // FILTER STUDENTS
  // =========================================

  const filteredStudents = students.filter((student) => {
    const search = searchTerm.toLowerCase();

    const matchesStatus =
      student.status === studentStatus;

    const matchesSearch =
      student.lastName.toLowerCase().includes(search) ||
      student.firstName.toLowerCase().includes(search) ||
      student.middleName.toLowerCase().includes(search) ||
      (student.suffix || "").toLowerCase().includes(search) ||
      student.studentId.toLowerCase().includes(search) ||
      (student.email || "").toLowerCase().includes(search) ||
      student.department.toLowerCase().includes(search) ||
      student.major.toLowerCase().includes(search);

    return matchesStatus && matchesSearch;
  });

  // =========================================
  // FILTER EVENT ADMINS
  // =========================================

  const filteredEventAdmins = eventAdmins.filter((admin) => {
  const search = searchTerm.toLowerCase().trim();

  return (
    (admin.fullname || "").toLowerCase().includes(search) ||
    (admin.email || "").toLowerCase().includes(search) ||
    (admin.organization || "").toLowerCase().includes(search)
  );
});

  // =========================================
  // APPROVE STUDENT
  // =========================================

  const handleApproveStudent = (id) => {
    setStudents(
      students.map((student) =>
        student.id === id
          ? {
              ...student,
              status: "Approved",
            }
          : student
      )
    );
  };

  // =========================================
  // REJECT STUDENT
  // =========================================

  const handleRejectStudent = (id) => {
    const confirmReject = window.confirm(
      "Are you sure you want to reject this registration?"
    );

    if (!confirmReject) return;

    setStudents(
      students.map((student) =>
        student.id === id
          ? {
              ...student,
              status: "Rejected",
            }
          : student
      )
    );
  };

  // =========================================
  // DELETE STUDENT
  // =========================================

  const handleDeleteStudent = (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this student registration?"
    );

    if (!confirmDelete) return;

    setStudents(
      students.filter((student) => student.id !== id)
    );
  };

  // =========================================
  // UPDATE STUDENT
  // =========================================

  const handleUpdateStudent = (student) => {
    alert(
      `Update Student\n\n` +
      `${student.lastName}, ${student.firstName} ${student.middleName}\n` +
      `Student ID: ${student.studentId}`
    );
  };

  // =========================================
  // VIEW STUDENT
  // =========================================

  const handleViewStudent = (student) => {
    alert(
      `Student Information\n\n` +
      `Name: ${student.lastName}, ${student.firstName} ${student.middleName}\n` +
      `Student ID: ${student.studentId}\n` +
      `Department: ${student.department}\n` +
      `Major/Program: ${student.major}\n` +
      `Year Level: ${student.yearLevel}\n` +
      `Status: ${student.status}`
    );
  };

  // =========================================
  // TOGGLE EVENT ADMIN STATUS
  // =========================================

  const toggleEventAdminStatus = (id) => {
    alert(`Changing Event Admin status is not connected to the database yet. Event Admin ID: ${id}`);
  };

  // =========================================
  // ADD EVENT ADMIN
  // =========================================

  const handleAddEventAdmin = async (formData) => {
    try {
      const response = await fetch(apiUrl("/api/users/event-admins"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullname: formData.name,
          email: formData.email,
          organization: formData.organization,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create Event Admin.");
      }

      setShowAddAdmin(false);
      setEventAdmins((currentAdmins) => [data.eventAdmin, ...currentAdmins]);
      setSuccessMessage('Event Admin added Successfully');
    } catch (error) {
      alert(error.message || "Unable to create Event Admin.");
    }
  };

  // =========================================
  // UPDATE EVENT ADMIN
  // =========================================

  const handleUpdateEventAdmin = (admin) => {
    alert(`Updating ${admin.fullname} is not connected to the database yet.`);
  };

  // =========================================
  // DELETE EVENT ADMIN
  // =========================================

  const handleDeleteEventAdmin = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to deactivate this Event Admin?"
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch(
        apiUrl(`/api/users/event-admins/${id}`),
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to deactivate Event Admin.");
      }

      setEventAdmins((currentAdmins) =>
        currentAdmins.filter((admin) => admin.id !== id)
      );

      alert(data.message || "Event Admin deactivated successfully.");
    } catch (error) {
      alert(error.message || "Unable to deactivate Event Admin.");
    }
  };

  return (
    <div className="users-page">
      {/* =====================================
          USER TYPE SELECTOR
      ====================================== */}

      <div className="users-type-section">

        <label>Manage Users</label>

        <select
          value={userType}
          onChange={(e) => {
            setUserType(e.target.value);
            setSearchTerm("");
          }}
          className="user-type-select"
        >
          <option value="Students">
            Students
          </option>

          <option value="Event Admins">
            Event Admins
          </option>
        </select>

      </div>


      {/* =====================================
          STUDENTS
      ====================================== */}

      {userType === "Students" && (

        <div className="users-content">

          {/* STUDENT SUMMARY */}

          <div className="user-summary-cards">

            <div className="user-summary-card">
              <div className="summary-card-icon">
                <FontAwesomeIcon icon={faUsers} />
              </div>

              <div>
                <p>Total Registrations</p>

                <h2>
                  {students.length}
                </h2>
              </div>
            </div>


            <div className="user-summary-card">
              <div className="summary-card-icon pending">
                <FontAwesomeIcon icon={faClock} />
              </div>

              <div>
                <p>Pending</p>

                <h2>
                  {
                    students.filter(
                      (student) =>
                        student.status === "Pending"
                    ).length
                  }
                </h2>
              </div>
            </div>


            <div className="user-summary-card">
              <div className="summary-card-icon approved">
                <FontAwesomeIcon icon={faCircleCheck} />
              </div>

              <div>
                <p>Approved</p>

                <h2>
                  {
                    students.filter(
                      (student) =>
                        student.status === "Approved"
                    ).length
                  }
                </h2>
              </div>
            </div>


            <div className="user-summary-card">
              <div className="summary-card-icon rejected">
                <FontAwesomeIcon icon={faCircleExclamation} />
              </div>

              <div>
                <p>Rejected</p>

                <h2>
                  {
                    students.filter(
                      (student) =>
                        student.status === "Rejected"
                    ).length
                  }
                </h2>
              </div>
            </div>

          </div>


          {/* STUDENT MANAGEMENT CARD */}

          <div className="management-card">

            {/* CARD HEADER */}

            <div className="management-header">

              <div>
                <h2>Student Registrations</h2>

                <p>
                  Manage student registrations submitted through the kiosk
                </p>
              </div>

            </div>


            {/* STUDENT TABS */}

            <div className="student-tabs">

              <button
                className={
                  studentStatus === "Pending"
                    ? "student-tab active"
                    : "student-tab"
                }
                onClick={() => setStudentStatus("Pending")}
              >
                Pending

                <span>
                  {
                    students.filter(
                      (student) =>
                        student.status === "Pending"
                    ).length
                  }
                </span>
              </button>


              <button
                className={
                  studentStatus === "Approved"
                    ? "student-tab active"
                    : "student-tab"
                }
                onClick={() => setStudentStatus("Approved")}
              >
                Approved

                <span>
                  {
                    students.filter(
                      (student) =>
                        student.status === "Approved"
                    ).length
                  }
                </span>
              </button>


              <button
                className={
                  studentStatus === "Rejected"
                    ? "student-tab active"
                    : "student-tab"
                }
                onClick={() => setStudentStatus("Rejected")}
              >
                Rejected

                <span>
                  {
                    students.filter(
                      (student) =>
                        student.status === "Rejected"
                    ).length
                  }
                </span>
              </button>

            </div>


            {/* SEARCH */}

            <div className="table-controls">

              <div className="users-search">

                <span>⌕</span>

                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(e.target.value)
                  }
                />

              </div>

            </div>


            {/* STUDENT TABLE */}

            <div className="table-wrapper">

              <table className="users-table">

                <thead>

                  <tr>
                    <th>Last Name</th>
                    <th>First Name</th>
                    <th>Middle Name</th>
                    <th>Suffix</th>
                    <th>Student ID</th>
                    <th>Email Address</th>
                    <th>Department</th>
                    <th>Major / Program</th>
                    <th>Year Level</th>
                    <th>Actions</th>
                  </tr>

                </thead>


                <tbody>

                  {filteredStudents.length > 0 ? (

                    filteredStudents.map((student) => (

                      <tr key={student.id}>

                        <td>
                          <strong>
                            {student.lastName}
                          </strong>
                        </td>

                        <td>
                          {student.firstName}
                        </td>

                        <td>
                          {student.middleName}
                        </td>

                        <td>
                          {student.suffix || ""}
                        </td>

                        <td>
                          <span className="student-id">
                            {student.studentId}
                          </span>
                        </td>

                        <td>
                          {student.email || "—"}
                        </td>

                        <td>
                          {student.department}
                        </td>

                        <td>
                          {student.major}
                        </td>

                        <td>
                          {student.yearLevel}
                        </td>

                        <td>

                          <div className="user-actions">

                            {/* VIEW */}

                            <button
                              className="user-action-button view"
                              title="View Student"
                              onClick={() =>
                                handleViewStudent(student)
                              }
                            >
                              👁
                            </button>


                            {/* PENDING ACTIONS */}

                            {student.status === "Pending" && (
                              <>
                                <button
                                  className="user-action-button approve"
                                  title="Approve Registration"
                                  onClick={() =>
                                    handleApproveStudent(
                                      student.id
                                    )
                                  }
                                >
                                  <FontAwesomeIcon icon={faCircleCheck} />
                                </button>

                                <button
                                  className="user-action-button reject"
                                  title="Reject Registration"
                                  onClick={() =>
                                    handleRejectStudent(
                                      student.id
                                    )
                                  }
                                >
                                  ✕
                                </button>
                              </>
                            )}


                            {/* UPDATE */}

                            <button
                              className="user-action-button edit"
                              title="Update Student"
                              onClick={() =>
                                handleUpdateStudent(student)
                              }
                            >
                              ✎
                            </button>


                            {/* DELETE */}

                            <button
                              className="user-action-button delete"
                              title="Delete Student"
                              onClick={() =>
                                handleDeleteStudent(
                                  student.id
                                )
                              }
                            >
                              🗑
                            </button>

                          </div>

                        </td>

                      </tr>

                    ))

                  ) : (

                    <tr>

                      <td
                        colSpan="8"
                        className="empty-table"
                      >
                        No {studentStatus.toLowerCase()} registrations found.
                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>


            {/* TABLE FOOTER */}

            <div className="table-footer">

              <p>
                Showing {filteredStudents.length}{" "}
                {studentStatus.toLowerCase()} registration
                {filteredStudents.length !== 1 ? "s" : ""}
              </p>

            </div>

          </div>

        </div>
      )}


      {/* =====================================
          EVENT ADMINS
      ====================================== */}

      {userType === "Event Admins" && (

        <div className="users-content">

          <div className="management-card">

            {/* EVENT ADMIN HEADER */}

            <div className="management-header event-admin-management-header">

              <div>
                <h2>Event Admin Management</h2>

                <p>
                  Manage event administrators and their assigned events
                </p>
              </div>


              <button
                className="add-event-admin-button"
                onClick={() => setShowAddAdmin(true)}
              >
                + Add Event Admin
              </button>

            </div>


            {/* SEARCH */}

            <div className="table-controls">

              <div className="users-search">

                <span>⌕</span>

                <input
                  type="text"
                  placeholder="Search event admins..."
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(e.target.value)
                  }
                />

              </div>

            </div>


            {/* EVENT ADMIN TABLE */}

            <div className="table-wrapper">

              <table className="users-table event-admin-table">

                <thead>

                  <tr>
                    <th>Event Admin</th>
                    <th>Gmail</th>
                    <th>Assigned Events</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>

                </thead>


                <tbody>

                  {isLoadingEventAdmins ? (
                    <tr>
                      <td colSpan="5" className="empty-table">
                        Loading Event Admins...
                      </td>
                    </tr>
                  ) : eventAdminError ? (
                    <tr>
                      <td colSpan="5" className="empty-table">
                        {eventAdminError}
                      </td>
                    </tr>
                  ) : filteredEventAdmins.length > 0 ? (

                    filteredEventAdmins.map((admin) => (

                      <tr key={admin.id}>

                        {/* ADMIN NAME */}

                        <td>

                          <div className="admin-profile">

                            <div className="admin-avatar">
                              {(admin.fullname || "Unknown")
                                .split(" ")
                                .map(
                                  (name) =>
                                    name.charAt(0)
                                )
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>

                            <strong>
                              {admin.fullname}
                            </strong>

                          </div>

                        </td>


                        {/* GMAIL */}

                        <td>
                          {admin.email}
                        </td>


                        {/* ASSIGNED EVENTS */}

                        <td>

                          <div className="assigned-events">

                            <strong>
                              0 Events
                            </strong>

                            <span>
                              View Assigned
                            </span>

                          </div>

                        </td>


                        {/* STATUS */}

                        <td>

                          <span
                            className={`admin-status ${(admin.status || "inactive").toLowerCase()}`}
                          >
                            {admin.status === "active" ? "Active" : "Inactive"}
                          </span>

                        </td>


                        {/* ACTIONS */}

                        <td>

                          <div className="user-actions">

                            <button
                              className="user-action-button view"
                              title="View Event Admin"
                              onClick={() =>
                                alert(
                                  `Event Admin: ${admin.fullname}`
                                )
                              }
                            >
                              👁
                            </button>


                            <button
                              className="user-action-button edit"
                              title="Update Event Admin"
                              onClick={() =>
                                handleUpdateEventAdmin(
                                  admin
                                )
                              }
                            >
                              ✎
                            </button>


                            <button
                              className="user-action-button event"
                              title="Assign Events"
                              onClick={() =>
                                alert(
                                  `Assign events to ${admin.fullname} is not connected to the database yet.`
                                )
                              }
                            >
                              📅
                            </button>


                            <button
                              className={
                                admin.status === "active"
                                  ? "status-toggle active"
                                  : "status-toggle inactive"
                              }
                              title="Activate / Deactivate"
                              onClick={() =>
                                toggleEventAdminStatus(
                                  admin.id
                                )
                              }
                            >
                              <span></span>
                            </button>


                            <button
                              className="user-action-button delete"
                              title="Delete Event Admin"
                              onClick={() =>
                                handleDeleteEventAdmin(
                                  admin.id
                                )
                              }
                            >
                              🗑
                            </button>

                          </div>

                        </td>

                      </tr>

                    ))

                  ) : (

                    <tr>

                      <td
                        colSpan="5"
                        className="empty-table"
                      >
                        No event administrators found.
                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>


            {/* TABLE FOOTER */}

            <div className="table-footer">

              <p>
                Showing {filteredEventAdmins.length} of{" "}
                {eventAdmins.length} event administrators
              </p>

            </div>

          </div>

        </div>
      )}

      <Notification message={successMessage} onDismiss={() => setSuccessMessage('')} />

      {showAddAdmin && (
        <AddAdmin 
          onClose={() => setShowAddAdmin(false)}
          onSubmit={handleAddEventAdmin}
        />
      )}

    </div>
  );
}

export default Users;