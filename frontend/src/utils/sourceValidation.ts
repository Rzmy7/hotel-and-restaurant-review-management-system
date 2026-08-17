/**
 * Source URL Validation Utility
 * Validates syntax, normalizes protocols, and checks platform domain compatibility.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  normalizedUrl?: string;
}

/**
 * Normalizes a URL by trimming whitespace and prepending https:// if protocol is missing.
 */
export const normalizeUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

/**
 * Validates standard HTTP/HTTPS URL format.
 */
export const isValidUrlFormat = (url: string): boolean => {
  if (!url || !url.trim()) return false;
  const normalized = normalizeUrl(url);
  try {
    const parsed = new URL(normalized);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Platform domain mapping rules
 */
const PLATFORM_DOMAINS: Record<string, string[]> = {
  'booking.com': ['booking.com'],
  'booking': ['booking.com'],
  'agoda': ['agoda.com'],
  'tripadvisor': ['tripadvisor.com', 'tripadvisor.in', 'tripadvisor.co.uk', 'tripadvisor.ca', 'tripadvisor.fr', 'tripadvisor.de', 'tripadvisor.it'],
  'google reviews': ['google.com', 'goo.gl', 'g.page', 'maps.app.goo.gl'],
  'google': ['google.com', 'goo.gl', 'g.page', 'maps.app.goo.gl'],
  'airbnb': ['airbnb.com', 'airbnb.co.uk', 'airbnb.ca'],
  'expedia': ['expedia.com', 'expedia.ca', 'expedia.co.uk'],
  'yelp': ['yelp.com', 'yelp.ca'],
  'zomato': ['zomato.com'],
  'opentable': ['opentable.com', 'opentable.co.uk'],
  'hotels.com': ['hotels.com'],
};

/**
 * Validates a property/listing URL against generic syntax and specific platform requirements.
 */
export const validatePlatformUrl = (
  platformName: string | undefined | null,
  url: string
): ValidationResult => {
  const trimmed = url.trim();
  if (!trimmed) {
    return { isValid: false, error: 'URL is required.' };
  }

  const normalized = normalizeUrl(trimmed);

  let parsed: URL;
  try {
    parsed = new URL(normalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, error: 'URL must start with http:// or https://' };
    }
    // Basic check for a top-level domain / valid host
    if (!parsed.hostname.includes('.')) {
      return { isValid: false, error: 'Please enter a valid web domain (e.g. example.com).' };
    }
  } catch {
    return { isValid: false, error: 'Invalid URL format. Please check the address.' };
  }

  if (!platformName) {
    return { isValid: true, normalizedUrl: normalized };
  }

  const normalizedPlatformKey = platformName.trim().toLowerCase();
  const allowedDomains = PLATFORM_DOMAINS[normalizedPlatformKey];

  if (allowedDomains && allowedDomains.length > 0) {
    const hostname = parsed.hostname.toLowerCase();
    const isDomainMatch = allowedDomains.some((domain) =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    );

    if (!isDomainMatch) {
      return {
        isValid: false,
        error: `URL does not match ${platformName} (expected domain e.g. ${allowedDomains[0]}).`,
        normalizedUrl: normalized,
      };
    }
  }

  return { isValid: true, normalizedUrl: normalized };
};
