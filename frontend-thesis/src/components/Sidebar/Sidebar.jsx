import "./Sidebar.css";
import schoolLogo from "../../assets/images/school_logo.png";
import sidebarPhoto from "../../assets/images/sidebarphoto.jpeg";
import { getCurrentUser } from "../../utils/cookiesUtils.js";
import { FontAwesomeIcon } from "../../utils/icons.js";
import { navigationData } from "../../utils/navigationData.js";

function Sidebar({ isOpen }) {
    const user = getCurrentUser();
    const userRole = user?.role;
    const roleLabel =
        userRole === "system_admin" || userRole === "system-admin"
            ? "System Admin"
            : "Event Admin";

    const visibleNavigation = navigationData.filter(
        (item) =>
            item.roles.includes("all") ||
            item.roles.includes(userRole)
    );

    return (
        <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
            <div className="sidebar-photo" aria-hidden="true">
                <img src={sidebarPhoto} alt="" />
            </div>

            {/* Sidebar Header */}
            <div className="sidebar-header">
                <div className="side-brand">
                    <img
                        src={schoolLogo}
                        alt="School logo"
                        className="brand-logo"
                    />

                    <div className="school-name">
                        <h2>Westmead</h2>
                        <p>International School</p>
                        <span>Admin Portal</span>
                    </div>
                </div>

            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">

                {visibleNavigation.map((item) => (

                    <a
                        key={item.path}
                        href={item.path}
                        className="side-item"
                    >

                        <div className="side-left">

                            <span className="side-icon">
                                <FontAwesomeIcon
                                    icon={item.iconName}
                                />
                            </span>

                            <span className="side-label">
                                {item.label}
                            </span>

                        </div>

                    </a>

                ))}

            </nav>

            <div className="sidebar-role">
                <span className="sidebar-role-caption">Current Role</span>
                <strong>{roleLabel}</strong>
            </div>

        </aside>
    );
}

export default Sidebar;