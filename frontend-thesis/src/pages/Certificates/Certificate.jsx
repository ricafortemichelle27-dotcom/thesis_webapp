import React, { useEffect, useState } from "react";
import "./Certificate.css";
import { getCurrentUser } from "../../utils/cookiesUtils.js";
import { apiBaseUrl, apiUrl } from "../../utils/api.js";

import {
    FontAwesomeIcon,
    faCertificate,
    faFilePdf,
    faEye,
} from "../../utils/icons.js";


function Certificate() {
    const user = getCurrentUser();
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchApprovedEvents = async () => {
        try {
            setIsLoading(true);
            setError("");

            const response = await fetch(
                apiUrl(`/api/certificates/events?requested_by_user_id=${user?.id || ""}`)
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to load approved events.");
            }

            setTemplates(
                (Array.isArray(data.events) ? data.events : []).map((event) => ({
                    id: event.id,
                    eventName: event.event_name,
                    eventDate: event.event_date,
                    fileName: event.certificate_template
                        ? event.certificate_template.split("/").pop()
                        : "Template unavailable",
                    certificateTemplate: event.certificate_template,
                    certificatesSent: 0,
                }))
            );
        } catch (fetchError) {
            setTemplates([]);
            setError(fetchError.message || "Failed to load approved events.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchApprovedEvents();
    }, [user?.id]);


    /* =====================================================
       VIEW TEMPLATE
    ===================================================== */

    const handleViewTemplate = (template) => {
        if (!template.certificateTemplate) {
            return;
        }

        const fileUrl = template.certificateTemplate.startsWith("http")
            ? template.certificateTemplate
            : `${apiBaseUrl}${template.certificateTemplate}`;

        window.open(fileUrl, "_blank", "noopener,noreferrer");
    };


    return (
        <div className="certificate-page">


            {/* =================================================
                INFORMATION CARD
            ================================================= */}

            <div className="certificate-info-card">

                <div className="certificate-info-icon">

                    <FontAwesomeIcon
                        icon={faCertificate}
                    />

                </div>


                <div className="certificate-info-content">

                    <h3>
                        Certificate Templates
                    </h3>

                    <p>
                        Only approved events appear here. Previewing a
                        template does not generate or send certificates.
                    </p>

                </div>

            </div>


            {/* =================================================
                TEMPLATE SECTION
            ================================================= */}

            <section className="certificate-section">

                <div className="certificate-section-header">

                    <div>

                        <h2>
                            Approved Events
                        </h2>

                        <p>
                            Certificate templates available for approved events.
                        </p>

                    </div>


                    <div className="template-count">

                        <span className="template-count-number">
                            {templates.length}
                        </span>

                        <span className="template-count-label">
                            Templates
                        </span>

                    </div>

                </div>


                {/* =================================================
                    DESKTOP TABLE
                ================================================= */}

                <div className="certificate-table-container">

                    <table className="certificate-table">

                        <thead>

                            <tr>

                                <th>
                                    EVENT
                                </th>

                                <th>
                                    UPLOADED TEMPLATE
                                </th>

                                <th>
                                    EVENT DATE
                                </th>

                                <th>
                                    ACTION
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            {templates.length > 0 ? (

                                templates.map((template, index) => (

                                    <tr key={template.id}>

                                        {/* EVENT */}

                                        <td>

                                            <div className="certificate-event-cell">

                                                <div className="certificate-event-number">
                                                    {String(
                                                        index + 1
                                                    ).padStart(
                                                        2,
                                                        "0"
                                                    )}
                                                </div>


                                                <div className="certificate-event-details">

                                                    <strong>
                                                        {
                                                            template.eventName
                                                        }
                                                    </strong>

                                                    <span>
                                                        Event #
                                                        {
                                                            template.id
                                                        }
                                                    </span>

                                                </div>

                                            </div>

                                        </td>


                                        {/* TEMPLATE */}

                                        <td>

                                            <div className="template-file-cell">

                                                <div className="template-file-icon">

                                                    <FontAwesomeIcon
                                                        icon={
                                                            faFilePdf
                                                        }
                                                    />

                                                </div>


                                                <div className="template-file-details">

                                                    <strong>
                                                        {
                                                            template.fileName
                                                        }
                                                    </strong>

                                                    <span>
                                                        PDF Template
                                                    </span>

                                                </div>

                                            </div>

                                        </td>


                                        {/* EVENT DATE */}

                                        <td>

                                            <div className="sent-details">
                                                <strong>
                                                    {template.eventDate || "—"}
                                                </strong>
                                                <span>Approved event</span>
                                            </div>

                                        </td>


                                        {/* ACTION */}

                                        <td>

                                            <div className="certificate-actions">

                                                <button
                                                    type="button"
                                                    className="certificate-view-btn"
                                                    title={template.certificateTemplate
                                                        ? "Preview Template"
                                                        : "Certificate template unavailable"}
                                                    disabled={!template.certificateTemplate}
                                                    onClick={() =>
                                                        handleViewTemplate(
                                                            template
                                                        )
                                                    }
                                                >

                                                    <FontAwesomeIcon
                                                        icon={
                                                            faEye
                                                        }
                                                    />

                                                    <span>
                                                        View
                                                    </span>

                                                </button>


                                            </div>

                                        </td>

                                    </tr>

                                ))

                            ) : (

                                <tr>

                                    <td
                                        colSpan="4"
                                        className="certificate-empty-cell"
                                    >

                                        <div className="certificate-empty-state">

                                            <div className="certificate-empty-icon">

                                                <FontAwesomeIcon
                                                    icon={
                                                        faCertificate
                                                    }
                                                />

                                            </div>

                                            <h3>
                                                {isLoading
                                                    ? "Loading approved events"
                                                    : error
                                                        ? "Unable to load approved events"
                                                        : "No Approved Events"}
                                            </h3>

                                            <p>
                                                {error ||
                                                    "Approved events with certificate templates will appear here."}
                                            </p>

                                        </div>

                                    </td>

                                </tr>

                            )}

                        </tbody>

                    </table>

                </div>


                {/* =================================================
                    MOBILE CARDS
                ================================================= */}

                <div className="mobile-template-list">

                    {templates.map((template, index) => (

                        <div
                            className="mobile-template-card"
                            key={template.id}
                        >

                            <div className="mobile-template-top">

                                <div className="certificate-event-number">
                                    {String(
                                        index + 1
                                    ).padStart(
                                        2,
                                        "0"
                                    )}
                                </div>


                                <div>

                                    <h3>
                                        {template.eventName}
                                    </h3>

                                    <span>
                                        Event #{template.id}
                                    </span>

                                </div>

                            </div>


                            <div className="mobile-template-file">

                                <div className="template-file-icon">

                                    <FontAwesomeIcon
                                        icon={
                                            faFilePdf
                                        }
                                    />

                                </div>


                                <div className="template-file-details">

                                    <strong>
                                        {template.fileName}
                                    </strong>

                                    <span>
                                        PDF Template
                                    </span>

                                </div>

                            </div>


                            <div className="mobile-template-sent">

                                <span>
                                    Event Date
                                </span>

                                <strong>
                                    {template.eventDate || "—"}
                                </strong>

                            </div>


                            <div className="mobile-template-actions">

                                <button
                                    type="button"
                                    className="certificate-view-btn"
                                    disabled={!template.certificateTemplate}
                                    title={template.certificateTemplate
                                        ? "Preview Template"
                                        : "Certificate template unavailable"}
                                    onClick={() =>
                                        handleViewTemplate(
                                            template
                                        )
                                    }
                                >

                                    <FontAwesomeIcon
                                        icon={faEye}
                                    />

                                    View

                                </button>


                            </div>

                        </div>

                    ))}

                </div>


                {/* FOOTER */}

                <div className="certificate-footer">

                    <span>
                        Showing {templates.length} approved
                        {templates.length === 1
                            ? " event"
                            : " events"}
                    </span>

                    <span className="certificate-footer-note">
                        PDF files only
                    </span>

                </div>

            </section>

        </div>
    );
}


export default Certificate;