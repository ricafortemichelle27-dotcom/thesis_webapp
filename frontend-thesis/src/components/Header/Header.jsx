import { deleteCookie } from '../../utils/cookiesUtils.js';

import { useNavigate } from 'react-router-dom';

import { useState } from 'react';

import {
    FontAwesomeIcon,
    faBell,
    faUser,
    faBars,
    faSearch
} from '../../utils/icons.js';

import './Header.css';

function Header({ onMenuClick }) {
    const navigate = useNavigate();

    // Logout
    const handleLogout = () => {
        deleteCookie('user');
        navigate('/');
    };

    const [isProfileOpen, setIsProfileOpen] = useState(false);

    return (
        <>
            <header className='header'>

                {/* Menu Button + Search Bar */}
                <div className="header-menu">

                    <button
                        className="open-menu"
                        type='button'
                        onClick={onMenuClick}
                    >
                        <FontAwesomeIcon icon={faBars} />
                    </button>

                    {/* Search Bar */}
                    <div className="header-search">
                        <FontAwesomeIcon icon={faSearch} />
                        <input
                            type="text"
                            placeholder="Search..."
                        />
                    </div>

                </div>


                <div className="header-actions">

                    {/* Notification Button */}
                    <button className="notification-btn">
                        <FontAwesomeIcon icon={faBell} /> Notifications
                    </button>

                    <div className="profile-menu">

                        {/* Profile Menu Button */}
                        <button
                            className="profile-btn"
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                        >
                            <FontAwesomeIcon icon={faUser} />
                            <span> ▼</span>
                        </button>

                        {isProfileOpen && (
                            <div className="profile-dropdown">

                                {/* Profile Button */}
                                <button
                                    className='settings-btn'
                                    type='button'
                                    onClick={() => navigate('/profile')}
                                >
                                    Profile
                                </button>

                                {/* Logout Button */}
                                <button
                                    className='settings-btn'
                                    type='button'
                                    onClick={handleLogout}
                                >
                                    Logout
                                </button>

                            </div>
                        )}

                    </div>

                </div>

            </header>
        </>
    );
}

export default Header;