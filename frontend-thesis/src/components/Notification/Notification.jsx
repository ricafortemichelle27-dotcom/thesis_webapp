import { useEffect } from 'react';
import { FontAwesomeIcon, faCircleCheck } from '../../utils/icons.js';
import './Notification.css';

export default function Notification({ message, onDismiss }) {
    useEffect(() => {
        if (!message) return;
        const timer = setTimeout(onDismiss, 6000);
        return () => clearTimeout(timer);
    }, [message, onDismiss]);

    if (!message) return null;
    return (
        <div className="success-notification" role="status" aria-live="polite">
            <FontAwesomeIcon icon={faCircleCheck} aria-hidden="true" />
            <span>{message}</span>
            <button type="button" aria-label="Dismiss notification" onClick={onDismiss}>×</button>
        </div>
    );
}
