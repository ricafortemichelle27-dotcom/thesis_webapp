import React, { useState } from "react";
import { getCurrentUser, setCookie } from "../../utils/cookiesUtils.js";
import { apiUrl } from "../../utils/api.js";
import "./SystemSettings.css";

function SystemSettings() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [settings, setSettings] = useState({
    autoLogout: true,
    loginAlerts: true,
  });

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });

    setMessage({
      type: "",
      text: "",
    });
  };

  const getPasswordStrength = () => {
    const password = passwordData.newPassword;

    if (!password) {
      return {
        label: "Enter a new password",
        level: 0,
      };
    }

    let strength = 0;

    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 1) {
      return {
        label: "Weak password",
        level: 1,
      };
    }

    if (strength === 2) {
      return {
        label: "Fair password",
        level: 2,
      };
    }

    if (strength === 3) {
      return {
        label: "Good password",
        level: 3,
      };
    }

    return {
      label: "Strong password",
      level: 4,
    };
  };

  const passwordStrength = getPasswordStrength();

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      setMessage({
        type: "error",
        text: "Please complete all password fields.",
      });

      return;
    }

    if (passwordData.newPassword.length < 8) {
      setMessage({
        type: "error",
        text: "New password must contain at least 8 characters.",
      });

      return;
    }

    if (
      passwordData.newPassword !==
      passwordData.confirmPassword
    ) {
      setMessage({
        type: "error",
        text: "New password and confirmation do not match.",
      });

      return;
    }

    try {
      const currentUser = getCurrentUser();

      if (!currentUser) {
        setMessage({
          type: "error",
          text: "You are not logged in. Please log in again."
        });

        return;
      }

      const response = await fetch(apiUrl("/api/auth/change-password"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to change password.");
      }

      setCookie("user", {
        ...currentUser,
        must_change_password: 0,
      }, 1);

      setMessage({
        type: "success",
        text: data.message || "Password changed successfully.",
      });

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Unable to change password. Please try again.",
      });
    }
  };

  const handleSettingChange = (setting) => {
    setSettings({
      ...settings,
      [setting]: !settings[setting],
    });
  };

  const handleSaveSettings = () => {
    setMessage({
      type: "success",
      text: "System settings saved successfully.",
    });
  };

  const handleResetSettings = () => {
    setSettings({
      autoLogout: true,
      loginAlerts: true,
    });

    setMessage({
      type: "",
      text: "",
    });
  };

  return (
    <div className="system-settings-page">


      {/* ================= CONTENT ================= */}

      <div className="settings-layout">

        {/* ================= LEFT COLUMN ================= */}

        <div className="settings-main">

          {/* CHANGE PASSWORD */}

          <section className="settings-card password-card">

            <div className="card-heading">
              <div className="card-icon">
                🔐
              </div>

              <div>
                <h2>Change Password</h2>

                <p>
                  Update your System Admin account password.
                </p>
              </div>
            </div>

            <form
              className="password-form"
              onSubmit={handleChangePassword}
            >

              {/* CURRENT PASSWORD */}

              <div className="form-group">

                <label htmlFor="currentPassword">
                  Current Password
                </label>

                <div className="password-input">
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type={
                      showCurrentPassword
                        ? "text"
                        : "password"
                    }
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter current password"
                  />

                  <button
                    type="button"
                    className="show-password"
                    onClick={() =>
                      setShowCurrentPassword(
                        !showCurrentPassword
                      )
                    }
                  >
                    {showCurrentPassword ? "Hide" : "Show"}
                  </button>
                </div>

              </div>


              {/* NEW PASSWORD */}

              <div className="form-group">

                <label htmlFor="newPassword">
                  New Password
                </label>

                <div className="password-input">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={
                      showNewPassword
                        ? "text"
                        : "password"
                    }
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password"
                  />

                  <button
                    type="button"
                    className="show-password"
                    onClick={() =>
                      setShowNewPassword(
                        !showNewPassword
                      )
                    }
                  >
                    {showNewPassword ? "Hide" : "Show"}
                  </button>
                </div>


                {/* PASSWORD STRENGTH */}

                {passwordData.newPassword && (
                  <div className="password-strength">

                    <div className="strength-bars">

                      {[1, 2, 3, 4].map((bar) => (
                        <span
                          key={bar}
                          className={
                            bar <= passwordStrength.level
                              ? `strength-active strength-${passwordStrength.level}`
                              : ""
                          }
                        ></span>
                      ))}

                    </div>

                    <span
                      className={`strength-label strength-text-${passwordStrength.level}`}
                    >
                      {passwordStrength.label}
                    </span>

                  </div>
                )}

                <div className="password-requirements">

                  <span>
                    ✓ At least 8 characters
                  </span>

                  <span>
                    ✓ One uppercase letter
                  </span>

                  <span>
                    ✓ One number
                  </span>

                  <span>
                    ✓ One special character
                  </span>

                </div>

              </div>


              {/* CONFIRM PASSWORD */}

              <div className="form-group">

                <label htmlFor="confirmPassword">
                  Confirm New Password
                </label>

                <div className="password-input">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Re-enter new password"
                  />

                  <button
                    type="button"
                    className="show-password"
                    onClick={() =>
                      setShowConfirmPassword(
                        !showConfirmPassword
                      )
                    }
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>

              </div>


              {/* PASSWORD MESSAGE */}

              {message.text && (
                <div
                  className={`settings-message ${message.type}`}
                >
                  <span>
                    {message.type === "success"
                      ? "✓"
                      : "!"}
                  </span>

                  {message.text}
                </div>
              )}


              <button
                type="submit"
                className="primary-button"
              >
                Change Password
              </button>

            </form>

          </section>


          {/* SECURITY SETTINGS */}

          <section className="settings-card">

            <div className="card-heading">

              <div className="card-icon">
                🛡
              </div>

              <div>
                <h2>Security Preferences</h2>

                <p>
                  Configure basic security behavior for
                  administrator accounts.
                </p>
              </div>

            </div>


            <div className="setting-option">

              <div className="setting-info">

                <strong>
                  Automatic Logout
                </strong>

                <span>
                  Automatically log out after a period
                  of inactivity.
                </span>

              </div>

              <button
                type="button"
                className={`toggle ${
                  settings.autoLogout
                    ? "toggle-on"
                    : ""
                }`}
                onClick={() =>
                  handleSettingChange("autoLogout")
                }
              >
                <span></span>
              </button>

            </div>


            <div className="setting-option">

              <div className="setting-info">

                <strong>
                  Login Notifications
                </strong>

                <span>
                  Notify the administrator when a new
                  login occurs.
                </span>

              </div>

              <button
                type="button"
                className={`toggle ${
                  settings.loginAlerts
                    ? "toggle-on"
                    : ""
                }`}
                onClick={() =>
                  handleSettingChange("loginAlerts")
                }
              >
                <span></span>
              </button>

            </div>

          </section>


          {/* SYSTEM INFORMATION */}

          <section className="settings-card">

            <div className="card-heading">

              <div className="card-icon">
                ⚙
              </div>

              <div>
                <h2>System Information</h2>

                <p>
                  Current information about the
                  administration portal.
                </p>
              </div>

            </div>


            <div className="system-information">

              <div className="info-row">
                <span>System Name</span>
                <strong>Student Event Attendance System</strong>
              </div>

              <div className="info-row">
                <span>Administrator Role</span>
                <strong className="role-badge">
                  System Admin
                </strong>
              </div>

              <div className="info-row">
                <span>Attendance Method</span>
                <strong>Biometric Fingerprint</strong>
              </div>

              <div className="info-row">
                <span>System Version</span>
                <strong>v1.0.0</strong>
              </div>

            </div>

          </section>

        </div>


        {/* ================= RIGHT COLUMN ================= */}

        <aside className="settings-sidebar">

          {/* SECURITY CARD */}

          <div className="security-summary">

            <div className="shield">
              🛡
            </div>

            <h3>
              Account Security
            </h3>

            <p>
              Keep your administrator account secure
              by using a strong and unique password.
            </p>

            <div className="security-line">
              <span></span>
              Password protection enabled
            </div>

            <div className="security-line">
              <span></span>
              Biometric attendance enabled
            </div>

            <div className="security-line">
              <span></span>
              Admin access protected
            </div>

          </div>


          {/* QUICK TIPS */}

          <div className="tips-card">

            <div className="tips-title">
              <span>✦</span>
              Security Tips
            </div>

            <ul>
              <li>
                Use a password that is difficult to
                guess.
              </li>

              <li>
                Never share your administrator
                password.
              </li>

              <li>
                Avoid using the same password on
                multiple systems.
              </li>

              <li>
                Change your password regularly.
              </li>
            </ul>

          </div>


          {/* ACTIONS */}

          <div className="settings-actions">

            <button
              type="button"
              className="save-settings"
              onClick={handleSaveSettings}
            >
              Save Preferences
            </button>

            <button
              type="button"
              className="reset-settings"
              onClick={handleResetSettings}
            >
              Reset Preferences
            </button>

          </div>

        </aside>

      </div>

    </div>
  );
}

export default SystemSettings;