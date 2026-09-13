import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    FontAwesomeIcon,
    faEye,
    faEyeSlash
} from "../../utils/icons.js";
import { setCookie } from "../../utils/cookiesUtils.js";
import { apiUrl } from "../../utils/api.js";

import "./Login.css";
import schoolImg from "../../assets/images/school_img.png";

function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setIsLoading(true);

        try {
            const response = await fetch(apiUrl("/api/auth/login"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    email,
                    password: loginPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || "Invalid email or password.");
                return;
            }

            setCookie("user", data.user, 1);

            if (data.user.role !== "system_admin" && data.user.role !== "event_admin") {
                setError("Invalid user role.");
                return;
            }

            navigate("/dashboard");
        } catch {
            setError("Unable to connect to the server. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-card">

            {/* LOGIN LEFT */}
            <div className="login-left">
                <img
                    className="login-left-photo"
                    src={schoolImg}
                    alt="WIS Building"
                />
            </div>


            {/* LOGIN RIGHT */}
            <div className="login-form-container">

                <form
                    className="login-form"
                    onSubmit={handleSubmit}
                >

                   {/* Header */}
                    <h2 className="text-greeting">
                        Welcome!
                    </h2>

                    <p className="text-instruction">
                        Please log in with your account credentials to securely access
                        the Biometric Event Attendance Management System
                        <br />
                        and manage events, attendance records, and system information.
                    </p>


                    {/* Error Message */}
                    {error && (
                        <p className="login-error">
                            {error}
                        </p>
                    )}


                    {/* Inputs */}
                    <div className="input-login-container">

                        {/* Email */}
                        <input
                            className="input-login"
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) =>
                                setEmail(e.target.value)
                            }
                            required
                        />


                        {/* Password */}
                        <div className="password-login-wrapper">
                            <input
                                className="input-login password-login-input"
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                value={loginPassword}
                                onChange={(e) =>
                                    setLoginPassword(e.target.value)
                                }
                                required
                            />

                            <button
                                type="button"
                                className="password-visibility-button"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                title={showPassword ? "Hide password" : "Show password"}
                            >
                                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                            </button>
                        </div>

                    </div>


                    {/* Login Button */}
                    <button
                        type="submit"
                        className="login-button"
                        disabled={isLoading}
                    >
                        {isLoading ? "Logging in..." : "Log In"}
                    </button>

                    <button
                        type="button"
                        className="forgot-password-button"
                        onClick={() => setError("Password reset is not available yet. Please contact your administrator.")}
                    >
                        Forgot password?
                    </button>

                </form>

            </div>

        </div>
    );
}

export default Login;