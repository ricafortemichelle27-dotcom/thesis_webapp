import { useState } from 'react';

import './Header.css';

import schoolLogo from '../../assets/images/school_logo.png';

import HamburgerMenu from '../HamburgerMenu/HamburgerMenu.jsx';

function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <div className="menu-wrapper">
            <header className="kiosk-header">

                <div className="school-brand">
                    <img
                        className="school-crest"
                        src={schoolLogo}
                        alt="Westmead International School logo"
                    />

                    <div>
                        <strong>Westmead International School</strong>
                        <span>Alangilan, Batangas City</span>
                    </div>
                </div>

                <button
                    className="menu-button"
                    type="button"
                    aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={isMenuOpen}
                    aria-controls="kiosk-navigation-menu"
                    onClick={() => setIsMenuOpen((open) => !open)}
                >
                    <span />
                    <span />
                    <span />
                </button>

            </header>

            <HamburgerMenu
                id="kiosk-navigation-menu"
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
            />
        </div>
    );
}

export default Header;