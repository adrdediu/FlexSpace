/**
 * Format a UTC ISO timestamp for display in the audit log / activity views.
 *
 * Shows:
 *   Primary:     UTC time using user's hour format (12h/24h)
 *   Secondary:   User's local timezone equivalent + timezone abbreviation
 *
 * Example (12h user in CET):
 *   03:45 PM UTC
 *   04:45 PM CET
 */
export function formatAuditTimestamp(
  iso: string,
  formatTime: (d: Date) => string,
  getTimezoneAbbreviation: (d: Date) => string,
  timeFormat: '12' | '24'
): { utc: string; local: string; localTz: string } {
  try {
    const date = new Date(iso);

    // UTC time respecting hour format preference
    const utcFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: timeFormat === '12',
    });
    const utc = utcFormatter.format(date);

    // Local timezone time using preferences formatTime
    const localTime = formatTime(date);
    const localTz = getTimezoneAbbreviation(date);

    return { utc, local: localTime, localTz };
  } catch {
    return { utc: iso, local: '', localTz: '' };
  }
}

export function formatAuditShortTime(
  iso: string,
  timeFormat: '12' | '24'
): string {
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: timeFormat === '12',
    }).format(date) + ' UTC';
  } catch { return iso; }
}