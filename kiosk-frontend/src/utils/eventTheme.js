export const EVENT_THEME_STORAGE_KEY = 'eventPageTheme';
export const EVENT_THEMES_BY_ID_KEY = 'eventThemeSettingsByEvent';

export const DEFAULT_EVENT_THEME = {
    primaryColor: '#14213d',
    secondaryColor: '#8c0925',
    accentColor: '#fca311',
    backgroundImage: '',
    logoImage: '',
};

export const WIS_EVENT_THEME = {
    primaryColor: '#bc211b',
    secondaryColor: '#bc211b',
    accentColor: '#f3c91f',
};

export function loadEventTheme(eventId) {
    try {
        if (eventId) {
            const saved = JSON.parse(localStorage.getItem(EVENT_THEMES_BY_ID_KEY) || '{}');
            return { ...DEFAULT_EVENT_THEME, ...pickColors(saved[String(eventId)]?.theme) };
        }
        const storedTheme = localStorage.getItem(EVENT_THEME_STORAGE_KEY);

        if (!storedTheme) {
            return DEFAULT_EVENT_THEME;
        }

        return {
            ...DEFAULT_EVENT_THEME,
            ...JSON.parse(storedTheme),
        };
    } catch {
        return DEFAULT_EVENT_THEME;
    }
}

function pickColors(theme) {
    return Object.fromEntries(['primaryColor', 'secondaryColor', 'accentColor']
        .filter((key) => /^#[0-9a-f]{6}$/i.test(theme?.[key]))
        .map((key) => [key, theme[key]]));
}

export function saveEventColors(eventId, theme) {
    if (!eventId) throw new Error('Select an event first.');
    const saved = JSON.parse(localStorage.getItem(EVENT_THEMES_BY_ID_KEY) || '{}');
    const settings = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    settings[String(eventId)] = { mode: 'EVENT', theme: { ...DEFAULT_EVENT_THEME, ...pickColors(theme) } };
    localStorage.setItem(EVENT_THEMES_BY_ID_KEY, JSON.stringify(settings));
}

export function saveEventTheme(theme) {
    localStorage.setItem(
        EVENT_THEME_STORAGE_KEY,
        JSON.stringify(theme),
    );
}
