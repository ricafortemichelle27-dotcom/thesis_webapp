import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'node:url';

const envPath = fileURLToPath(new URL('./.env', import.meta.url));
dotenv.config({ path: envPath });

const smtpUser = String(process.env.SMTP_USER || '').trim();
const smtpPassword = String(process.env.SMTP_PASSWORD || '').replace(/\s+/g, '');

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || 'false') === 'true',
  auth: {
    user: smtpUser,
    pass: smtpPassword,
  },
});

console.log('SMTP_ENV_LOADED=' + Boolean(smtpUser && smtpPassword));
console.log('SMTP_USER_OK=' + /^[^\s@]+@gmail\.com$/i.test(smtpUser));
console.log('SMTP_PASSWORD_LENGTH=' + smtpPassword.length);
console.log('SMTP_PASSWORD_FORMAT_OK=' + /^[A-Za-z0-9]{16}$/.test(smtpPassword));

transport.verify()
  .then(() => {
    console.log('SMTP_VERIFY=true');
  })
  .catch((error) => {
    const msg = error && error.message ? String(error.message).replace(/\s+/g, ' ').slice(0, 180) : 'unknown';
    console.log('SMTP_VERIFY=false');
    console.log('SMTP_ERROR=' + msg);
    process.exitCode = 1;
  });
