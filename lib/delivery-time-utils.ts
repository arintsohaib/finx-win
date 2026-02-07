
/**
 * Utility functions for delivery time conversion and formatting
 */

export interface DeliveryTimeInput {
  value: number;
  unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'years';
}

export interface DeliveryTimeDisplay {
  durationSeconds: number;
  displayLabel: string;
}

/**
 * Convert duration input to seconds
 */
export function toSeconds(input: DeliveryTimeInput): number {
  const { value, unit } = input;
  
  switch (unit) {
    case 'seconds':
      return value;
    case 'minutes':
      return value * 60;
    case 'hours':
      return value * 3600;
    case 'days':
      return value * 86400;
    case 'years':
      return value * 31536000; // 365 days
    default:
      return value;
  }
}

/**
 * Convert seconds to abbreviated display label (30s, 2m, 4h, 7d, 1y)
 */
export function toDisplayLabel(seconds: number): string {
  if (seconds >= 31536000 && seconds % 31536000 === 0) {
    const years = Math.floor(seconds / 31536000);
    return `${years}y`;
  } else if (seconds >= 86400 && seconds % 86400 === 0) {
    const days = Math.floor(seconds / 86400);
    return `${days}d`;
  } else if (seconds >= 3600 && seconds % 3600 === 0) {
    const hours = Math.floor(seconds / 3600);
    return `${hours}h`;
  } else if (seconds >= 60 && seconds % 60 === 0) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Parse display label back to seconds (for backward compatibility)
 */
export function parseDisplayLabel(label: string): number {
  const match = label.match(/^(\d+)([smhdy])$/);
  if (!match) return 0;

  const [, value, unit] = match;
  const numValue = parseInt(value, 10);

  switch (unit) {
    case 's':
      return numValue;
    case 'm':
      return numValue * 60;
    case 'h':
      return numValue * 3600;
    case 'd':
      return numValue * 86400;
    case 'y':
      return numValue * 31536000;
    default:
      return 0;
  }
}

/**
 * Convert seconds to best-fit input format (for editing)
 */
export function fromSeconds(seconds: number): DeliveryTimeInput {
  if (seconds % 31536000 === 0) {
    return { value: seconds / 31536000, unit: 'years' };
  } else if (seconds % 86400 === 0) {
    return { value: seconds / 86400, unit: 'days' };
  } else if (seconds % 3600 === 0) {
    return { value: seconds / 3600, unit: 'hours' };
  } else if (seconds % 60 === 0) {
    return { value: seconds / 60, unit: 'minutes' };
  } else {
    return { value: seconds, unit: 'seconds' };
  }
}

/**
 * Validate delivery time constraints
 */
export function validateDeliveryTime(seconds: number): { valid: boolean; error?: string } {
  const MIN_SECONDS = 10;
  const MAX_SECONDS = 31536000; // 365 days

  if (seconds < MIN_SECONDS) {
    return { valid: false, error: `Minimum duration is ${MIN_SECONDS} seconds` };
  }

  if (seconds > MAX_SECONDS) {
    return { valid: false, error: `Maximum duration is ${MAX_SECONDS / 86400} days (1 year)` };
  }

  return { valid: true };
}

/**
 * Sort delivery times by duration (ascending)
 */
export function sortDeliveryTimes<T extends { durationSeconds: number }>(times: T[]): T[] {
  return [...times].sort((a, b) => a.durationSeconds - b.durationSeconds);
}
