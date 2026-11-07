import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const aad = (row) => Buffer.from(JSON.stringify([1, row.local_template_id, row.local_student_id,
    row.finger_position, row.template_format, row.sdk_version, row.key_id]));
export function encryptTemplate(bytes, metadata, key) {
    if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > 1024 * 1024) throw new Error('Invalid template bytes');
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, nonce, { authTagLength: 16 });
    cipher.setAAD(aad(metadata));
    const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
    return { nonce, ciphertext, auth_tag: cipher.getAuthTag() };
}
export function decryptTemplate(row, key) {
    const decipher = createDecipheriv('aes-256-gcm', key, row.nonce, { authTagLength: 16 });
    decipher.setAAD(aad(row));
    decipher.setAuthTag(row.auth_tag);
    return Buffer.concat([decipher.update(row.ciphertext), decipher.final()]);
}
