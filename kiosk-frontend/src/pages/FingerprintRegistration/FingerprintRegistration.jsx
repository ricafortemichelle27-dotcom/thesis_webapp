import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import FingerprintScanner from '../../components/FingerprintScanner/FingerprintScanner.jsx';
import { cancelFingerprintEnrollment, getFingerprintEnrollment, startFingerprintEnrollment } from '../../utils/kioskScannerApi.js';
import './FingerprintRegistration.css';

const FINGER_CHOICES = [
    'Right thumb', 'Right index', 'Right middle', 'Right ring', 'Right little',
    'Left thumb', 'Left index', 'Left middle', 'Left ring', 'Left little',
].map((label, index) => ({ label, position: index + 1 }));

function toKioskProfile(student) {
    return {
        student_id: student.studentId,
        lastname: student.lastName,
        firstname: student.firstName,
        middlename: student.middleName || null,
        suffix: student.suffix || null,
        department: student.department,
        major_program: student.program || null,
        year_level: student.yearLevel || null,
        // Email is intentionally excluded by the kiosk's local student/sync contract.
    };
}

function FingerprintRegistration({ studentData: providedStudentData, onBack }) {
    const location = useLocation();
    const navigate = useNavigate();
    const studentData = providedStudentData || location.state?.registration;
    const [enrollmentStep, setEnrollmentStep] = useState('ready');
    const [scanCount, setScanCount] = useState(0);
    const [message, setMessage] = useState('Choose a finger and start enrollment.');
    const [error, setError] = useState('');
    const [fingerPosition, setFingerPosition] = useState(2);
    const [sessionId, setSessionId] = useState('');
    const [starting, setStarting] = useState(false);
    const sessionIdRef = useRef('');
    const startPendingRef = useRef(false);
    const cancelAfterStartRef = useRef(false);
    const totalScans = 3;
    const busy = starting || Boolean(sessionId);

    useEffect(() => {
        if (!studentData) navigate('/registration');
    }, [studentData, navigate]);

    useEffect(() => () => {
        if (sessionIdRef.current) void cancelFingerprintEnrollment(sessionIdRef.current).catch(() => {});
        else if (startPendingRef.current) cancelAfterStartRef.current = true;
    }, []);

    useEffect(() => {
        if (!sessionId) return undefined;
        let active = true;
        let timer;

        const poll = async () => {
            try {
                const state = await getFingerprintEnrollment(sessionId);
                if (!active) return;
                setScanCount(state.scanCount);
                setMessage(state.message);

                if (state.status === 'complete') {
                    setEnrollmentStep('complete');
                    sessionIdRef.current = '';
                    setSessionId('');
                    return;
                }
                if (state.status === 'failed' || state.status === 'cancelled') {
                    setError(state.error || state.message);
                    setEnrollmentStep('ready');
                    sessionIdRef.current = '';
                    setSessionId('');
                    return;
                }
                if (state.status === 'waiting-for-lift') setEnrollmentStep('reposition');
                else if (['merging', 'saving'].includes(state.status)) setEnrollmentStep('processing');
                else setEnrollmentStep('scanning');
                timer = window.setTimeout(poll, 450);
            } catch (requestError) {
                if (!active) return;
                await cancelFingerprintEnrollment(sessionId).catch(() => {});
                setError(requestError.message);
                setMessage('The enrollment session stopped. You can retry.');
                setEnrollmentStep('ready');
                sessionIdRef.current = '';
                setSessionId('');
            }
        };

        poll();
        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [sessionId]);

    const handleStartEnrollment = async () => {
        if (!studentData || busy) return;
        setStarting(true);
        setError('');
        setScanCount(0);
        startPendingRef.current = true;
        cancelAfterStartRef.current = false;
        setEnrollmentStep('scanning');
        setMessage('Connecting to the ZK9500 reader…');
        try {
            const session = await startFingerprintEnrollment(toKioskProfile(studentData), fingerPosition);
            startPendingRef.current = false;
            if (cancelAfterStartRef.current) {
                await cancelFingerprintEnrollment(session.id).catch(() => {});
                return;
            }
            sessionIdRef.current = session.id;
            setSessionId(session.id);
        } catch (requestError) {
            startPendingRef.current = false;
            setEnrollmentStep('ready');
            setMessage('Choose a finger and retry enrollment.');
            setError(requestError.message);
        } finally {
            setStarting(false);
        }
    };

    const handleCancel = async () => {
        if (sessionIdRef.current) {
            const activeSessionId = sessionIdRef.current;
            sessionIdRef.current = '';
            await cancelFingerprintEnrollment(activeSessionId).catch(() => {});
        } else if (startPendingRef.current) cancelAfterStartRef.current = true;
        setSessionId('');
        setScanCount(0);
        setEnrollmentStep('ready');
        if (onBack) onBack();
        else navigate('/registration');
    };

    const handleFinish = () => navigate('/');

    if (!studentData) return null;

    const progressPercentage = (scanCount / totalScans) * 100;

    return (
        <div className="fingerprint-registration-page">
            <div className="fingerprint-registration-header">
                <div>
                    <h1>Fingerprint Registration</h1>
                    <p>Register your fingerprint to use the kiosk for event attendance.</p>
                </div>
                <div className="registration-step">Step 2 of 2</div>
            </div>

            <div className="fingerprint-student-info">
                <div className="student-info-title">Registering fingerprint for</div>
                <div className="student-name">
                    {studentData.firstName} {studentData.middleName} {studentData.lastName}
                    {studentData.suffix ? ` ${studentData.suffix}` : ''}
                </div>
                <div className="student-id">Student ID: {studentData.studentId}</div>
            </div>

            <div className="fingerprint-enrollment-card">
                <div className="fingerprint-enrollment-title">
                    <h2>Enroll Your Fingerprint</h2>
                    <p>Use the same finger for all three scans, lifting it between each scan.</p>
                </div>

                <label className="finger-position-field">
                    <span>Finger to enroll</span>
                    <select value={fingerPosition} onChange={(event) => setFingerPosition(Number(event.target.value))} disabled={busy || enrollmentStep === 'complete'}>
                        {FINGER_CHOICES.map(({ label, position }) => (
                            <option key={position} value={position}>{label}</option>
                        ))}
                    </select>
                </label>

                <div className="fingerprint-progress-section">
                    <div className="fingerprint-progress-label">
                        <span>Fingerprint enrollment</span>
                        <span>{scanCount} / {totalScans}</span>
                    </div>
                    <div className="fingerprint-progress-bar">
                        <div className="fingerprint-progress-fill" style={{ width: `${progressPercentage}%` }} />
                    </div>
                </div>

                <FingerprintScanner
                    enrollmentStep={enrollmentStep}
                    scanCount={scanCount}
                    totalScans={totalScans}
                    message={message}
                    onStartEnrollment={handleStartEnrollment}
                />

                {error && <div className="fingerprint-error" role="alert">{error}</div>}

                <div className={`fingerprint-message ${enrollmentStep}`}>
                    <div className="fingerprint-message-icon" aria-hidden="true">
                        {enrollmentStep === 'complete' ? '✓' : enrollmentStep === 'reposition' ? '↻' : '☝'}
                    </div>
                    <div>
                        <strong>
                            {enrollmentStep === 'ready' && 'Ready to scan'}
                            {enrollmentStep === 'scanning' && 'Waiting for the fingerprint reader'}
                            {enrollmentStep === 'reposition' && 'Lift your finger'}
                            {enrollmentStep === 'processing' && 'Processing enrollment'}
                            {enrollmentStep === 'complete' && 'Fingerprint registered'}
                        </strong>
                        <p>{message}</p>
                    </div>
                </div>

                {enrollmentStep !== 'complete' && (
                    <div className="fingerprint-tips">
                        <h3>Fingerprint Enrollment Tips</h3>
                        <ul>
                            <li>Place the selected finger firmly on the ZK9500.</li>
                            <li>Hold still until the scan is accepted.</li>
                            <li>Lift the finger completely when prompted.</li>
                            <li>Use the same finger for all three scans.</li>
                        </ul>
                    </div>
                )}

                {enrollmentStep === 'complete' && (
                    <div className="fingerprint-success">
                        <div className="success-check" aria-hidden="true">✓</div>
                        <div>
                            <h3>Fingerprint Successfully Registered</h3>
                            <p>The merged template is encrypted and stored in this kiosk’s local database.</p>
                        </div>
                    </div>
                )}

                <div className="fingerprint-actions">
                    {enrollmentStep !== 'complete' && (
                        <button type="button" className="fingerprint-cancel-button" onClick={handleCancel}>
                            {busy ? 'Cancel Scan' : 'Back'}
                        </button>
                    )}
                    {enrollmentStep === 'complete' && (
                        <button type="button" className="fingerprint-finish-button" onClick={handleFinish}>
                            Finish Registration
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default FingerprintRegistration;
