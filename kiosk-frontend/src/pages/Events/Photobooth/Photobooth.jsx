import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';

import './Photobooth.css';

function PhotoboothCamera() {
    const navigate = useNavigate();
    const { event, eventPath, photobooth } = useOutletContext();
    const availableRef = useRef(false);
    const cameraRequestRef = useRef(0);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const countdownTimerRef = useRef(null);

    const [cameraStarted, setCameraStarted] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const [countdown, setCountdown] = useState(null);
    const [capturedImage, setCapturedImage] = useState('');
    const [photoDecision, setPhotoDecision] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);

    /* =========================================
       START CAMERA
       ========================================= */

    const startCamera = useCallback(() => {
        if (!availableRef.current) return;
        const requestId = ++cameraRequestRef.current;
        if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
        const request = navigator.mediaDevices?.getUserMedia
            ? navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
            : Promise.reject(new Error('Camera access is not supported by this browser.'));
        request.then(async (stream) => {
            if (!availableRef.current || requestId !== cameraRequestRef.current) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            if (availableRef.current && requestId === cameraRequestRef.current) {
                setCameraError('');
                setCameraStarted(true);
            }
        }).catch((error) => {
            if (!availableRef.current || requestId !== cameraRequestRef.current) return;
            streamRef.current?.getTracks().forEach((track) => track.stop());
            console.error('Camera error:', error);
            const messages = {
                NotAllowedError: 'Camera permission was denied. Please allow camera access.',
                NotFoundError: 'No camera was found on this device.',
                NotReadableError: 'The camera is already being used by another application.',
            };
            setCameraError(messages[error.name] || error.message || 'Unable to access the camera.');
            setCameraStarted(false);
        });
    }, []);

    /* =========================================
       STOP CAMERA
       ========================================= */

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => {
                track.stop();
            });

            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setCameraStarted(false);
    }, []);

    /* =========================================
       CAPTURE PHOTO
       ========================================= */

    const capturePhoto = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!availableRef.current || !video || !canvas) {
            return;
        }

        if (video.readyState < 2) {
            setCameraError('Camera is not ready yet.');
            return;
        }

        const width = video.videoWidth;
        const height = video.videoHeight;

        if (!width || !height) {
            setCameraError('Camera image is not ready yet.');
            return;
        }

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');

        /*
         * Mirror the captured image so it matches
         * the selfie camera preview.
         */
        context.save();

        context.translate(width, 0);
        context.scale(-1, 1);

        context.drawImage(
            video,
            0,
            0,
            width,
            height
        );

        context.restore();

        const image = canvas.toDataURL(
            'image/jpeg',
            0.92
        );

        setCapturedImage(image);
        setPhotoDecision(null);
        setCountdown(null);
        setIsCapturing(false);
    }, []);

    /* =========================================
       10-SECOND COUNTDOWN
       ========================================= */

    const startCountdown = () => {
        if (
            !availableRef.current ||
            !cameraStarted ||
            capturedImage ||
            isCapturing
        ) {
            return;
        }

        setCameraError('');
        setIsCapturing(true);
        setCountdown(10);

        let currentCount = 10;

        countdownTimerRef.current = setInterval(() => {
            currentCount -= 1;

            if (currentCount > 0) {
                setCountdown(currentCount);
            } else {
                clearInterval(countdownTimerRef.current);
                countdownTimerRef.current = null;

                setCountdown(0);

                setTimeout(() => {
                    capturePhoto();
                }, 300);
            }
        }, 1000);
    };

    /* =========================================
       RETAKE PHOTO
       ========================================= */

    const retakePhoto = () => {
        setCapturedImage('');
        setPhotoDecision(null);
        setCountdown(null);
        setIsCapturing(false);
        setCameraError('');

        if (!streamRef.current) {
            startCamera();
        }
    };

    /* =========================================
       FINISH PHOTO
       ========================================= */

    const finishPhoto = () => {
        if (!photoDecision) {
            return;
        }

        console.log({
            photo: capturedImage,
            addToHighlights:
                photoDecision === 'highlight',
        });

        stopCamera();

        navigate(eventPath());
    };

    /* =========================================
       START CAMERA WHEN PAGE OPENS
       ========================================= */

    useEffect(() => {
        availableRef.current = true;
        startCamera();

        return () => {
            availableRef.current = false;
            cameraRequestRef.current += 1;
            if (countdownTimerRef.current) {
                clearInterval(countdownTimerRef.current);
            }

            if (streamRef.current) {
                streamRef.current
                    .getTracks()
                    .forEach((track) => track.stop());
            }
        };
    }, [startCamera]);

    return (
        <section className="event-photobooth-page">

            {/* =========================================
                PAGE TITLE
                ========================================= */}

            <div className="photobooth-header">
                <p>{photobooth.message}</p>
                <p className="event-page-kicker">
                    {event.event_name} · Photobooth
                </p>

                <h1>
                    Capture the Moment
                </h1>
            </div>


            {/* =========================================
                CAMERA
                ========================================= */}

            {!capturedImage && (
                <div className="photobooth-camera-section">

                    <div className="photobooth-camera-frame">

                        <video
                            ref={videoRef}
                            className="photobooth-video"
                            autoPlay
                            playsInline
                            muted
                        />

                        {/* Dark camera overlay */}
                        <div className="photobooth-camera-overlay" />


                        {/* =================================
                            COUNTDOWN ON CAMERA
                            ================================= */}

                        {countdown !== null && (
                            <div className="photobooth-countdown">
                                {countdown}
                            </div>
                        )}


                        {/* =================================
                            CAMERA ERROR
                            ================================= */}

                        {cameraError && (
                            <div className="photobooth-camera-error">

                                <span>
                                    {cameraError}
                                </span>

                                <button
                                    type="button"
                                    onClick={startCamera}
                                >
                                    Try Camera Again
                                </button>

                            </div>
                        )}


                        {/* =================================
                            START CAMERA
                            ================================= */}

                        {!cameraStarted &&
                            !cameraError && (
                                <div className="photobooth-camera-message">

                                    <button
                                        type="button"
                                        onClick={startCamera}
                                    >
                                        Start Camera
                                    </button>

                                </div>
                            )}

                    </div>


                    {/* =================================
                        TAKE PHOTO BUTTON
                        ================================= */}

                    <div className="photobooth-controls">

                        <button
                            type="button"
                            className="photobooth-capture-button"
                            onClick={startCountdown}
                            disabled={
                                !cameraStarted ||
                                isCapturing ||
                                Boolean(cameraError)
                            }
                        >

                            <span className="capture-button-circle" />

                            {isCapturing
                                ? 'Get Ready...'
                                : 'Take Photo'}

                        </button>

                    </div>

                </div>
            )}


            {/* =========================================
                CAPTURED PHOTO
                ========================================= */}

            {capturedImage && (
                <div className="photobooth-result">

                    <div className="photobooth-result-image-wrapper">

                        <img
                            src={capturedImage}
                            alt="Captured event photobooth"
                            className="photobooth-result-image"
                        />

                    </div>


                    <div className="photobooth-result-content">

                        <h2>
                            Use this photo?
                        </h2>


                        {/* PHOTO DECISION */}

                        <div className="photobooth-choice-buttons">

                            <button
                                type="button"
                                className={
                                    photoDecision === 'highlight'
                                        ? 'choice-button highlight-choice selected'
                                        : 'choice-button highlight-choice'
                                }
                                onClick={() =>
                                    setPhotoDecision(
                                        'highlight'
                                    )
                                }
                            >
                                Yes, Add to Highlights
                            </button>


                            <button
                                type="button"
                                className={
                                    photoDecision === 'private'
                                        ? 'choice-button private-choice selected'
                                        : 'choice-button private-choice'
                                }
                                onClick={() =>
                                    setPhotoDecision(
                                        'private'
                                    )
                                }
                            >
                                No, Keep Private
                            </button>

                        </div>


                        {/* RESULT BUTTONS */}

                        <div className="photobooth-result-actions">

                            <button
                                type="button"
                                className="retake-button"
                                onClick={retakePhoto}
                            >
                                Retake
                            </button>


                            <button
                                type="button"
                                className="finish-button"
                                disabled={!photoDecision}
                                onClick={finishPhoto}
                            >
                                Continue
                            </button>

                        </div>

                    </div>

                </div>
            )}


            {/* =========================================
                HIDDEN CANVAS
                ========================================= */}

            <canvas
                ref={canvasRef}
                className="photobooth-hidden-canvas"
            />

        </section>
    );
}

function Photobooth() {
    const navigate = useNavigate();
    const { event, eventPath, photobooth } = useOutletContext();
    if (!photobooth.available) return <section className="event-photobooth-page">
        <div className="photobooth-header"><p className="event-page-kicker">{event.event_name}</p><h1>Photobooth</h1><p role="status">{photobooth.message}</p>
        <button type="button" onClick={() => navigate(eventPath())}>Back to Event Home</button></div>
    </section>;


    return <PhotoboothCamera key={event.id} />;
}

export default Photobooth;
