/**
 * Safe Formatters & Data Guard Utilities
 * Prevents runtime client-side exceptions from missing, malformed, or undefined API / database fields.
 * Performs diagnostic logging for incomplete API responses to aid transparency and backend verification.
 */

export function logMissingField(fieldName: string, value: any, context?: string) {
  if (value === undefined || value === null || (typeof value === 'number' && isNaN(value))) {
    console.error(`🚨 [API Data Mapping Warning] Field '${fieldName}' in ${context || 'API Record'} is missing, null, or invalid:`, { value });
  }
}

export function safeCurrency(val: any, fallback = '₹0', fieldName = 'amount', context = 'UI Render'): string {
  if (val === undefined || val === null || (typeof val === 'number' && isNaN(val)) || (typeof val === 'string' && isNaN(Number(val)))) {
    logMissingField(fieldName, val, context);
    return fallback;
  }
  const num = typeof val === 'number' ? val : Number(val);
  try {
    return `₹${num.toLocaleString('en-IN')}`;
  } catch (error) {
    console.error(`🚨 [safeCurrency Error] Formatting failed for field '${fieldName}':`, error, { val });
    return fallback;
  }
}

export function safeNumber(val: any, fallback = 0, fieldName = 'number_field', context = 'Calculation'): number {
  if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '') || isNaN(Number(val))) {
    logMissingField(fieldName, val, context);
    return fallback;
  }
  const num = typeof val === 'number' ? val : Number(val);
  return isNaN(num) ? fallback : num;
}

export function safeNumberString(val: any, fallback = '0', fieldName = 'number_string', context = 'UI Render'): string {
  if (val === undefined || val === null || (typeof val === 'number' && isNaN(val)) || (typeof val === 'string' && isNaN(Number(val)))) {
    logMissingField(fieldName, val, context);
    return fallback;
  }
  const num = typeof val === 'number' ? val : Number(val);
  try {
    return num.toLocaleString('en-IN');
  } catch (error) {
    console.error(`🚨 [safeNumberString Error] Formatting failed for field '${fieldName}':`, error, { val });
    return fallback;
  }
}

export function safeDate(val: any, fallback = 'N/A', fieldName = 'date_field', context = 'Date Render'): string {
  if (!val) {
    logMissingField(fieldName, val, context);
    return fallback;
  }
  try {
    const d = typeof val === 'string' || typeof val === 'number' ? new Date(val) : val;
    if (isNaN(d.getTime())) {
      logMissingField(fieldName, val, `${context} (Invalid Date Object)`);
      return fallback;
    }
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.error(`🚨 [safeDate Error] Formatting failed for field '${fieldName}':`, error, { val });
    return fallback;
  }
}
