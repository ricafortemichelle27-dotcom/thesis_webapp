export const setCookie = (name, value, days) => {
    let expires = "";

    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }

    const val = typeof value === "object"
        ? JSON.stringify(value)
        : value;

    document.cookie =
        name + "=" + encodeURIComponent(val) + expires + "; path=/";

    if (name === "user") {
        localStorage.setItem(name, val);
    }
};

export const getCookie = (name) => {
        const cookies = document.cookie.split(";");

        for (const cookie of cookies) {
            const separatorIndex = cookie.indexOf("=");
            const key = cookie.slice(0, separatorIndex).trim();
            const value = cookie.slice(separatorIndex + 1);

            if (key === name) {
                return decodeURIComponent(value);
            }
        }

        return localStorage.getItem(name);
    };

export const deleteCookie = (name) => {
    document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

    localStorage.removeItem(name);
}

// Get current logged-in user
export const getCurrentUser = () => {
    const userCookie = getCookie("user");

    if (!userCookie) {
        return null;
    }

    try {
        return JSON.parse(userCookie);
    } catch {
        return null;
    }
};
