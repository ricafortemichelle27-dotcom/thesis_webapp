import { useNavigate, useLocation } from 'react-router-dom';
import './Footer.css';

function FooterIcon({ type }) {
    const icons = {
        home: (
            <>
                <path d="M12 4 4 10v9h5v-5h6v5h5v-9l-8-6Z" />
            </>
        ),

        events: (
            <>
                <path
                    d="M6 5h12v14H6zM8 3v4M16 3v4M6 9h12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                />
                <path
                    d="m9 14 2 2 4-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </>
        ),
    };

    return (
        <svg
            className="kiosk-footer-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
            {icons[type]}
        </svg>
    );
}

function Footer() {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <nav className="kiosk-footer" aria-label="Kiosk navigation">

            {/* Home */}
            <button
                className={location.pathname === '/' ? 'active' : ''}
                type="button"
                aria-label="Home"
                onClick={() => navigate('/')}
            >
                <FooterIcon type="home" />
            </button>

            {/* Events */}
            <button
                className={location.pathname === '/event' ? 'active' : ''}
                type="button"
                aria-label="Events"
                onClick={() => navigate('/event')}
            >
                <FooterIcon type="events" />
            </button>

        </nav>
    );
}

export default Footer;