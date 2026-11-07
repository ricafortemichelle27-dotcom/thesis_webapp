const KIOSK_BRIDGE_URL = (import.meta.env.VITE_KIOSK_BRIDGE_URL || 'http://127.0.0.1:5182').replace(/\/$/, '');

async function request(path, options = {}) {
    let response;
    try {
        response = await fetch(`${KIOSK_BRIDGE_URL}${path}`, {
            ...options,
            headers: options.body ? { 'content-type': 'application/json', ...options.headers } : options.headers,
            cache: 'no-store',
        });
    } catch (error) {
        if (error.name === 'AbortError') throw error;
        throw new Error('Cannot reach the kiosk scanner service. Start the local kiosk bridge and retry.', { cause: error });
    }

    let data;
    try { data = await response.json(); }
    catch { throw new Error('The kiosk scanner service returned an invalid response.'); }
    if (!response.ok) throw new Error(data.message || 'Fingerprint enrollment failed.');
    return data;
}

export function startFingerprintEnrollment(profile, fingerPosition) {
    return request('/api/enrollments', {
        method: 'POST',
        body: JSON.stringify({ profile, fingerPosition }),
    });
}

export function getFingerprintEnrollment(id, signal) {
    return request(`/api/enrollments/${encodeURIComponent(id)}`, { signal });
}

export function cancelFingerprintEnrollment(id) {
    return request(`/api/enrollments/${encodeURIComponent(id)}/cancel`, { method: 'POST', body: '{}' });
}
