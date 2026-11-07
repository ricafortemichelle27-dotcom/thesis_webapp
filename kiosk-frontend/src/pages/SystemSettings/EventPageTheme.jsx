import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
    DEFAULT_EVENT_THEME,
    WIS_EVENT_THEME,
    loadEventTheme,
    saveEventColors,
} from '../../utils/eventTheme.js';

import { getKioskData } from '../../utils/api.js';

import './EventPageTheme.css';


/* =========================================================
   CONSTANTS
========================================================= */

const RECENT_COLORS_KEY = 'eventThemeRecentColors';

const COLOR_SETTINGS = [
    {
        field: 'primaryColor',
        label: 'Primary Color',
        description: 'Main color used in the event section.',
    },
    {
        field: 'secondaryColor',
        label: 'Secondary Color',
        description: 'Supporting color used for event elements.',
    },
    {
        field: 'accentColor',
        label: 'Accent Color',
        description: 'Used for highlights, buttons, and accents.',
    },
];


/* =========================================================
   COLOR HELPERS
========================================================= */

/*
   Convert HEX to RGB.
*/
function hexToRgb(hex) {
    const cleanHex = hex.replace('#', '');

    if (cleanHex.length !== 6) {
        return {
            r: 0,
            g: 0,
            b: 0,
        };
    }

    return {
        r: parseInt(cleanHex.substring(0, 2), 16),
        g: parseInt(cleanHex.substring(2, 4), 16),
        b: parseInt(cleanHex.substring(4, 6), 16),
    };
}


/*
   Convert RGB to HEX.
*/
function rgbToHex(r, g, b) {
    return (
        '#' +
        [r, g, b]
            .map((value) =>
                Math.round(value)
                    .toString(16)
                    .padStart(2, '0')
            )
            .join('')
            .toUpperCase()
    );
}


/*
   Convert HEX to HSV.
*/
function hexToHsv(hex) {
    const { r, g, b } = hexToRgb(hex);

    const red = r / 255;
    const green = g / 255;
    const blue = b / 255;

    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);

    const difference = max - min;

    let h = 0;

    if (difference !== 0) {
        if (max === red) {
            h = ((green - blue) / difference) % 6;
        } else if (max === green) {
            h = (blue - red) / difference + 2;
        } else {
            h = (red - green) / difference + 4;
        }

        h *= 60;

        if (h < 0) {
            h += 360;
        }
    }

    const s =
        max === 0
            ? 0
            : difference / max;

    const v = max;

    return {
        h,
        s: s * 100,
        v: v * 100,
    };
}


/*
   Convert HSV to HEX.
*/
function hsvToHex(h, s, v) {
    s /= 100;
    v /= 100;

    const c = v * s;

    const x =
        c *
        (1 -
            Math.abs(
                ((h / 60) % 2) - 1
            ));

    const m = v - c;

    let red;
    let green;
    let blue;

    if (h >= 0 && h < 60) {
        red = c;
        green = x;
        blue = 0;
    } else if (h >= 60 && h < 120) {
        red = x;
        green = c;
        blue = 0;
    } else if (h >= 120 && h < 180) {
        red = 0;
        green = c;
        blue = x;
    } else if (h >= 180 && h < 240) {
        red = 0;
        green = x;
        blue = c;
    } else if (h >= 240 && h < 300) {
        red = x;
        green = 0;
        blue = c;
    } else {
        red = c;
        green = 0;
        blue = x;
    }

    return rgbToHex(
        (red + m) * 255,
        (green + m) * 255,
        (blue + m) * 255
    );
}


/*
   Check if a value is a valid HEX color.
*/
function isValidHex(value) {
    return /^#[0-9A-Fa-f]{6}$/.test(value);
}


/* =========================================================
   RECENT COLORS
========================================================= */

function loadRecentColors() {
    try {
        const saved = localStorage.getItem(
            RECENT_COLORS_KEY
        );

        if (!saved) {
            return [];
        }

        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.slice(0, 5);
    } catch {
        return [];
    }
}


function saveRecentColors(colors) {
    try {
        localStorage.setItem(
            RECENT_COLORS_KEY,
            JSON.stringify(colors.slice(0, 5))
        );
    } catch {
        /*
           Ignore localStorage errors.
        */
    }
}


/*
   Add a color to the recent list.

   Newest color goes to the front.
   Maximum = 5 colors.
*/
function addRecentColor(color) {
    const normalizedColor =
        color.toUpperCase();

    const currentColors =
        loadRecentColors();

    const filteredColors =
        currentColors.filter(
            (item) =>
                item.toUpperCase() !==
                normalizedColor
        );

    const updatedColors = [
        normalizedColor,
        ...filteredColors,
    ].slice(0, 5);

    saveRecentColors(updatedColors);

    return updatedColors;
}


/* =========================================================
   CANVA-STYLE COLOR PICKER
========================================================= */

function ColorPicker({
    value,
    onChange,
    onClose,
    onColorSelected,
}) {

    const pickerRef = useRef(null);

    const initialHSV = hexToHsv(value);

    const [hue, setHue] = useState(
        initialHSV.h
    );

    const [saturation, setSaturation] =
        useState(initialHSV.s);

    const [brightness, setBrightness] =
        useState(initialHSV.v);

    const [hexValue, setHexValue] =
        useState(value.toUpperCase());

    const [recentColors, setRecentColors] =
        useState(loadRecentColors);


    /* =====================================================
       CLOSE WHEN CLICKING OUTSIDE
    ===================================================== */

    useEffect(() => {

        const handleOutsideClick = (event) => {

            if (
                pickerRef.current &&
                !pickerRef.current.contains(
                    event.target
                )
            ) {
                onClose();
            }
        };

        document.addEventListener(
            'mousedown',
            handleOutsideClick
        );

        return () => {
            document.removeEventListener(
                'mousedown',
                handleOutsideClick
            );
        };

    }, [onClose]);


    /* =====================================================
       APPLY COLOR
    ===================================================== */

    const applyColor = (color) => {

        const normalizedColor =
            color.toUpperCase();

        onChange(normalizedColor);

        setHexValue(normalizedColor);

        const hsv =
            hexToHsv(normalizedColor);

        setHue(hsv.h);
        setSaturation(hsv.s);
        setBrightness(hsv.v);

        const updatedRecent =
            addRecentColor(
                normalizedColor
            );

        setRecentColors(
            updatedRecent
        );

        if (onColorSelected) {
            onColorSelected(
                normalizedColor
            );
        }
    };


    /* =====================================================
       UPDATE FROM HSV
    ===================================================== */

    const updateFromHSV = (
        newHue,
        newSaturation,
        newBrightness
    ) => {

        const newColor =
            hsvToHex(
                newHue,
                newSaturation,
                newBrightness
            );

        setHue(newHue);
        setSaturation(newSaturation);
        setBrightness(newBrightness);
        setHexValue(newColor);

        onChange(newColor);
    };


    /* =====================================================
       SATURATION / BRIGHTNESS PICKER
    ===================================================== */

    const handleSaturationBrightness = (
        event
    ) => {

        const rectangle =
            event.currentTarget.getBoundingClientRect();

        let x =
            event.clientX -
            rectangle.left;

        let y =
            event.clientY -
            rectangle.top;

        x = Math.max(
            0,
            Math.min(
                x,
                rectangle.width
            )
        );

        y = Math.max(
            0,
            Math.min(
                y,
                rectangle.height
            )
        );

        const newSaturation =
            (x / rectangle.width) * 100;

        const newBrightness =
            100 -
            (y / rectangle.height) * 100;

        updateFromHSV(
            hue,
            newSaturation,
            newBrightness
        );
    };


    /* =====================================================
       HUE SLIDER
    ===================================================== */

    const handleHue = (event) => {

        const rectangle =
            event.currentTarget.getBoundingClientRect();

        let x =
            event.clientX -
            rectangle.left;

        x = Math.max(
            0,
            Math.min(
                x,
                rectangle.width
            )
        );

        const newHue =
            (x / rectangle.width) * 360;

        updateFromHSV(
            newHue,
            saturation,
            brightness
        );
    };


    /* =====================================================
       HEX INPUT
    ===================================================== */

    const handleHexInput = (event) => {

        let newValue =
            event.target.value
                .toUpperCase();

        if (
            newValue &&
            !newValue.startsWith('#')
        ) {
            newValue =
                '#' + newValue;
        }

        setHexValue(newValue);

        if (
            isValidHex(newValue)
        ) {

            const hsv =
                hexToHsv(newValue);

            setHue(hsv.h);
            setSaturation(hsv.s);
            setBrightness(hsv.v);

            onChange(newValue);
        }
    };


    /* =====================================================
       RECENT COLOR CLICK
    ===================================================== */

    const handleRecentColor =
        (color) => {

            applyColor(color);
        };


    /*
       Color currently selected.
    */
    const currentColor =
        hsvToHex(
            hue,
            saturation,
            brightness
        );


    return (
        <div
            className="canva-color-picker"
            ref={pickerRef}
        >

            {/* =================================================
               TOP COLOR ROW
            ================================================= */}

            <div className="color-picker-top-row">

                <button
                    type="button"
                    className="color-picker-add-button"
                    title="Add custom color"
                >
                    +
                </button>

                <button
                    type="button"
                    className="color-picker-eyedropper"
                    title="Color picker"
                >
                    ◉
                </button>


                {/* Recent 5 colors */}

                {recentColors.map(
                    (color) => (

                        <button
                            key={color}
                            type="button"
                            className={`recent-color ${
                                color.toUpperCase() ===
                                currentColor.toUpperCase()
                                    ? 'selected'
                                    : ''
                            }`}
                            style={{
                                backgroundColor:
                                    color,
                            }}
                            title={color}
                            onClick={() =>
                                handleRecentColor(
                                    color
                                )
                            }
                        />

                    )
                )}

            </div>


            {/* =================================================
               PICKER TABS
            ================================================= */}

            <div className="color-picker-tabs">

                <button
                    type="button"
                    className="color-picker-tab active"
                >
                    Solid color
                </button>

                <button
                    type="button"
                    className="color-picker-tab disabled"
                    disabled
                    title="Gradient is not available"
                >
                    Gradient
                </button>

            </div>


            {/* =================================================
               SATURATION / BRIGHTNESS AREA
            ================================================= */}

            <div
                className="saturation-brightness-area"
                style={{
                    backgroundColor:
                        `hsl(${hue}, 100%, 50%)`,
                }}
                onMouseDown={
                    handleSaturationBrightness
                }
                onClick={
                    handleSaturationBrightness
                }
            >

                <div className="white-gradient" />

                <div className="black-gradient" />


                {/* Color selection circle */}

                <div
                    className="color-picker-circle"
                    style={{
                        left: `${saturation}%`,
                        top: `${100 - brightness}%`,
                    }}
                />

            </div>


            {/* =================================================
               HUE SLIDER
            ================================================= */}

            <div
                className="hue-slider"
                onClick={handleHue}
            >

                <div
                    className="hue-slider-handle"
                    style={{
                        left: `${(hue / 360) * 100}%`,
                    }}
                />

            </div>


            {/* =================================================
               COLOR VALUE
            ================================================= */}

            <div className="color-value-row">

                <div
                    className="current-color-preview"
                    style={{
                        backgroundColor:
                            currentColor,
                    }}
                />

                <input
                    type="text"
                    value={hexValue}
                    maxLength={7}
                    onChange={
                        handleHexInput
                    }
                    onBlur={() => {

                        if (
                            !isValidHex(
                                hexValue
                            )
                        ) {
                            setHexValue(
                                currentColor
                            );
                        }

                    }}
                    aria-label="HEX color"
                />

                <button
                    type="button"
                    className="color-done-button"
                    onClick={() => {

                        if (
                            isValidHex(
                                hexValue
                            )
                        ) {
                            applyColor(
                                hexValue
                            );
                        } else {
                            applyColor(
                                currentColor
                            );
                        }

                        onClose();

                    }}
                >
                    Done
                </button>

            </div>

        </div>
    );
}


/* =========================================================
   EVENT PREVIEW
========================================================= */

function EventPreview({ theme }) {

    const previewStyle = {
        '--event-primary':
            theme.primaryColor,

        '--event-secondary':
            theme.secondaryColor,

        '--event-accent':
            theme.accentColor,
    };

    return (
        <div
            className="event-theme-preview"
            style={previewStyle}
        >

            <div className="event-preview-header">
                <span>☰</span>
            </div>


            <div className="event-preview-content">

                <span className="event-preview-welcome">
                    WELCOME TO
                </span>

                <strong className="event-preview-title">
                    ENGINEERING WEEK 2026
                </strong>


                <div className="event-preview-logo">
                    EVENT LOGO
                </div>


                <div className="event-preview-info">

                    <span>
                        ◷ Date: September 21, 2026
                    </span>

                    <span>
                        ◷ Time: 9:00 AM
                    </span>

                    <span>
                        ⌖ Where: Main Campus
                    </span>

                </div>


                <div className="event-preview-buttons">

                    <button type="button">
                        View Event
                    </button>

                    <button type="button">
                        Attendance
                    </button>

                </div>

            </div>


            <div className="event-preview-footer">

                <span className="active">
                    ⌂
                    <small>Home</small>
                </span>

                <span>
                    ⓘ
                    <small>Information</small>
                </span>

                <span>
                    ▣
                    <small>Photobooth</small>
                </span>

                <span>
                    ★
                    <small>Highlights</small>
                </span>

            </div>

        </div>
    );
}


/* =========================================================
   EVENT PAGE THEME
========================================================= */

function EventPageTheme() {

    const navigate = useNavigate();

    /*
       =========================================================
       APPROVED EVENT THEME STORAGE
       =========================================================

       Each event gets its own saved theme.

       MAIN = use the normal WIS kiosk theme.
       EVENT = use the custom colors saved for this event.

       This prevents one event's theme from changing
       every other event.
    */

    const [events, setEvents] =
        useState([]);

    const [eventsLoading, setEventsLoading] =
        useState(true);

    const [eventsError, setEventsError] =
        useState('');

    const [selectedEventId, setSelectedEventId] =
        useState('');

    const selectedEvent = events.find((event) => String(event.id) === String(selectedEventId));
    const themeMode = selectedEvent?.kiosk_theme_mode === 'custom' ? 'EVENT' : 'MAIN';
    const [saveError, setSaveError] = useState('');
    const [saving, setSaving] = useState(false);

    const [theme, setTheme] =
        useState({
            ...DEFAULT_EVENT_THEME,
        });

    const [activeColorField, setActiveColorField] =
        useState(null);

    const [previewExpanded, setPreviewExpanded] =
        useState(false);


    /* =====================================================
       LOAD APPROVED EVENTS
    ===================================================== */

    useEffect(() => {

        const controller =
            new AbortController();


        getKioskData(
            '/events',
            controller.signal
        )
            .then((data) => {

                if (!Array.isArray(data.events)) {
                    throw new Error(
                        'Invalid event list from server.'
                    );
                }

                if (data.events.some((event) => !event.status || !['wis', 'custom'].includes(event.kiosk_theme_mode))) {
                    throw new Error('The event API is missing approval or theme information. Restart the updated Express backend.');
                }

                /*
                   The kiosk event endpoint is expected
                   to contain the events available to the kiosk.

                   If the API includes a status field, only
                   APPROVED events are shown here.
                */
                const approvedEvents = data.events.filter((event) => event.status === 'approved' && event.kiosk_theme_mode === 'custom');

                setEvents(approvedEvents);
                if (approvedEvents.length) setTheme(loadEventTheme(approvedEvents[0].id));

                if (approvedEvents.length > 0) {

                    setSelectedEventId(
                        String(
                            approvedEvents[0].id
                        )
                    );
                }

                setEventsLoading(false);
            })
            .catch((error) => {

                if (
                    error.name !==
                    'AbortError'
                ) {

                    setEvents([]);
                    setEventsLoading(false);
                    setEventsError(
                        error.message
                    );
                }
            });

        return () =>
            controller.abort();

    }, []);


    /* =====================================================
       EVENT THEME STORAGE HELPERS
    ===================================================== */

    const handleEventChange = (eventId) => {
        setSelectedEventId(String(eventId));
        setTheme(loadEventTheme(eventId));
        setActiveColorField(null);
        setPreviewExpanded(false);
        setSaveError('');
    };

    /* =====================================================
       UPDATE COLOR
    ===================================================== */

    const updateColor = (
        field,
        value
    ) => {

        setTheme(
            (current) => ({
                ...current,
                [field]: value,
            })
        );
    };


    /* =====================================================
       RESET
    ===================================================== */

    const resetTheme = () => {

        setTheme({
            ...DEFAULT_EVENT_THEME,
        });

        setActiveColorField(null);
    };


    /* =====================================================
       SAVE
    ===================================================== */

    const handleSave = async () => {
        if (!selectedEventId || themeMode !== 'EVENT' || saving) return;
        setSaving(true);
        setSaveError('');
        try {
            // Recheck the central setting in case the Admin changed it while this page was open.
            const { event } = await getKioskData('/events/' + encodeURIComponent(selectedEventId));
            if (event?.kiosk_theme_mode !== 'custom') {
                setEvents((current) => current.map((item) => String(item.id) === String(selectedEventId)
                    ? { ...item, kiosk_theme_mode: event?.kiosk_theme_mode } : item));
                throw new Error('The Event Admin has selected WIS. This event cannot be customized.');
            }
            saveEventColors(selectedEventId, theme);
            navigate('/event?eventId=' + encodeURIComponent(selectedEventId));
        } catch (error) {
            setSaveError(error.message || 'Unable to save event colors.');
        } finally {
            setSaving(false);
        }
    };

    const previewTheme =
        themeMode === 'MAIN'
            ? WIS_EVENT_THEME
            : theme;


    return (
        <section className="event-theme-settings">

            <div className="event-theme-settings-inner">

                {/* =================================================
                   HEADER
                ================================================= */}

                <div className="event-theme-settings-header">

                    <div>

                        <p className="settings-eyebrow">
                            EVENT THEME SETTINGS
                        </p>

                        <h1>
                            Event Page Theme
                        </h1>

                        <p>
                            Customize colors for each approved
                            event without changing the main
                            WIS kiosk theme.
                        </p>

                    </div>


                    <button
                        className="settings-back-button"
                        type="button"
                        onClick={() =>
                            navigate(-1)
                        }
                    >
                        Back
                    </button>

                </div>


                {/* =================================================
                   APPROVED EVENTS
                ================================================= */}

                <section className="approved-events-section">

                    <div className="section-heading">

                        <h2>
                            Approved Events
                        </h2>

                        <p>
                            Select the approved event that
                            you want to customize.
                        </p>

                    </div>


                    {eventsLoading ? (

                        <p
                            className="theme-status-message"
                            role="status"
                        >
                            Loading approved events…
                        </p>

                    ) : eventsError ? (

                        <p
                            className="theme-status-message error"
                            role="alert"
                        >
                            {eventsError}
                        </p>

                    ) : events.length === 0 ? (

                        <p
                            className="theme-status-message"
                        >
                            No approved Custom events are currently
                            available in the kiosk.
                        </p>

                    ) : (

                        <div className="approved-events-list">

                            {events.map(
                                (event) => {

                                    const isCustom = event.kiosk_theme_mode === 'custom';

                                    const isSelected =
                                        String(
                                            event.id
                                        ) ===
                                        String(
                                            selectedEventId
                                        );

                                    return (

                                        <button
                                            key={event.id}
                                            type="button"
                                            className={`approved-event-card ${
                                                isSelected
                                                    ? 'selected'
                                                    : ''
                                            }`}
                                            onClick={() => handleEventChange(event.id)}
                                        >

                                            <span className="approved-event-card-info">

                                                <strong>
                                                    {
                                                        event.event_name ||
                                                        'Untitled Event'
                                                    }
                                                </strong>

                                                <small>
                                                    {
                                                        event.event_date ||
                                                        'Date not available'
                                                    }
                                                </small>

                                            </span>


                                            <span
                                                className={`approved-event-theme-badge ${
                                                    isCustom
                                                        ? 'custom'
                                                        : 'main'
                                                }`}
                                            >
                                                {isCustom
                                                    ? 'Event Theme'
                                                    : 'Main Kiosk Theme'}
                                            </span>

                                        </button>
                                    );
                                }
                            )}

                        </div>
                    )}

                </section>


                {selectedEventId && (

                    <>

                        {/* =================================================
                           SELECTED EVENT
                        ================================================= */}

                        <section className="selected-event-section">
                            {saveError && <p role="alert">{saveError}</p>}

                            <div className="selected-event-heading">

                                <div>

                                    <p>
                                        SELECTED EVENT
                                    </p>

                                    <h2>
                                        {
                                            selectedEvent?.event_name ||
                                            'Selected Event'
                                        }
                                    </h2>

                                </div>

                                <span className="selected-event-id">
                                    Event #{selectedEventId}
                                </span>

                            </div>


                            {/* =================================================
                               THEME TYPE
                            ================================================= */}



                        </section>


                        {/* =================================================
                           PREVIEW
                        ================================================= */}

                        <section className="event-preview-section">

                            <div className="section-heading">

                                <h2>
                                    Preview
                                </h2>

                                <p>
                                    Tap the preview to view
                                    it larger.
                                </p>

                            </div>


                            <button
                                type="button"
                                className="event-preview-trigger"
                                onClick={() =>
                                    setPreviewExpanded(true)
                                }
                            >

                                <EventPreview
                                    theme={previewTheme}
                                />

                            </button>


                            {themeMode === 'MAIN' && (

                                <p className="main-theme-preview-note">
                                    This event is using the
                                    <strong>
                                        {' '}WIS Main Kiosk Theme
                                    </strong>.
                                    Event color customization
                                    is disabled.
                                </p>

                            )}

                        </section>


                        {/* =================================================
                           COLORS
                        ================================================= */}

                        {themeMode === 'EVENT' ? (

                            <form
                                className="event-theme-form"
                                onSubmit={(event) => {

                                    event.preventDefault();

                                    handleSave();

                                }}
                            >

                                <fieldset className="theme-colors-fieldset">

                                    <legend>
                                        Event Colors
                                    </legend>

                                    <p className="fieldset-description">
                                        These colors affect only the
                                        selected event. Other approved
                                        events keep their own theme
                                        settings.
                                    </p>


                                    {COLOR_SETTINGS.map(
                                        ({
                                            field,
                                            label,
                                            description,
                                        }) => (

                                            <div
                                                className="color-setting"
                                                key={field}
                                            >

                                                <div className="color-setting-header">

                                                    <div className="color-setting-info">

                                                        <span className="color-setting-label">
                                                            {label}
                                                        </span>

                                                        <span className="color-setting-description">
                                                            {description}
                                                        </span>

                                                    </div>


                                                    {/* =================================================
                                                       CURRENT COLOR BUTTON
                                                    ================================================= */}

                                                    <button
                                                        type="button"
                                                        className={`current-color-button ${
                                                            activeColorField ===
                                                            field
                                                                ? 'active'
                                                                : ''
                                                        }`}
                                                        onClick={() =>
                                                            setActiveColorField(
                                                                activeColorField ===
                                                                field
                                                                    ? null
                                                                    : field
                                                            )
                                                        }
                                                        aria-label={`Choose ${label}`}
                                                    >

                                                        <span
                                                            className="current-color-circle"
                                                            style={{
                                                                backgroundColor:
                                                                    theme[field],
                                                            }}
                                                        />

                                                        <span>
                                                            {theme[
                                                                field
                                                            ].toUpperCase()}
                                                        </span>

                                                        <span className="color-button-arrow">
                                                            {activeColorField ===
                                                            field
                                                                ? '▲'
                                                                : '▼'}
                                                        </span>

                                                    </button>

                                                </div>


                                                {/* =================================================
                                                   COLOR PICKER
                                                ================================================= */}

                                                {activeColorField ===
                                                    field && (

                                                    <div className="color-picker-wrapper">

                                                        <ColorPicker
                                                            value={
                                                                theme[
                                                                    field
                                                                ]
                                                            }
                                                            onChange={(
                                                                value
                                                            ) =>
                                                                updateColor(
                                                                    field,
                                                                    value
                                                                )
                                                            }
                                                            onClose={() =>
                                                                setActiveColorField(
                                                                    null
                                                                )
                                                            }
                                                        />

                                                    </div>

                                                )}

                                            </div>

                                        )
                                    )}

                                </fieldset>


                                {/* =================================================
                                   ACTION BUTTONS
                                ================================================= */}

                                <div className="event-theme-actions">

                                    <button
                                        type="button"
                                        className="reset-theme-button"
                                        onClick={
                                            resetTheme
                                        }
                                    >
                                        Reset to Default
                                    </button>


                                    <button
                                        type="submit"
                                        className="save-theme-button"
                                        disabled={saving}
                                    >
                                        Save Theme
                                    </button>

                                </div>

                            </form>

                        ) : (

                            <div className="main-theme-selected-panel">

                                <div>

                                    <strong>
                                        Main Kiosk Theme Selected
                                    </strong>

                                    <p>
                                        This event will use the
                                        existing WIS main kiosk
                                        theme. There are no
                                        customizable event colors
                                        for this event.
                                    </p>

                                </div>


                                <p>Color editing is locked by the Event Admin.</p>

                            </div>

                        )}

                    </>

                )}

            </div>


            {/* =====================================================
               LARGE PREVIEW
            ===================================================== */}

            {previewExpanded && (

                <div
                    className="event-preview-overlay-modal"
                    onClick={() =>
                        setPreviewExpanded(false)
                    }
                >

                    <div
                        className="event-preview-modal-content"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <div className="event-preview-modal-header">

                            <h2>
                                {
                                    selectedEvent?.event_name ||
                                    'Event Page Preview'
                                }
                            </h2>

                            <button
                                type="button"
                                className="close-preview-button"
                                onClick={() =>
                                    setPreviewExpanded(
                                        false
                                    )
                                }
                            >
                                ×
                            </button>

                        </div>


                        <div className="event-preview-large-container">

                            <EventPreview
                                theme={previewTheme}
                            />

                        </div>

                    </div>

                </div>

            )}

        </section>
    );
}


export default EventPageTheme;
