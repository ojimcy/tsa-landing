// A private group's invite link, for the hand-off page (/g/:code).

// The API's invite code: 16 random bytes, base64url without padding.
export const isGroupInviteCode = (code: string) => /^[A-Za-z0-9_-]{22}$/.test(code);

/** Opens the installed app on this invite (the app's registered scheme). */
export const groupAppUrl = (code: string) => `tsaconnect://group/${encodeURIComponent(code)}`;
