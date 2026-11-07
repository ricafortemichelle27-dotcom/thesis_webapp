import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
    departmentOptions,
    getProgram,
    getPrograms,
} from '../../utils/academicStructure.js';
import { loadEventTheme } from '../../utils/eventTheme.js';

import './Registration.css';

/* =========================================
   SIMPLE FORM ICON
   Uses inline SVG so no icon package
   is required.
   ========================================= */
function FieldIcon({ type }) {
    const paths = {
        user: (
            <>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7" />
            </>
        ),

        id: (
            <>
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <circle cx="9" cy="10" r="2" />
                <path d="M13 9h4M13 13h4M7 15h10" />
            </>
        ),

        email: (
            <>
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m4 7 8 6 8-6" />
            </>
        ),

        department: (
            <>
                <path d="M3 21h18" />
                <path d="M5 21V8l7-4 7 4v13" />
                <path d="M9 21v-6h6v6M8 10h1M15 10h1M8 13h1M15 13h1" />
            </>
        ),

        program: (
            <>
                <path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" />
                <path d="M6 11v5c2 2 10 2 12 0v-5" />
                <path d="M21 9v6" />
            </>
        ),

        year: (
            <>
                <path d="M4 8h16" />
                <path d="M6 4v4M18 4v4" />
                <rect x="4" y="5" width="16" height="15" rx="2" />
                <path d="M8 12h3M13 12h3M8 16h3M13 16h3" />
            </>
        ),
    };

    return (
        <span className="field-icon" aria-hidden="true">
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                {paths[type]}
            </svg>
        </span>
    );
}


function Registration() {
    const navigate = useNavigate();
    const [eventTheme, setEventTheme] = useState(loadEventTheme);

    useEffect(() => {
        const handleStorageChange = () => setEventTheme(loadEventTheme());

        window.addEventListener('storage', handleStorageChange);

        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    /* =========================================
       REGISTRATION FORM DATA
       ========================================= */
    const [formData, setFormData] = useState({
        lastName: '',
        firstName: '',
        middleName: '',
        suffix: '',
        studentId: '',
        email: '',
        department: '',
        program: '',
        yearLevel: '',
    });

    const yearLevels = [
        '1st Year',
        '2nd Year',
        '3rd Year',
        '4th Year',
    ];


    /* =========================================
       HANDLE FORM INPUT CHANGES
       ========================================= */
    const handleChange = (event) => {
        const { name, value } = event.target;

        /* -----------------------------------------
           Changing department resets:
           - program
           - year level
           ----------------------------------------- */
        if (name === 'department') {
            setFormData((previous) => ({
                ...previous,
                department: value,
                program: '',
                yearLevel: '',
            }));

            return;
        }


        /* -----------------------------------------
           Changing program automatically selects
           1st Year when the selected program is
           first-year-only.
           ----------------------------------------- */
        if (name === 'program') {
            setFormData((previous) => ({
                ...previous,
                program: value,
                yearLevel: getProgram(
                    previous.department,
                    value
                )?.firstYearOnly
                    ? '1st Year'
                    : '',
            }));

            return;
        }


        /* -----------------------------------------
           Normal input/select change
           ----------------------------------------- */
        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));
    };


    /* =========================================
       SUBMIT REGISTRATION

       The collected registration information
       is passed to the fingerprint page.
       ========================================= */
    const handleSubmit = (event) => {
        event.preventDefault();

        navigate('/fingerprint-registration', {
            state: {
                registration: formData,
            },
        });
    };


    /* =========================================
       CANCEL / RESET FORM
       ========================================= */
    const handleCancel = () => {
        setFormData({
            lastName: '',
            firstName: '',
            middleName: '',
            suffix: '',
            studentId: '',
            email: '',
            department: '',
            program: '',
            yearLevel: '',
        });
    };


    /* =========================================
       PROGRAM AND YEAR LEVEL DATA
       ========================================= */
    const availablePrograms = getPrograms(formData.department);

    const selectedProgram = getProgram(
        formData.department,
        formData.program
    );

    const isFirstYearOnly =
        selectedProgram?.firstYearOnly === true;


    return (
        <section
            className="registration-page"
            style={{
                '--registration-primary': eventTheme.primaryColor,
                '--registration-secondary': eventTheme.secondaryColor,
                '--registration-accent': eventTheme.accentColor,
            }}
        >

            {/* =====================================
                PAGE HEADER
                ===================================== */}
            <div className="registration-header">

                <h1>REGISTRATION</h1>

                <p>
                    Please fill in your information below.
                </p>

            </div>


            {/* =====================================
                REGISTRATION CARD
                ===================================== */}
            <div className="registration-card">

                <form onSubmit={handleSubmit}>

                    {/* =================================
                        PERSONAL INFORMATION
                        ================================= */}
                    <div className="registration-section-title">
                        Personal Information
                    </div>


                    {/* ---------------------------------
                        LAST NAME / FIRST NAME
                        --------------------------------- */}
                    <div className="registration-name-row">

                        <div className="registration-field">

                            <label htmlFor="lastName">
                                <FieldIcon type="user" />
                                LAST NAME
                            </label>

                            <input
                                id="lastName"
                                name="lastName"
                                type="text"
                                placeholder="Enter your last name"
                                value={formData.lastName}
                                onChange={handleChange}
                                required
                            />

                        </div>


                        <div className="registration-field">

                            <label htmlFor="firstName">
                                FIRST NAME
                            </label>

                            <input
                                id="firstName"
                                name="firstName"
                                type="text"
                                placeholder="Enter your first name"
                                value={formData.firstName}
                                onChange={handleChange}
                                required
                            />

                        </div>

                    </div>


                    {/* ---------------------------------
                        MIDDLE NAME / SUFFIX
                        --------------------------------- */}
                    <div className="registration-name-row">

                        <div className="registration-field">

                            <label htmlFor="middleName">
                                MIDDLE NAME
                            </label>

                            <input
                                id="middleName"
                                name="middleName"
                                type="text"
                                placeholder="Enter your middle name"
                                value={formData.middleName}
                                onChange={handleChange}
                                required
                            />

                        </div>


                        <div className="registration-field">

                            <label htmlFor="suffix">
                                SUFFIX
                                <span className="optional-text">
                                    (Optional)
                                </span>
                            </label>

                            <select
                                id="suffix"
                                name="suffix"
                                value={formData.suffix}
                                onChange={handleChange}
                            >
                                <option value="">
                                    None
                                </option>

                                <option value="Jr.">
                                    Jr.
                                </option>

                                <option value="Sr.">
                                    Sr.
                                </option>

                                <option value="II">
                                    II
                                </option>

                                <option value="III">
                                    III
                                </option>

                                <option value="IV">
                                    IV
                                </option>
                            </select>

                        </div>

                    </div>


                    {/* =================================
                        STUDENT INFORMATION
                        ================================= */}
                    <div className="registration-section-title">
                        Student Information
                    </div>


                    {/* ---------------------------------
                        STUDENT ID
                        --------------------------------- */}
                    <div className="registration-field">

                        <label htmlFor="studentId">
                            <FieldIcon type="id" />
                            STUDENT NUMBER
                        </label>

                        <input
                            id="studentId"
                            name="studentId"
                            type="text"
                            placeholder="Enter your student number"
                            value={formData.studentId}
                            onChange={handleChange}
                            required
                        />

                    </div>


                    {/* ---------------------------------
                        EMAIL
                        --------------------------------- */}
                    <div className="registration-field">

                        <label htmlFor="email">
                            <FieldIcon type="email" />
                            EMAIL ADDRESS
                        </label>

                        <input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="Enter your school email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />

                    </div>


                    {/* ---------------------------------
                        DEPARTMENT
                        --------------------------------- */}
                    <div className="registration-field">

                        <label htmlFor="department">
                            <FieldIcon type="department" />
                            DEPARTMENT
                        </label>

                        <select
                            id="department"
                            name="department"
                            value={formData.department}
                            onChange={handleChange}
                            required
                        >

                            <option value="">
                                Select your department
                            </option>

                            {departmentOptions.map((department) => (
                                <option
                                    key={department}
                                    value={department}
                                >
                                    {department}
                                </option>
                            ))}

                        </select>

                    </div>


                    {/* ---------------------------------
                        PROGRAM / COURSE
                        --------------------------------- */}
                    <div className="registration-field">

                        <label htmlFor="program">
                            <FieldIcon type="program" />
                            PROGRAM / COURSE
                        </label>

                        <select
                            id="program"
                            name="program"
                            value={formData.program}
                            onChange={handleChange}
                            disabled={!formData.department}
                            required
                        >

                            <option value="">
                                {formData.department
                                    ? 'Select your program / course'
                                    : 'Select department first'}
                            </option>

                            {availablePrograms.map((program) => (
                                <option
                                    key={program.name}
                                    value={program.name}
                                >
                                    {program.name}
                                </option>
                            ))}

                        </select>

                    </div>


                    {/* ---------------------------------
                        YEAR LEVEL
                        --------------------------------- */}
                    <div className="registration-field">

                        <label htmlFor="yearLevel">
                            <FieldIcon type="year" />
                            YEAR LEVEL
                        </label>

                        <select
                            id="yearLevel"
                            name="yearLevel"
                            value={formData.yearLevel}
                            onChange={handleChange}
                            disabled={isFirstYearOnly}
                            required
                        >

                            <option value="">
                                Select your year level
                            </option>

                            {yearLevels.map((year) => (
                                <option
                                    key={year}
                                    value={year}
                                >
                                    {year}
                                </option>
                            ))}

                        </select>

                    </div>


                    {/* =================================
                        DATA PRIVACY
                        ================================= */}
                    <div className="registration-privacy">

                        <input
                            id="privacyAgreement"
                            type="checkbox"
                            required
                        />

                        <div className="privacy-content">

                            <label htmlFor="privacyAgreement">
                                I agree to the collection and processing
                                of my personal information for event
                                attendance and registration purposes.
                            </label>

                            <button
                                type="button"
                                className="privacy-link"
                                onClick={() => {
                                    // Connect this to your Data Privacy
                                    // modal when the modal is implemented.
                                }}
                            >
                                View Data Privacy Notice
                            </button>

                        </div>

                    </div>


                    {/* =================================
                        FORM ACTIONS
                        ================================= */}
                    <div className="registration-actions">

                        {/* Cancel */}
                        <button
                            type="button"
                            className="cancel-button"
                            onClick={handleCancel}
                        >
                            Cancel
                        </button>


                        {/* Continue to fingerprint */}
                        <button
                            type="submit"
                            className="register-button"
                        >
                            Enroll your fingerprint
                            <span className="button-arrow">
                                →
                            </span>
                        </button>

                    </div>

                </form>

            </div>

        </section>
    );
}

export default Registration;