const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export async function getKioskData(path, signal) {
    let response;
    try {
        response = await fetch(`${API_BASE_URL}/api/kiosk${path}`, { signal, cache: 'no-store' });
    } catch (error) {
        if (error.name === 'AbortError') throw error;
        throw new Error('Cannot reach the event server. Check the connection and try again.', { cause: error });
    }
    let data;
    try { data = await response.json(); }
    catch { throw new Error('The event server returned an invalid response.'); }
    if (!response.ok) throw new Error(data.message || 'Unable to retrieve event information.');
    return data;
}

export function assetUrl(value) {
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    return `${API_BASE_URL}${value.startsWith('/') ? '' : '/uploads/'}${value}`;
}
