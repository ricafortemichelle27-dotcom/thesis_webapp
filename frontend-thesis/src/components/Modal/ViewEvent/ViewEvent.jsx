import { useEffect, useRef, useState } from "react";
import { apiBaseUrl } from "../../../utils/api.js";
import "./ViewEvent.css";

function ImagePreview({ value, label }) {
    const imageRef = useRef(null);
    useEffect(() => {
        if (!value || !imageRef.current) return;
        const objectUrl = value instanceof Blob ? URL.createObjectURL(value) : null;
        imageRef.current.src = objectUrl || (/^https?:\/\//.test(value)
            ? value : `${apiBaseUrl}${value.startsWith('/') ? '' : '/uploads/'}${value}`);
        return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [value]);
    return value ? <img ref={imageRef} className="kiosk-image-preview" alt={label} /> : null;
}

function ViewEventModal({
    isOpen,
    event,
    onClose,
    isEventAdmin = false,
    onSaveKioskSettings,
}) {
    const [photoboothAvailable, setPhotoboothAvailable] = useState(Boolean(event?.photobooth_start && event?.photobooth_end));
    const [speakerName, setSpeakerName] = useState("");
    const [editingSpeakerId, setEditingSpeakerId] = useState(null);
    const [saveSucceeded, setSaveSucceeded] = useState(false);
    const [photoboothStart, setPhotoboothStart] = useState((event?.photobooth_start || '').slice(0, 5));
    const [photoboothEnd, setPhotoboothEnd] = useState((event?.photobooth_end || '').slice(0, 5));
    const [kioskThemeMode, setKioskThemeMode] = useState(event?.kiosk_theme_mode || 'wis');
    const [backgroundDisplayPhoto, setBackgroundDisplayPhoto] = useState(event?.background_display_photo || null);
    const [eventLogo, setEventLogo] = useState(event?.event_logo || null);
    const [eventDescription, setEventDescription] = useState(event?.event_description || '');
    const [eventSpeakers, setEventSpeakers] = useState(event?.speakers || []);
    const [isSpeakerModalOpen, setIsSpeakerModalOpen] = useState(false);
    const [speakerPhoto, setSpeakerPhoto] = useState(null);
    const [speakerDescription, setSpeakerDescription] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState("");

    if (!isOpen || !event) {
        return null;
    }

    const formatDisplayDate = (dateValue) => {
        if (!dateValue) return "Not specified";

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

    const formatDisplayTime = (timeValue) => {
        if (!timeValue) return "Not specified";

        const value = String(timeValue);

        // Supports HH:mm:ss / HH:mm values from the database.
        const match = value.match(/^(\d{1,2}):(\d{2})/);

        if (!match) return value;

        const hours = Number(match[1]);
        const minutes = match[2];

        if (hours >= 0 && hours <= 23) {
            const period = hours >= 12 ? "PM" : "AM";
            const displayHour = hours % 12 || 12;

            return `${displayHour}:${minutes} ${period}`;
        }

        return value;
    };

    const getFileUrl = (fileName) => {
        if (!fileName || fileName === "—") {
            return "";
        }

        if (String(fileName).startsWith("http")) {
            return fileName;
        }

        return `${apiBaseUrl}${String(fileName).startsWith("/") ? "" : "/uploads/"}${fileName}`;
    };

    const getEligibilityText = (value, fallback = "All") => {
        if (!value || value.length === 0) {
            return fallback;
        }

        return Array.isArray(value) ? value.join(", ") : value;
    };

    const handleSaveKioskSettings = async () => {
        setSaveSucceeded(false);
        if (photoboothAvailable && (!photoboothStart || !photoboothEnd)) {
            setSaveMessage("Please enter both the start and end time.");
            return;
        }

        if (photoboothAvailable && photoboothStart >= photoboothEnd) {
            setSaveMessage("The photobooth end time must be later than the start time.");
            return;
        }

        try {
            setIsSaving(true);
            setSaveMessage("");

            if (!onSaveKioskSettings) throw new Error('Event saving is unavailable.');
            const form = new FormData();
            form.append('event_description', eventDescription);
            form.append('kiosk_theme_mode', kioskThemeMode);
            form.append('photobooth_start', photoboothAvailable ? photoboothStart : '');
            form.append('photobooth_end', photoboothAvailable ? photoboothEnd : '');
            if (eventLogo instanceof File) form.append('event_logo', eventLogo);
            if (backgroundDisplayPhoto instanceof File) form.append('background_display_photo', backgroundDisplayPhoto);
            let photoIndex = 0;
            const speakers = eventSpeakers.map((speaker) => {
                const entry = {
                    id: speaker.isNew ? null : speaker.id,
                    name: speaker.name || '', description: speaker.description || '',
                };
                if (speaker.photo instanceof File) {
                    entry.photo_index = photoIndex++;
                    form.append('speaker_photos', speaker.photo);
                }
                return entry;
            });
            form.append('speakers', JSON.stringify(speakers));
            await onSaveKioskSettings(event.id, form);
        } catch (error) {
            setSaveMessage(
                error.message || "Failed to save event configuration."
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleDoneSpeaker = () => {
        if (!speakerName.trim() && !speakerPhoto && !speakerDescription.trim()) {
            return;
        }

        const details = { name: speakerName.trim(), photo: speakerPhoto, description: speakerDescription.trim() };
        setEventSpeakers((currentSpeakers) => editingSpeakerId !== null
            ? currentSpeakers.map((speaker) => speaker.id === editingSpeakerId ? { ...speaker, ...details } : speaker)
            : [...currentSpeakers, { id: crypto.randomUUID(), isNew: true, ...details }]);
        setEditingSpeakerId(null);
        setSpeakerName("");
        setSpeakerPhoto(null);
        setSpeakerDescription("");
        setIsSpeakerModalOpen(false);
    };

    const openSpeakerEditor = (speaker = null) => {
        setEditingSpeakerId(speaker?.id ?? null);
        setSpeakerName(speaker?.name || '');
        setSpeakerPhoto(speaker?.photo || null);
        setSpeakerDescription(speaker?.description || '');
        setIsSpeakerModalOpen(true);
    };

    const moveSpeaker = (index, direction) => {
        setEventSpeakers((current) => {
            const next = [...current];
            [next[index], next[index + direction]] = [next[index + direction], next[index]];
            return next;
        });
    };

    const handleRemoveSpeaker = (speakerId) => {
        setEventSpeakers((currentSpeakers) =>
            currentSpeakers.filter((speaker) => speaker.id !== speakerId)
        );
    };

    const eligibility = Array.isArray(event.eligibility)
        ? event.eligibility
        : [];

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

    const letterOfApprovalUrl = getFileUrl(
        event.letterOfApproval || event.letter_of_approval
    );

    const certificateTemplateUrl = getFileUrl(
        event.certificateTemplate || event.certificate_template
    );

    return (
        <div
            className="view-event-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="view-event-title"
        >
            <div className="view-event-modal">
                <header className="view-event-modal-header">
                    <div>
                        <span className="view-event-modal-label">
                            Event Details
                        </span>

                        <h1 id="view-event-title">
                            {event.name || event.event_name || "Untitled Event"}
                        </h1>

                        {event.status && (
                            <span
                                className={`view-event-status-badge ${event.status}`}
                            >
                                {event.status.charAt(0).toUpperCase() +
                                    event.status.slice(1)}
                            </span>
                        )}

                        {!isEventAdmin && (
                            <p className="view-event-admin-name">
                                Event Admin:{" "}
                                <strong>
                                    {event.admin ||
                                        event.event_admin_name ||
                                        "Not specified"}
                                </strong>
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        className="view-event-close-btn"
                        onClick={onClose}
                        aria-label="Close event details"
                    >
                        ×
                    </button>
                </header>

                <main className="view-event-modal-content">
                    <section className="view-event-section">
                        <div className="view-event-section-heading">
                            <h2>Event Information</h2>
                            <p>Required information for this event.</p>
                        </div>

                        <div className="view-event-info-grid">
                            <div className="view-event-info-item">
                                <span>Event Date</span>
                                <strong>
                                    {formatDisplayDate(
                                        event.eventDate || event.event_date
                                    )}
                                </strong>
                            </div>

                            <div className="view-event-info-item">
                                <span>Event Time</span>
                                <strong>
                                    {formatDisplayTime(
                                        event.timeStart || event.time_start
                                    )}
                                    {" - "}
                                    {formatDisplayTime(
                                        event.timeEnd || event.time_end
                                    )}
                                </strong>
                            </div>

                            <div className="view-event-info-item view-event-location-item">
                                <span>Location</span>
                                <strong>
                                    {event.location ||
                                        event.venue ||
                                        event.event_location ||
                                        "Not specified"}
                                </strong>
                            </div>
                        </div>
                    </section>

                    <section className="view-event-section">
                        <div className="view-event-section-heading">
                            <h2>Eligible Participants</h2>
                            <p>
                                Students who are eligible to participate in
                                this event.
                            </p>
                        </div>

                        <div className="view-event-eligibility-grid">
                            <div className="view-event-eligibility-card">
                                <span>Department</span>
                                <strong>
                                    {getEligibilityText(
                                        departments,
                                        event.department || "All Departments"
                                    )}
                                </strong>
                            </div>

                            <div className="view-event-eligibility-card">
                                <span>Major / Program</span>
                                <strong>
                                    {getEligibilityText(
                                        majorPrograms,
                                        event.majorProgram ||
                                            "All Major / Programs"
                                    )}
                                </strong>
                            </div>

                            <div className="view-event-eligibility-card">
                                <span>Year Level</span>
                                <strong>
                                    {getEligibilityText(
                                        yearLevels,
                                        event.yearLevel || "All Year Levels"
                                    )}
                                </strong>
                            </div>
                        </div>

                        {eligibility.length > 0 && (
                            <div className="view-event-eligibility-table-wrapper">
                                <table className="view-event-eligibility-table">
                                    <thead>
                                        <tr>
                                            <th>Department</th>
                                            <th>Major / Program</th>
                                            <th>Year Level</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {eligibility.map((item, index) => (
                                            <tr
                                                key={`${item.department || "department"}-${item.major_program || "program"}-${item.year_level || "year"}-${index}`}
                                            >
                                                <td>
                                                    {item.department ||
                                                        "All Departments"}
                                                </td>
                                                <td>
                                                    {item.major_program ||
                                                        "All Major / Programs"}
                                                </td>
                                                <td>
                                                    {item.year_level ||
                                                        "All Year Levels"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    <section className="view-event-section">
                        <div className="view-event-section-heading">
                            <h2>Event Documents</h2>
                            <p>
                                Preview the documents uploaded for this event.
                            </p>
                        </div>

                        <div className="view-event-document-grid">
                            <div className="view-event-document-card">
                                <div className="view-event-document-header">
                                    <div>
                                        <span>Letter of Approval</span>
                                        <strong>
                                            {event.letterOfApproval ||
                                                event.letter_of_approval ||
                                                "No file uploaded"}
                                        </strong>
                                    </div>
                                </div>

                                {letterOfApprovalUrl ? (
                                    <iframe
                                        title="Letter of Approval Preview"
                                        src={letterOfApprovalUrl}
                                        className="view-event-pdf-preview"
                                    />
                                ) : (
                                    <div className="view-event-pdf-empty">
                                        No Letter of Approval available.
                                    </div>
                                )}
                            </div>

                            <div className="view-event-document-card">
                                <div className="view-event-document-header">
                                    <div>
                                        <span>Certificate Template</span>
                                        <strong>
                                            {event.certificateTemplate ||
                                                event.certificate_template ||
                                                "No file uploaded"}
                                        </strong>
                                    </div>
                                </div>

                                {certificateTemplateUrl ? (
                                    <iframe
                                        title="Certificate Template Preview"
                                        src={certificateTemplateUrl}
                                        className="view-event-pdf-preview"
                                    />
                                ) : (
                                    <div className="view-event-pdf-empty">
                                        No Certificate Template available.
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {isEventAdmin && (
                        <section className="view-event-section kiosk-settings-section">
                            <div className="view-event-section-heading">
                                <h2>Kiosk Settings</h2>
                                <p>
                                    Configure the event-specific content and
                                    appearance displayed on the event kiosk.
                                </p>
                            </div>

                            <fieldset className="kiosk-settings-card" disabled={isSaving}>

                                {/* =========================
                                    EVENT PAGE THEME
                                ========================== */}
                                <div className="kiosk-settings-group">
                                    <div className="kiosk-settings-title">
                                        <span>Event Page Theme</span>
                                        <small>
                                            Choose whether the event page will
                                            retain the WIS theme or use a
                                            customized event theme.
                                        </small>
                                    </div>

                                    <div className="kiosk-theme-options">
                                        <label className="kiosk-theme-option">
                                            <input
                                                type="radio"
                                                name="kioskThemeMode"
                                                value="wis"
                                                checked={kioskThemeMode === "wis"}
                                                onChange={() =>
                                                    setKioskThemeMode("wis")
                                                }
                                            />
                                            <span>
                                                <strong>Retain WIS Theme</strong>
                                                <small>
                                                    Use the existing WIS theme
                                                    for this event.
                                                </small>
                                            </span>
                                        </label>

                                        <label className="kiosk-theme-option">
                                            <input
                                                type="radio"
                                                name="kioskThemeMode"
                                                value="custom"
                                                checked={
                                                    kioskThemeMode === "custom"
                                                }
                                                onChange={() =>
                                                    setKioskThemeMode("custom")
                                                }
                                            />
                                            <span>
                                                <strong>
                                                    Customize Event Theme
                                                </strong>
                                                <small>
                                                    Use a custom background
                                                    photo and event logo.
                                                </small>
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                <div className="kiosk-logo-upload">
                                    <label className="kiosk-upload-field">
                                        <span>Event Logo</span>
                                        <small>
                                            Upload the logo that will be
                                            displayed on the event page,
                                            regardless of the selected theme.
                                        </small>

                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) =>
                                                setEventLogo(
                                                    e.target.files?.[0] || null
                                                )
                                            }
                                        />

                                        <ImagePreview value={eventLogo} label="Event logo preview" />
                                        {eventLogo && (
                                            <small className="kiosk-file-name">
                                                {eventLogo.name || "Saved event logo"}
                                            </small>
                                        )}
                                    </label>
                                </div>

                                {/* =========================
                                    CUSTOM THEME
                                ========================== */}
                                {kioskThemeMode === "custom" && (
                                    <div className="kiosk-custom-theme">
                                        <div className="kiosk-upload-grid">
                                            <label className="kiosk-upload-field">
                                                <span>
                                                    Background Display Photo
                                                </span>
                                                <small>
                                                    Upload the background image
                                                    that will be displayed on
                                                    the event page.
                                                </small>

                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) =>
                                                        setBackgroundDisplayPhoto(
                                                            e.target.files?.[0] ||
                                                                null
                                                        )
                                                    }
                                                />

                                                <ImagePreview value={backgroundDisplayPhoto} label="Custom background preview" />
                                                {backgroundDisplayPhoto && (
                                                    <small className="kiosk-file-name">
                                                        {
                                                            backgroundDisplayPhoto.name || "Saved background"
                                                        }
                                                    </small>
                                                )}
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* =========================
                                    EVENT DESCRIPTION
                                ========================== */}
                                <div className="kiosk-settings-group">
                                    <div className="kiosk-settings-title">
                                        <span>Event Description</span>
                                        <small>
                                            Add the description that will be
                                            displayed on the event page of the
                                            kiosk.
                                        </small>
                                    </div>

                                    <textarea
                                        className="kiosk-event-description"
                                        value={eventDescription}
                                        onChange={(e) =>
                                            setEventDescription(e.target.value)
                                        }
                                        placeholder="Enter the event description..."
                                        rows={5}
                                    />
                                </div>

                                {/* =========================
                                    EVENT SPEAKERS
                                ========================== */}
                                <div className="kiosk-settings-group">
                                    <div className="kiosk-settings-title">
                                        <span>Event Speakers</span>
                                        <small>
                                            Add the speakers who will be
                                            introduced on the event kiosk.
                                            Save Kiosk Settings saves their details and order.
                                        </small>
                                    </div>

                                    {eventSpeakers.length > 0 && (
                                        <div className="kiosk-speakers-list">
                                            {eventSpeakers.map(
                                                (speaker, index) => (
                                                    <div
                                                        className="kiosk-speaker-card"
                                                        key={speaker.id}
                                                    >
                                                        <ImagePreview value={speaker.photo} label={speaker.name || "Speaker photo"} />
                                                        <div className="kiosk-speaker-card-body">
                                                        <div className="kiosk-speaker-card-header">
                                                            <strong>
                                                                {speaker.name || `Speaker ${index + 1}`}
                                                            </strong>

                                                            <button type="button" className="kiosk-remove-speaker-btn" onClick={() => openSpeakerEditor(speaker)}>Edit</button>
                                                            <button
                                                                type="button"
                                                                className="kiosk-remove-speaker-btn"
                                                                onClick={() =>
                                                                    handleRemoveSpeaker(
                                                                        speaker.id
                                                                    )
                                                                }
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>

                                                        <div className="kiosk-speaker-order">
                                                            <button type="button" disabled={index === 0 || isSaving} onClick={() => moveSpeaker(index, -1)}>Move up</button>
                                                            <button type="button" disabled={index === eventSpeakers.length - 1 || isSaving} onClick={() => moveSpeaker(index, 1)}>Move down</button>
                                                        </div>
                                                        {speaker.photo && (
                                                            <small className="kiosk-file-name">
                                                                {
                                                                    speaker.photo.name || "Saved speaker photo"
                                                                }
                                                            </small>
                                                        )}

                                                        <p>
                                                            {speaker.description ||
                                                                "Speaker description not yet added."}
                                                        </p>
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        className="kiosk-add-speaker-btn"
                                        onClick={() => openSpeakerEditor()}
                                        disabled={eventSpeakers.length >= 20}
                                    >
                                        + Add Event Speaker
                                    </button>
                                </div>

                                {/* =========================
                                    PHOTObOOTH AVAILABILITY
                                ========================== */}
                                <div className="kiosk-settings-group">
                                    <div className="kiosk-settings-title">
                                        <span>Photobooth Availability</span>
                                        <small>
                                            This controls the photobooth
                                            schedule for this event only.
                                        </small>
                                    </div>

                                    <label className="kiosk-availability"><input type="checkbox" checked={photoboothAvailable} onChange={(e) => setPhotoboothAvailable(e.target.checked)} /> Photobooth available</label>
                                    <div className="kiosk-time-grid">
                                        <label>
                                            <span>Available From</span>
                                            <input
                                                type="time"
                                                disabled={!photoboothAvailable}
                                                value={photoboothStart}
                                                onChange={(e) =>
                                                    setPhotoboothStart(
                                                        e.target.value
                                                    )
                                                }
                                            />
                                        </label>

                                        <label>
                                            <span>Available Until</span>
                                            <input
                                                type="time"
                                                disabled={!photoboothAvailable}
                                                value={photoboothEnd}
                                                onChange={(e) =>
                                                    setPhotoboothEnd(
                                                        e.target.value
                                                    )
                                                }
                                            />
                                        </label>
                                    </div>
                                </div>

                                {/* =========================
                                    SPEAKER MODAL
                                    Future speaker file/details can be added here.
                                ========================== */}
                                {isSpeakerModalOpen && (
                                    <div className="kiosk-speaker-modal-backdrop">
                                        <div
                                            className="kiosk-speaker-modal"
                                            role="dialog"
                                            aria-modal="true"
                                            aria-labelledby="speaker-modal-title"
                                        >
                                            <div className="kiosk-speaker-modal-header">
                                                <div>
                                                    <h3 id="speaker-modal-title">
                                                        {editingSpeakerId === null ? 'Add Event Speaker' : 'Edit Event Speaker'}
                                                    </h3>
                                                    <p>
                                                        Add the speaker photo
                                                        and description.
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    className="kiosk-speaker-modal-close"
                                                    onClick={() =>
                                                        setIsSpeakerModalOpen(
                                                            false
                                                        )
                                                    }
                                                    aria-label="Close speaker modal"
                                                >
                                                    ×
                                                </button>
                                            </div>

                                            <div className="kiosk-speaker-modal-body">
                                                <label className="kiosk-upload-field"><span>Speaker name (optional)</span><input value={speakerName} maxLength={200} onChange={(e) => setSpeakerName(e.target.value)} /></label>
                                                <label className="kiosk-upload-field">
                                                    <span>Speaker Photo</span>
                                                    <ImagePreview value={speakerPhoto} label="Speaker photo preview" />
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) =>
                                                            setSpeakerPhoto(
                                                                e.target.files?.[0] ||
                                                                    null
                                                            )
                                                        }
                                                    />
                                                </label>

                                                <label className="kiosk-upload-field">
                                                    <span>
                                                        Speaker Description
                                                    </span>
                                                    <textarea
                                                        value={
                                                            speakerDescription
                                                        }
                                                        onChange={(e) =>
                                                            setSpeakerDescription(
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="Enter the speaker description..."
                                                        rows={5}
                                                    />
                                                </label>

                                                {/* Add the additional speaker file/details here later. */}
                                            </div>

                                            <div className="kiosk-speaker-modal-actions">
                                                <button
                                                    type="button"
                                                    className="kiosk-speaker-cancel-btn"
                                                    onClick={() =>
                                                        setIsSpeakerModalOpen(
                                                            false
                                                        )
                                                    }
                                                >
                                                    Cancel
                                                </button>

                                                <button
                                                    type="button"
                                                    className="kiosk-save-btn"
                                                    onClick={
                                                        handleDoneSpeaker
                                                    }
                                                >
                                                    Done
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {saveMessage && (
                                    <p
                                        className={`kiosk-settings-message ${
                                            saveSucceeded
                                                ? "success"
                                                : "error"
                                        }`}
                                    >
                                        {saveMessage}
                                    </p>
                                )}

                                <div className="kiosk-settings-actions">
                                    <button
                                        type="button"
                                        className="kiosk-save-btn"
                                        onClick={handleSaveKioskSettings}
                                        disabled={isSaving}
                                    >
                                        {isSaving
                                            ? "Saving..."
                                            : "Save Kiosk Settings"}
                                    </button>
                                </div>
                            </fieldset>
                        </section>
                    )}
                </main>

                <footer className="view-event-modal-footer">
                    <span>
                        Event #{event.id || "—"}
                    </span>

                    <button
                        type="button"
                        className="view-event-footer-close-btn"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </footer>
            </div>
        </div>
    );
}

export default ViewEventModal;
