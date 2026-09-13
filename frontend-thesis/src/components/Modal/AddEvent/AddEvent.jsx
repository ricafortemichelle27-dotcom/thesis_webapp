import { useEffect, useState } from "react";
import {
    faXmark,
    faCalendarDays,
    faClock,
    faFilePdf,
    faCertificate,
    faCloudArrowUp,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import "./AddEvent.css";
import {
    departmentOptions,
    getPrograms,
} from "../../../utils/academicStructure.js";

const allDepartmentsLabel = "All Departments";
const allMajorProgramsLabel = "All Major/Programs";
const allYearLevelsLabel = "All Year Levels";

const yearLevelOptions = [
    "1st Year",
    "2nd Year",
    "3rd Year",
    "4th Year",
];

const hours = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
];

const getDropdownText = (items, placeholder, allLabel) => {
    if (!items.length) {
        return placeholder;
    }

    if (items.includes(allLabel)) {
        return allLabel;
    }

    if (items.length === 1) {
        return items[0];
    }

    return `${items.length} selected`;
};

function AddEvent({ isOpen, onClose, onCreate, existingEvent }) {
    const [eventName, setEventName] = useState("");
    const [department, setDepartment] = useState("");
    const [majorPrograms, setMajorPrograms] = useState([]);
    const [yearLevels, setYearLevels] = useState([]);
    const [eligibleParticipants, setEligibleParticipants] = useState([]);
    const [editingIndex, setEditingIndex] = useState(null);
    const [openDropdown, setOpenDropdown] = useState(null);

    const [eventDate, setEventDate] = useState("");
    const [startsHour, setStartsHour] = useState("");
    const [startsMinute, setStartsMinute] = useState("00");
    const [startsPeriod, setStartsPeriod] = useState("");
    const [endsHour, setEndsHour] = useState("");
    const [endsMinute, setEndsMinute] = useState("00");
    const [endsPeriod, setEndsPeriod] = useState("");

    const [approvalFile, setApprovalFile] = useState(null);
    const [certificateFile, setCertificateFile] = useState(null);

    const [error, setError] = useState("");

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        if (existingEvent) {
            const parseTimeValue = (timeValue) => {
                if (!timeValue) {
                    return {
                        hour: "",
                        minute: "00",
                        period: "",
                    };
                }

                const [hourString, minuteString] = timeValue.split(":");
                const hour = Number(hourString);
                const period = hour >= 12 ? "PM" : "AM";
                const displayHour = hour % 12 === 0 ? 12 : hour % 12;

                return {
                    hour: String(displayHour),
                    minute: minuteString || "00",
                    period,
                };
            };

            const starts = parseTimeValue(existingEvent.timeStart || existingEvent.time_start);
            const ends = parseTimeValue(existingEvent.timeEnd || existingEvent.time_end);

            setEventName(existingEvent.name || "");
            setEventDate(existingEvent.eventDate || existingEvent.date || "");
            setStartsHour(starts.hour);
            setStartsMinute(starts.minute);
            setStartsPeriod(starts.period);
            setEndsHour(ends.hour);
            setEndsMinute(ends.minute);
            setEndsPeriod(ends.period);
            setApprovalFile(
                existingEvent.letterOfApproval && existingEvent.letterOfApproval !== "—"
                    ? { name: existingEvent.letterOfApproval }
                    : null
            );
            setCertificateFile(
                existingEvent.certificateTemplate && existingEvent.certificateTemplate !== "—"
                    ? { name: existingEvent.certificateTemplate }
                    : null
            );
            setEligibleParticipants(
                (existingEvent.eligibility || []).map((item) => ({
                    department: item.department || allDepartmentsLabel,
                    majorPrograms: [item.major_program || allMajorProgramsLabel],
                    yearLevels: [item.year_level || allYearLevelsLabel],
                }))
            );
            setError("");
            return;
        }

        resetForm();
    }, [existingEvent, isOpen]);

    if (!isOpen) {
        return null;
    }

    const majorProgramOptions =
        department && department !== allDepartmentsLabel
            ? getPrograms(department).map((item) => item.name)
            : [];

    const resetForm = () => {
        setDepartment("");
        setMajorPrograms([]);
        setYearLevels([]);
        setEditingIndex(null);
        setOpenDropdown(null);

        setEventName("");
        setEventDate("");
        setStartsHour("");
        setStartsMinute("00");
        setStartsPeriod("");
        setEndsHour("");
        setEndsMinute("00");
        setEndsPeriod("");
        setApprovalFile(null);
        setCertificateFile(null);
        setError("");
    };

    const handleDepartmentChange = (e) => {
        const selectedDepartment = e.target.value;

        setDepartment(selectedDepartment);
        if (selectedDepartment === allDepartmentsLabel) {
            setMajorPrograms([allMajorProgramsLabel]);
            setYearLevels([allYearLevelsLabel]);
        } else {
            setMajorPrograms([]);
            setYearLevels([]);
        }
        setOpenDropdown(null);
        setError("");
    };

    const handleMajorProgramChange = (option) => {
        if (option === "General Engineering") {
            if (majorPrograms.includes(option)) {
                setMajorPrograms([]);
                setYearLevels([]);
            } else {
                setMajorPrograms([option]);
                setYearLevels(["1st Year"]);
            }
            return;
        }

        if (majorPrograms.includes("General Engineering")) {
            setMajorPrograms([option]);
            setYearLevels([]);
            return;
        }

        toggleMajorProgram(option);
    };

    const toggleDropdown = (dropdownName) => {
        setOpenDropdown((prev) => (prev === dropdownName ? null : dropdownName));
    };

    const toggleMajorProgram = (option) => {
        setError("");

        if (option === allMajorProgramsLabel) {
            setMajorPrograms((prevMajorPrograms) =>
                prevMajorPrograms.includes(allMajorProgramsLabel)
                    ? []
                    : [allMajorProgramsLabel]
            );
            return;
        }

        setMajorPrograms((prevMajorPrograms) => {
            let nextMajorPrograms = prevMajorPrograms.includes(allMajorProgramsLabel)
                ? []
                : [...prevMajorPrograms];

            if (nextMajorPrograms.includes(option)) {
                nextMajorPrograms = nextMajorPrograms.filter((item) => item !== option);
            } else {
                nextMajorPrograms.push(option);
            }

            if (majorProgramOptions.length > 1 && nextMajorPrograms.length === majorProgramOptions.length) {
                return [allMajorProgramsLabel];
            }

            return nextMajorPrograms;
        });
    };

    const toggleYearLevel = (option) => {
        setError("");

        if (option === allYearLevelsLabel) {
            setYearLevels((prevYearLevels) =>
                prevYearLevels.includes(allYearLevelsLabel)
                    ? []
                    : [allYearLevelsLabel]
            );
            return;
        }

        setYearLevels((prevYearLevels) => {
            let nextYearLevels = prevYearLevels.includes(allYearLevelsLabel)
                ? []
                : [...prevYearLevels];

            if (nextYearLevels.includes(option)) {
                nextYearLevels = nextYearLevels.filter(
                    (yearLevel) => yearLevel !== option
                );
            } else {
                nextYearLevels.push(option);
            }

            if (nextYearLevels.length === yearLevelOptions.length) {
                return [allYearLevelsLabel];
            }

            return nextYearLevels;
        });
    };

    const addDepartmentToEligibleParticipants = () => {
        if (!department) {
            setError("Please select a department first.");
            return;
        }

        if (!majorPrograms.length) {
            setError("Please select at least one Major/Program.");
            return;
        }

        if (!yearLevels.length) {
            setError("Please select at least one year level.");
            return;
        }

        const entry = {
            department,
            majorPrograms: [...majorPrograms],
            yearLevels: [...yearLevels],
        };

        if (editingIndex !== null) {
            setEligibleParticipants((prevEntries) =>
                prevEntries.map((item, index) =>
                    index === editingIndex ? entry : item
                )
            );
        } else {
            setEligibleParticipants((prevEntries) => [...prevEntries, entry]);
        }

        setDepartment("");
        setMajorPrograms([]);
        setYearLevels([]);
        setEditingIndex(null);
        setOpenDropdown(null);
        setError("");
    };

    const handleEditEntry = (index) => {
        const entry = eligibleParticipants[index];

        setDepartment(entry.department);
        setMajorPrograms(entry.majorPrograms || []);
        setYearLevels(entry.yearLevels);
        setEditingIndex(index);
        setOpenDropdown(null);
        setError("");
    };

    const handleDeleteEntry = (index) => {
        setEligibleParticipants((prevEntries) =>
            prevEntries.filter((_, itemIndex) => itemIndex !== index)
        );

        if (editingIndex === index) {
            setDepartment("");
            setMajorPrograms([]);
            setYearLevels([]);
            setEditingIndex(null);
        }

        setError("");
    };

    const handleFileChange = (e, setFile) => {
        const file = e.target.files[0];

        if (!file) {
            setFile(null);
            return;
        }

        if (file.type !== "application/pdf") {
            setError("Only PDF files are allowed.");
            e.target.value = "";
            setFile(null);
            return;
        }

        setError("");
        setFile(file);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (eligibleParticipants.length === 0) {
            setError("Please add at least one eligible participant group.");
            return;
        }

        if (
            !eventName.trim() ||
            !eventDate ||
            !startsHour ||
            !startsPeriod ||
            !endsHour ||
            !endsPeriod ||
            !approvalFile ||
            !certificateFile
        ) {
            setError("Please complete all required fields.");
            return;
        }

        const eventData = {
            eventName: eventName.trim(),
            eligibleParticipants: eligibleParticipants,
            date: eventDate,
            time: {
                starts: {
                    hour: startsHour,
                    minute: startsMinute,
                    period: startsPeriod,
                },
                ends: {
                    hour: endsHour,
                    minute: endsMinute,
                    period: endsPeriod,
                },
            },
            letterOfApproval: approvalFile,
            certificateTemplate: certificateFile,
        };

        try {
            if (onCreate) {
                await onCreate(eventData, existingEvent);
            }

            resetForm();
            onClose();
        } catch (submissionError) {
            setError(
                submissionError?.message ||
                    "Failed to create event. Please try again."
            );
        }
    };

    const renderDropdown = ({
        name,
        label,
        options,
        selected,
        onToggle,
        placeholder,
        disabled,
        required,
        allOptionLabel,
    }) => (
        <div className="form-group">
            <label htmlFor={name}>
                {label}
                {required && <span> *</span>}
            </label>

            <div
                className={`checkbox-dropdown-wrapper ${openDropdown === name ? "open" : ""}`}
            >
                <button
                    type="button"
                    className="checkbox-dropdown-trigger"
                    onClick={() => !disabled && toggleDropdown(name)}
                    disabled={disabled}
                >
                    <span className="checkbox-dropdown-text">
                        {getDropdownText(selected, placeholder, allOptionLabel)}
                    </span>
                </button>

                {openDropdown === name && !disabled && (
                    <div className="checkbox-dropdown-menu">
                        <div className="checkbox-dropdown-list">
                            {options.map((option) => (
                                <label
                                    key={`${name}-${option}`}
                                    className="checkbox-option-row"
                                >
                                    <span>{option}</span>
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(option)}
                                        onChange={() => onToggle(option)}
                                    />
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div
            className="add-event-overlay"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                    handleClose();
                }
            }}
        >
            <div className="add-event-modal">
                <div className="add-event-header">
                    <div className="add-event-title-wrapper">
                        <div className="add-event-title-icon">
                            <FontAwesomeIcon icon={faCalendarDays} />
                        </div>

                        <div>
                            <h2>Create Event</h2>
                            <p>Add a new event to the attendance system</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="add-event-close"
                        onClick={handleClose}
                        aria-label="Close modal"
                    >
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>

                <form className="add-event-form" onSubmit={handleSubmit}>
                    <div className="add-event-section">
                        <h3>Event Information</h3>

                        <div className="form-group">
                            <label htmlFor="eventName">
                                Event Name <span>*</span>
                            </label>

                            <input
                                id="eventName"
                                type="text"
                                placeholder="Enter event name"
                                value={eventName}
                                onChange={(e) => setEventName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="add-event-section">
                        <h3>Eligible Participants</h3>

                        <div className="participant-grid">
                            <div className="form-group">
                                <label htmlFor="department">
                                    Department <span>*</span>
                                </label>

                                <select
                                    id="department"
                                    value={department}
                                    onChange={handleDepartmentChange}
                                >
                                    <option value="" disabled>
                                        Select department
                                    </option>

                                    <option value={allDepartmentsLabel}>
                                        {allDepartmentsLabel}
                                    </option>

                                    {departmentOptions.map((item) => (
                                        <option key={item} value={item}>
                                            {item}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {renderDropdown({
                                name: "majorProgram",
                                label: "Major/Program",
                                options:
                                    majorProgramOptions.length > 1
                                        ? [allMajorProgramsLabel, ...majorProgramOptions]
                                        : majorProgramOptions,
                                selected: majorPrograms,
                                onToggle: handleMajorProgramChange,
                                placeholder: "Select Major/Program",
                                disabled:
                                    !department ||
                                    department === allDepartmentsLabel,
                                required: true,
                                allOptionLabel: allMajorProgramsLabel,
                            })}

                            <div className="form-group year-level-field">
                                <div className="year-level-header">
                                    <label htmlFor="yearLevel">
                                        Year Level <span>*</span>
                                    </label>
                                </div>

                                <div className="year-level-control">
                                    <div
                                        className={`checkbox-dropdown-wrapper ${openDropdown === "yearLevel" ? "open" : ""}`}
                                    >
                                        <button
                                            type="button"
                                            className="checkbox-dropdown-trigger"
                                            onClick={() =>
                                                department !== allDepartmentsLabel &&
                                                toggleDropdown("yearLevel")
                                            }
                                            disabled={!department || department === allDepartmentsLabel}
                                        >
                                            <span className="checkbox-dropdown-text">
                                                {getDropdownText(
                                                    yearLevels,
                                                    "Select year level",
                                                    allYearLevelsLabel
                                                )}
                                            </span>
                                        </button>

                                        {openDropdown === "yearLevel" && (
                                            <div className="checkbox-dropdown-menu">
                                                <div className="checkbox-dropdown-list">
                                                    {[allYearLevelsLabel, ...yearLevelOptions].map(
                                                        (option) => (
                                                            <label
                                                                key={`yearLevel-${option}`}
                                                                className="checkbox-option-row"
                                                            >
                                                                <span>{option}</span>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={yearLevels.includes(option)}
                                                                    onChange={() =>
                                                                        toggleYearLevel(option)
                                                                    }
                                                                />
                                                            </label>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        className="add-department-btn"
                                        onClick={addDepartmentToEligibleParticipants}
                                    >
                                        ADD ELIGIBILITY
                                    </button>
                                </div>
                            </div>
                        </div>

                        {eligibleParticipants.length > 0 && (
                            <div className="eligible-participants-list">
                                <h4>Eligible Participants</h4>

                                <div className="eligible-participants-table-wrap">
                                    <table className="eligible-participants-table">
                                        <thead>
                                            <tr>
                                                <th>Department</th>
                                                <th>Major/Program</th>
                                                <th>Year Level</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {eligibleParticipants.map((entry, index) => (
                                                <tr key={`${entry.department}-${index}`}>
                                                    <td>
                                                        {entry.department === allDepartmentsLabel
                                                            ? allDepartmentsLabel
                                                            : entry.department}
                                                    </td>
                                                    <td>{entry.majorPrograms.join(", ")}</td>
                                                    <td>{entry.yearLevels.join(", ")}</td>
                                                    <td className="table-actions">
                                                        <button
                                                            type="button"
                                                            className="edit-entry-btn"
                                                            onClick={() => handleEditEntry(index)}
                                                        >
                                                            Edit
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="delete-entry-btn"
                                                            onClick={() => handleDeleteEntry(index)}
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="add-event-section">
                        <h3>Date and Time</h3>

                        <div className="date-time-grid">
                            <div className="form-group">
                                <label htmlFor="eventDate">
                                    Event Date <span>*</span>
                                </label>

                                <div className="input-with-icon">
                                    <FontAwesomeIcon icon={faCalendarDays} />

                                    <input
                                        id="eventDate"
                                        type="date"
                                        value={eventDate}
                                        onChange={(e) => setEventDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="form-group event-time-group">
                                <label>
                                    Event Time <span>*</span>
                                </label>

                                <div className="event-time-rows">
                                    <div className="event-time-row">
                                        <strong>Starts</strong>

                                        <div className="time-selector">
                                            <div className="time-input-wrapper">
                                                <FontAwesomeIcon icon={faClock} />

                                                <select
                                                    value={startsHour}
                                                    onChange={(e) =>
                                                        setStartsHour(e.target.value)
                                                    }
                                                >
                                                    <option value="" disabled>
                                                        Hour
                                                    </option>
                                                    {hours.map((hour) => (
                                                        <option key={hour} value={hour}>
                                                            {hour}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <select
                                                className="minute-select"
                                                value={startsMinute}
                                                onChange={(e) =>
                                                    setStartsMinute(e.target.value)
                                                }
                                            >
                                                <option value="00">00</option>
                                                <option value="15">15</option>
                                                <option value="30">30</option>
                                                <option value="45">45</option>
                                            </select>

                                            <select
                                                className="period-select"
                                                value={startsPeriod}
                                                onChange={(e) =>
                                                    setStartsPeriod(e.target.value)
                                                }
                                            >
                                                <option value="" disabled>
                                                    AM / PM
                                                </option>
                                                <option value="AM">AM</option>
                                                <option value="PM">PM</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="event-time-row">
                                        <strong>Ends</strong>

                                        <div className="time-selector">
                                            <div className="time-input-wrapper">
                                                <FontAwesomeIcon icon={faClock} />

                                                <select
                                                    value={endsHour}
                                                    onChange={(e) =>
                                                        setEndsHour(e.target.value)
                                                    }
                                                >
                                                    <option value="" disabled>
                                                        Hour
                                                    </option>
                                                    {hours.map((hour) => (
                                                        <option key={hour} value={hour}>
                                                            {hour}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <select
                                                className="minute-select"
                                                value={endsMinute}
                                                onChange={(e) =>
                                                    setEndsMinute(e.target.value)
                                                }
                                            >
                                                <option value="00">00</option>
                                                <option value="15">15</option>
                                                <option value="30">30</option>
                                                <option value="45">45</option>
                                            </select>

                                            <select
                                                className="period-select"
                                                value={endsPeriod}
                                                onChange={(e) =>
                                                    setEndsPeriod(e.target.value)
                                                }
                                            >
                                                <option value="" disabled>
                                                    AM / PM
                                                </option>
                                                <option value="AM">AM</option>
                                                <option value="PM">PM</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="add-event-section">
                        <h3>Event Documents</h3>

                        <div className="upload-grid">
                            <div className="upload-group">
                                <label>
                                    Letter of Approval <span>*</span>
                                </label>

                                <label className="pdf-upload-box">
                                    <input
                                        type="file"
                                        accept="application/pdf,.pdf"
                                        onChange={(e) =>
                                            handleFileChange(e, setApprovalFile)
                                        }
                                    />

                                    <div className="upload-icon">
                                        <FontAwesomeIcon icon={faFilePdf} />
                                    </div>

                                    <div className="upload-content">
                                        <strong>
                                            {approvalFile
                                                ? approvalFile.name
                                                : "Upload Letter of Approval"}
                                        </strong>

                                        <span>PDF files only</span>
                                    </div>

                                    <FontAwesomeIcon
                                        className="upload-arrow"
                                        icon={faCloudArrowUp}
                                    />
                                </label>
                            </div>

                            <div className="upload-group">
                                <label>
                                    Certificate Template <span>*</span>
                                </label>

                                <label className="pdf-upload-box">
                                    <input
                                        type="file"
                                        accept="application/pdf,.pdf"
                                        onChange={(e) =>
                                            handleFileChange(e, setCertificateFile)
                                        }
                                    />

                                    <div className="upload-icon">
                                        <FontAwesomeIcon icon={faCertificate} />
                                    </div>

                                    <div className="upload-content">
                                        <strong>
                                            {certificateFile
                                                ? certificateFile.name
                                                : "Upload Certificate Template"}
                                        </strong>

                                        <span>PDF files only</span>
                                    </div>

                                    <FontAwesomeIcon
                                        className="upload-arrow"
                                        icon={faCloudArrowUp}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>

                    {error && <div className="add-event-error">{error}</div>}

                    <div className="add-event-footer">
                        <button
                            type="button"
                            className="cancel-event-btn"
                            onClick={handleClose}
                        >
                            Cancel
                        </button>

                        <button type="submit" className="submit-event-btn">
                            Create Event
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddEvent;
