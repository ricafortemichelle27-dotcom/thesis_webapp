import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import './HamburgerMenu.css';

function HamburgerMenu({ isOpen, onClose }) {
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                isOpen &&
                !event.target.closest('.menu-wrapper')
            ) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener(
                'mousedown',
                handleClickOutside
            );
        };
    }, [isOpen, onClose]);

    const handleRegister = () => {
        onClose();
        navigate('/registration');
    };

    const handleSettings = () => {
        onClose();
        navigate('/settings/event-theme');
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="hamburger-dropdown">
            <button
                type="button"
                className="hamburger-dropdown-item"
                onClick={handleRegister}
            >
                Register / Enroll
            </button>

            <button
                type="button"
                className="hamburger-dropdown-item"
                onClick={handleSettings}
            >
                Settings
            </button>
        </div>
    );
}

export default HamburgerMenu;