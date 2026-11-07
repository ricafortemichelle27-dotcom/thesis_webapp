import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const ps = (script, input) => execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script],
    { input, encoding: 'utf8', windowsHide: true }).trim();

export function localPaths() {
    if (process.platform !== 'win32' || !process.env.LOCALAPPDATA) throw new Error('Windows DPAPI required; provide an OS-protected key provider on other systems');
    const root = join(process.env.LOCALAPPDATA, 'ThesisKiosk');
    return { root, keyFile: join(root, 'keys', 'templates.dpapi') };
}

export function loadWindowsKey({ initialize = false, allowCreate = false } = {}) {
    const paths = localPaths();
    if (initialize) {
        mkdirSync(paths.root, { recursive: true });
        const sid = ps('[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value');
        execFileSync('icacls.exe', [paths.root, '/inheritance:r', '/grant:r', `*${sid}:(OI)(CI)F`, '*S-1-5-18:(OI)(CI)F'], { windowsHide: true });
        mkdirSync(join(paths.root, 'keys'), { recursive: true });
        if (!existsSync(paths.keyFile)) {
            if (!allowCreate) throw new Error('Existing database without key; restore original DPAPI key, do not generate a replacement');
            const key = randomBytes(32);
            try {
                const protectedValue = ps(`Add-Type -AssemblyName System.Security; $bytes = [Convert]::FromBase64String([Console]::In.ReadToEnd()); [Convert]::ToBase64String([System.Security.Cryptography.ProtectedData]::Protect($bytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser))`, key.toString('base64'));
                writeFileSync(paths.keyFile, protectedValue, { flag: 'wx', mode: 0o600 });
            } finally { key.fill(0); }
        }
    }
    const key = Buffer.from(ps(`Add-Type -AssemblyName System.Security; $bytes = [Convert]::FromBase64String([Console]::In.ReadToEnd()); [Convert]::ToBase64String([System.Security.Cryptography.ProtectedData]::Unprotect($bytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser))`, readFileSync(paths.keyFile, 'utf8')), 'base64');
    if (key.length !== 32) throw new Error('Invalid encryption key');
    return { key, keyId: 'dpapi-v1', ...paths };
}
