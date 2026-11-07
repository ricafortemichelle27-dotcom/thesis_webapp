import { deleteCookie, getCurrentUser } from '../../utils/cookiesUtils.js';

import { useNavigate } from 'react-router-dom';

import { useState } from 'react';

import {
    FontAwesomeIcon,
    faBell,
    faUser,
    faBars,
    faMagnifyingGlass,
    faChevronDown,
    faRightFromBracket
} from '../../utils/icons.js';

import './Header.css';

function Header({ onMenuClick }) {
    const navigate = useNavigate();
    const user = getCurrentUser();
    const isEventAdmin = user?.role === 'event_admin' || user?.role === 'event-admin';
    const eventAdminName = user?.fullname || user?.name || user?.fullName;

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
                        <FontAwesomeIcon icon={faMagnifyingGlass} />
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
                            <FontAwesomeIcon icon={faChevronDown} />
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

                                {isEventAdmin && eventAdminName && (
                                    <div className="profile-admin-name">
                                        {eventAdminName}
                                    </div>
                                )}

                                {/* Logout Button */}
                                <button
                                    className='settings-btn'
                                    type='button'
                                    onClick={handleLogout}
                                >
                                    <FontAwesomeIcon icon={faRightFromBracket} />
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
