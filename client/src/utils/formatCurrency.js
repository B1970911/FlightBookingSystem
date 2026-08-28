/**
 * Formats a numeric price into Ethiopian Birr (ETB) display format.
 *
 * Examples:
 *   450    -> "ETB 450.00"
 *   1000   -> "ETB 1,000.00"
 *   25000  -> "ETB 25,000.00"
 *
 * @param {number|string} amount - The numeric amount to format
 * @returns {string} Formatted currency string in ETB
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || amount === '') {
    return 'ETB 0.00';
  }

  const numericAmount = typeof amount === 'number' ? amount : Number(amount);

  if (Number.isNaN(numericAmount)) {
    return 'ETB 0.00';
  }

  const formattedNumber = numericAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `ETB ${formattedNumber}`;
}

export default formatCurrency;
