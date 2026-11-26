
// Neutralizes untrusted values before they are written to the workflow log (CWE-117).
// CR/LF and other control characters are replaced so a value cannot forge additional
// log lines or inject GitHub Actions workflow commands (lines starting with "::").
export function sanitizeLog(value: unknown): string {
    return String(value ?? '')
        .replace(/[\r\n\u2028\u2029]+/g, ' ')
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .replace(/::/g, ': :');
}
