import {
    faGaugeHigh,
    faCertificates,
    faUserCheck,
    faGear,
    faUsers,
    faCalendarDays
} from "../utils/icons.js";

export const navigationData = [
    {
        path: "/dashboard",
        iconName: faGaugeHigh,
        label: "DASHBOARD",
        roles: ["all"]
    },
    {
        path: "/users",
        iconName: faUsers,
        label: "USERS",
        roles: ["system-admin", "system_admin"]
    },
    {
        path: "/events",
        iconName: faCalendarDays,
        label: "EVENTS",
        roles: ["all"]
    },
    {
        path: "/certificate",
        iconName: faCertificates,
        label: "CERTIFICATES",
        roles: ["event-admin", "event_admin"]
    },
    {
        path: "/attendance-reports",
        iconName: faUserCheck,
        label: "ATTENDANCE REPORTS",
        roles: ["all"]
    },
    {
        path: "/system-settings",
        iconName: faGear,
        label: "SYSTEM SETTINGS",
        roles: ["all"]
    }
];