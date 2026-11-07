import './FingerprintScanner.css';

function FingerprintScanner({ enrollmentStep, scanCount, totalScans, message, onStartEnrollment }) {
    return (
        <div className="fingerprint-scanner">
            <div className={`fingerprint-device ${enrollmentStep === 'scanning' ? 'scanner-active' : ''}`}>
                <div className="fingerprint-sensor">
                    <div className="fingerprint-icon">
                        <span className="fingerprint-line line-1" />
                        <span className="fingerprint-line line-2" />
                        <span className="fingerprint-line line-3" />
                        <span className="fingerprint-line line-4" />
                        <span className="fingerprint-line line-5" />
                    </div>
                </div>
                {enrollmentStep === 'scanning' && <div className="scanner-light" />}
            </div>

            {enrollmentStep === 'ready' && (
                <div className="scanner-content">
                    <h3>Ready to Enroll</h3>
                    <p>Connect to the ZK9500 and capture three scans of the selected finger.</p>
                    <button type="button" className="scanner-start-button" onClick={onStartEnrollment}>
                        Start Fingerprint Enrollment
                    </button>
                </div>
            )}

            {enrollmentStep === 'scanning' && (
                <div className="scanner-content">
                    <div className="scanner-status">Reader active</div>
                    <h3>{message || 'Place your finger on the scanner'}</h3>
                    <p>Hold still while the reader captures. Lift your finger completely between scans.</p>
                </div>
            )}

            {enrollmentStep === 'reposition' && (
                <div className="scanner-content">
                    <div className="scanner-status reposition">Fingerprint scan captured</div>
                    <h3>Lift your finger</h3>
                    <p>{message || 'The reader is waiting for you to lift your finger, then scan the same finger again.'}</p>
                </div>
            )}

            {enrollmentStep === 'processing' && (
                <div className="scanner-content">
                    <div className="scanner-status reposition">Saving fingerprint</div>
                    <h3>Securing the fingerprint template</h3>
                    <p>{message}</p>
                </div>
            )}

            {enrollmentStep === 'complete' && (
                <div className="scanner-content scanner-complete">
                    <div className="scanner-complete-icon">✓</div>
                    <h3>Fingerprint Enrollment Complete</h3>
                    <p>{totalScans} matching scans were merged and saved securely on this kiosk.</p>
                </div>
            )}

            {enrollmentStep !== 'ready' && (
                <div className="scanner-counter">
                    <span className="counter-current">{scanCount}</span>
                    <span className="counter-divider">/</span>
                    <span>{totalScans}</span>
                    <span className="counter-label">scans captured</span>
                </div>
            )}
        </div>
    );
}

export default FingerprintScanner;
