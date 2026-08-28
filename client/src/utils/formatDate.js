/**
 * Safely parses input into a Date object.
 * @param {string|number|Date} dateInput 
 * @returns {Date|null}
 */
function parseDate(dateInput) {
  if (!dateInput) return null;
  const date = new Date(dateInput);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Formats a date into a human-readable date string.
 * Example: "Aug 24, 2026"
 * @param {string|number|Date} dateInput 
 * @returns {string}
 */
export function formatDate(dateInput) {
  const date = parseDate(dateInput);
  if (!date) return '--';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats a date into a short date with weekday.
 * Example: "Mon, Aug 24"
 * @param {string|number|Date} dateInput 
 * @returns {string}
 */
export function formatShortDate(dateInput) {
  const date = parseDate(dateInput);
  if (!date) return '--';
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats a date into a 24-hour / 12-hour time string suitable for flight schedules.
 * Example: "14:30" or "02:30 PM"
 * @param {string|number|Date} dateInput 
 * @param {boolean} [use24Hour=true]
 * @returns {string}
 */
export function formatTime(dateInput, use24Hour = true) {
  const date = parseDate(dateInput);
  if (!date) return '--:--';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24Hour,
  });
}

/**
 * Formats a date and time together.
 * Example: "Aug 24, 2026, 14:30"
 * @param {string|number|Date} dateInput 
 * @returns {string}
 */
export function formatDateTime(dateInput) {
  const date = parseDate(dateInput);
  if (!date) return '--';
  return `${formatDate(date)}, ${formatTime(date)}`;
}

/**
 * Calculates and formats the duration between departure and arrival times.
 * Example: "2h 30m"
 * @param {string|number|Date} departure 
 * @param {string|number|Date} arrival 
 * @returns {string}
 */
export function formatFlightDuration(departure, arrival) {
  const depDate = parseDate(departure);
  const arrDate = parseDate(arrival);
  if (!depDate || !arrDate) return '--';

  const diffMs = arrDate.getTime() - depDate.getTime();
  if (diffMs < 0) return '--';

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export default {
  formatDate,
  formatShortDate,
  formatTime,
  formatDateTime,
  formatFlightDuration,
};
