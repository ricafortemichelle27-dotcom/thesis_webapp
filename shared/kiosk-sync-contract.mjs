// This allowlist is the entire outbound protocol. Biometrics have no wire representation.
export const studentFields = ['student_id', 'lastname', 'firstname', 'middlename', 'suffix',
    'department', 'major_program', 'year_level'];
export const uuid = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function centralId(value) {
    if (!Number.isSafeInteger(value) || value < 1 || value > 2147483647) throw new Error('Invalid central ID');
    return value;
}
export function studentProfile(input) {
    const result = {};
    const lengths = [50, 100, 100, 100, 20, 100, 150, 30];
    for (const [index, field] of studentFields.entries()) {
        const value = input[field];
        if (value == null || value === '') {
            if (['student_id', 'lastname', 'firstname', 'department'].includes(field)) throw new Error(`Missing ${field}`);
            result[field] = null;
        } else {
            if (typeof value !== 'string' || !value.trim() || value.trim().length > lengths[index]) throw new Error(`Invalid ${field}`);
            result[field] = value.trim();
        }
    }
    return result;
}
export function timestamp(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) ||
        !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) throw new Error('Expected UTC ISO timestamp');
    return value;
}
function exactKeys(value, keys) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        Object.keys(value).some((key) => !keys.includes(key)) || keys.some((key) => !(key in value))) throw new Error('Unexpected sync fields');
}
export function validateOperation(input) {
    exactKeys(input, ['protocol_version', 'kiosk_id', 'operation_id', 'kind', 'data']);
    if (input.protocol_version !== 1 || !uuid(input.kiosk_id) || !uuid(input.operation_id)) throw new Error('Invalid sync identity/version');
    let data;
    if (input.kind === 'student.register') {
        exactKeys(input.data, studentFields);
        data = studentProfile(input.data);
    } else if (['attendance.in', 'attendance.out'].includes(input.kind)) {
        exactKeys(input.data, ['student_id', 'event_id', 'occurred_at']);
        data = { student_id: centralId(input.data.student_id), event_id: centralId(input.data.event_id), occurred_at: timestamp(input.data.occurred_at) };
    } else throw new Error('Unsupported sync operation');
    return { protocol_version: 1, kiosk_id: input.kiosk_id, operation_id: input.operation_id, kind: input.kind, data };
}
