import { useState } from "react";
import "./AddAdmin.css";

// =========================================
// ORGANIZATION OPTIONS
// =========================================
const organizations = [
  "(SFE) Society of Future Engineers",
  "(UNIX) Unified Network of Infotech Experts",
  "(AYCOMS) Alliance of Young Computer Scientist Organization",
  "(ASSU) Arts and Sciences Students Union",
  "(GAP) Guild of Aspiring Psychologists",
  "(OFED) Organization of Future Educators",
  "(JPIA) Junior Philippine Institute of Accountants",
  "(AJAC) Association of Junior Artists and Communicators",
  "(SPADE) Student of Public Administration for Development and Excellence",
  "(WACO) WIS Athletic and Cultural Organization",
  "(JPSME) Junior Philippine Society of Mechanical Engineers",
  "(JIECEP) Junior Institute of Electronics Engineers of the Philippines",
  "(PSCAS) Philippine Society of Customs Administration Students",
  "(ESA) Economics Students' Association",
  "(JPIIE) Junior Philippine Institute of Industrial Engineers",
  "(CSS) Criminology Student Society",
  "(PSS) Political Science Society",
  "(PICE) Philippine Institute of Civil Engineers",
  "(ABM) Association of Business Majors",
  "(AYHTS) Association of Young Hoteliers and Tourism Students",
  "(JIIEE) Junior Institute of Integrated Electrical Engineers",
  "(ACPES) Association of Computer Engineering Student",
];

function AddAdmin({ onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    organization: "",
  });

  const [errors, setErrors] = useState({});

  // =========================================
  // HANDLE INPUT CHANGES
  // =========================================
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });

    // Remove error when user changes the field
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  // =========================================
  // FORM VALIDATION
  // =========================================
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Event Admin name is required.";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Gmail address is required.";
    } else if (!formData.email.endsWith("@gmail.com")) {
      newErrors.email = "Please enter a valid Gmail address.";
    }

    if (!formData.organization) {
      newErrors.organization = "Organization is required.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // =========================================
  // SUBMIT FORM
  // =========================================
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (onSubmit) {
      onSubmit(formData);
    }
  };

  return (
    <div className="add-admin-overlay">
      {/* =====================================
          MODAL
      ====================================== */}
      <div className="add-admin-modal">

        {/* =====================================
            MODAL HEADER
        ====================================== */}
        <div className="add-admin-header">
          <div>
            <h2>Add Event Admin</h2>
            <p>
              Create a new event administrator account
            </p>
          </div>

          <button
            type="button"
            className="add-admin-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* =====================================
            FORM
        ====================================== */}
        <form
          className="add-admin-form"
          onSubmit={handleSubmit}
        >

          {/* EVENT ADMIN NAME */}
          <div className="form-group">
            <label htmlFor="name">
              Event Admin Name
              <span>*</span>
            </label>

            <input
              id="name"
              name="name"
              type="text"
              placeholder="Enter event admin name"
              value={formData.name}
              onChange={handleChange}
            />

            {errors.name && (
              <small className="form-error">
                {errors.name}
              </small>
            )}
          </div>

          {/* GMAIL */}
          <div className="form-group">
            <label htmlFor="email">
              Gmail Address
              <span>*</span>
            </label>

            <input
              id="email"
              name="email"
              type="email"
              placeholder="example@gmail.com"
              value={formData.email}
              onChange={handleChange}
            />

            {errors.email && (
              <small className="form-error">
                {errors.email}
              </small>
            )}
          </div>

          {/* ORGANIZATION */}
          <div className="form-group">
            <label htmlFor="organization">
              Organization
              <span>*</span>
            </label>

            <select
              id="organization"
              name="organization"
              value={formData.organization}
              onChange={handleChange}
            >
              <option value="">
                Select Organization
              </option>

              {organizations.map((organization) => (
                <option
                  key={organization}
                  value={organization}
                >
                  {organization}
                </option>
              ))}
            </select>

            {errors.organization && (
              <small className="form-error">
                {errors.organization}
              </small>
            )}
          </div>

          {/* =====================================
              BUTTONS
          ====================================== */}
          <div className="add-admin-actions">
            <button
              type="button"
              className="cancel-admin-button"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="save-admin-button"
            >
              Add Event Admin
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default AddAdmin;