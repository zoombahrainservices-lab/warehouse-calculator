// Utility functions for the warehouse calculator application

/**
 * Cleans a number input string by removing leading zeros
 * @param value The input value as a string
 * @returns Cleaned number value
 */
export function cleanNumberInput(value: string): number {
  if (value === '' || value === '0') {
    return 0;
  }
  // Remove any leading zeros from the string value
  const cleanValue = value.replace(/^0+/, '') || '0';
  return parseFloat(cleanValue) || 0;
}

/**
 * Formats a number for display, removing unnecessary decimals
 * @param value The number to format
 * @param decimals Maximum decimal places (default: 1)
 * @returns Formatted string
 */
export function formatNumber(value: number, decimals: number = 1): string {
  if (value === 0) return '0';
  return value.toFixed(decimals).replace(/\.?0+$/, '');
}

/**
 * Handles number input change events with leading zero prevention
 * @param e The change event
 * @returns Processed number value
 */
export function handleNumberInputChange(e: React.ChangeEvent<HTMLInputElement>): number {
  const { value } = e.target;
  return cleanNumberInput(value);
}
