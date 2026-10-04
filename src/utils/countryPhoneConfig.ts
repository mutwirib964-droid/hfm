export interface CountryPhoneConfig {
  code: string;
  iso: string;
  name: string;
  flag: string;
  placeholder: string;
  exampleFormat: string;
  minDigits: number;
  maxDigits: number;
  defaultCity: string;
  groups: number[];
}

export const COUNTRY_OPTIONS: CountryPhoneConfig[] = [
  {
    code: '+1',
    iso: 'US',
    name: 'United States / Canada',
    flag: '🇺🇸',
    placeholder: '202 555 0143',
    exampleFormat: '10 digits (e.g. 202 555 0143)',
    minDigits: 10,
    maxDigits: 10,
    defaultCity: 'New York',
    groups: [3, 3, 4],
  },
  {
    code: '+44',
    iso: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    placeholder: '7911 123456',
    exampleFormat: '10–11 digits (e.g. 7911 123456 or 20 7946 0921)',
    minDigits: 9,
    maxDigits: 11,
    defaultCity: 'London',
    groups: [4, 6],
  },
  {
    code: '+254',
    iso: 'KE',
    name: 'Kenya',
    flag: '🇰🇪',
    placeholder: '712 345 678',
    exampleFormat: '9–10 digits (e.g. 712 345 678 or 0110 123 456)',
    minDigits: 9,
    maxDigits: 10,
    defaultCity: 'Nairobi',
    groups: [3, 3, 3],
  },
  {
    code: '+234',
    iso: 'NG',
    name: 'Nigeria',
    flag: '🇳🇬',
    placeholder: '803 123 4567',
    exampleFormat: '10–11 digits (e.g. 803 123 4567 or 0901 234 5678)',
    minDigits: 10,
    maxDigits: 11,
    defaultCity: 'Lagos',
    groups: [3, 3, 4],
  },
  {
    code: '+27',
    iso: 'ZA',
    name: 'South Africa',
    flag: '🇿🇦',
    placeholder: '82 123 4567',
    exampleFormat: '9–10 digits (e.g. 82 123 4567 or 061 234 5678)',
    minDigits: 9,
    maxDigits: 10,
    defaultCity: 'Johannesburg',
    groups: [2, 3, 4],
  },
  {
    code: '+255',
    iso: 'TZ',
    name: 'Tanzania',
    flag: '🇹🇿',
    placeholder: '754 123 456',
    exampleFormat: '9–10 digits (e.g. 754 123 456 or 655 123 456)',
    minDigits: 9,
    maxDigits: 10,
    defaultCity: 'Dar es Salaam',
    groups: [3, 3, 3],
  },
  {
    code: '+256',
    iso: 'UG',
    name: 'Uganda',
    flag: '🇺🇬',
    placeholder: '772 123 456',
    exampleFormat: '9–10 digits (e.g. 772 123 456 or 701 234 567)',
    minDigits: 9,
    maxDigits: 10,
    defaultCity: 'Kampala',
    groups: [3, 3, 3],
  },
  {
    code: '+250',
    iso: 'RW',
    name: 'Rwanda',
    flag: '🇷🇼',
    placeholder: '788 123 456',
    exampleFormat: '9–10 digits (e.g. 788 123 456)',
    minDigits: 9,
    maxDigits: 10,
    defaultCity: 'Kigali',
    groups: [3, 3, 3],
  },
  {
    code: '+233',
    iso: 'GH',
    name: 'Ghana',
    flag: '🇬🇭',
    placeholder: '24 123 4567',
    exampleFormat: '9–10 digits (e.g. 24 123 4567 or 55 123 4567)',
    minDigits: 9,
    maxDigits: 10,
    defaultCity: 'Accra',
    groups: [2, 3, 4],
  },
  {
    code: '+251',
    iso: 'ET',
    name: 'Ethiopia',
    flag: '🇪🇹',
    placeholder: '91 123 4567',
    exampleFormat: '9–10 digits (e.g. 91 123 4567)',
    minDigits: 9,
    maxDigits: 10,
    defaultCity: 'Addis Ababa',
    groups: [2, 3, 4],
  },
  {
    code: '+20',
    iso: 'EG',
    name: 'Egypt',
    flag: '🇪🇬',
    placeholder: '100 123 4567',
    exampleFormat: '10–11 digits (e.g. 100 123 4567)',
    minDigits: 10,
    maxDigits: 11,
    defaultCity: 'Cairo',
    groups: [3, 3, 4],
  },
  {
    code: '+260',
    iso: 'ZM',
    name: 'Zambia',
    flag: '🇿🇲',
    placeholder: '97 123 4567',
    exampleFormat: '9–10 digits (e.g. 97 123 4567)',
    minDigits: 9,
    maxDigits: 10,
    defaultCity: 'Lusaka',
    groups: [2, 3, 4],
  },
  {
    code: '+263',
    iso: 'ZW',
    name: 'Zimbabwe',
    flag: '🇿🇼',
    placeholder: '77 123 4567',
    exampleFormat: '9–10 digits (e.g. 77 123 4567)',
    minDigits: 9,
    maxDigits: 10,
    defaultCity: 'Harare',
    groups: [2, 3, 4],
  },
  {
    code: '+971',
    iso: 'AE',
    name: 'United Arab Emirates',
    flag: '🇦🇪',
    placeholder: '50 123 4567',
    exampleFormat: '9–10 digits (e.g. 50 123 4567 or 58 123 4567)',
    minDigits: 9,
    maxDigits: 10,
    defaultCity: 'Dubai',
    groups: [2, 3, 4],
  },
  {
    code: '+91',
    iso: 'IN',
    name: 'India',
    flag: '🇮🇳',
    placeholder: '98765 43210',
    exampleFormat: '10 digits (e.g. 98765 43210)',
    minDigits: 10,
    maxDigits: 11,
    defaultCity: 'Mumbai',
    groups: [5, 5],
  },
  {
    code: '+61',
    iso: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    placeholder: '412 345 678',
    exampleFormat: '9–10 digits (e.g. 412 345 678)',
    minDigits: 9,
    maxDigits: 10,
    defaultCity: 'Sydney',
    groups: [3, 3, 3],
  },
  {
    code: '+49',
    iso: 'DE',
    name: 'Germany',
    flag: '🇩🇪',
    placeholder: '1512 3456789',
    exampleFormat: '10–12 digits (e.g. 1512 3456789)',
    minDigits: 10,
    maxDigits: 12,
    defaultCity: 'Frankfurt',
    groups: [4, 7],
  },
  {
    code: '+33',
    iso: 'FR',
    name: 'France',
    flag: '🇫🇷',
    placeholder: '6 12 34 56 78',
    exampleFormat: '9–10 digits (e.g. 6 12 34 56 78)',
    minDigits: 9,
    maxDigits: 10,
    defaultCity: 'Paris',
    groups: [1, 2, 2, 2, 2],
  },
  {
    code: '+65',
    iso: 'SG',
    name: 'Singapore',
    flag: '🇸🇬',
    placeholder: '8123 4567',
    exampleFormat: '8 digits (e.g. 8123 4567 or 9123 4567)',
    minDigits: 8,
    maxDigits: 8,
    defaultCity: 'Singapore',
    groups: [4, 4],
  },
  {
    code: '+55',
    iso: 'BR',
    name: 'Brazil',
    flag: '🇧🇷',
    placeholder: '11 98765 4321',
    exampleFormat: '10–11 digits (e.g. 11 98765 4321)',
    minDigits: 10,
    maxDigits: 11,
    defaultCity: 'São Paulo',
    groups: [2, 5, 4],
  },
];

export function getCountryByCode(
  code?: string | CountryPhoneConfig | null
): CountryPhoneConfig {
  if (!code) return COUNTRY_OPTIONS[0];
  if (typeof code === 'object' && 'code' in code && typeof code.code === 'string') {
    return (
      COUNTRY_OPTIONS.find((c) => c.code === code.code) ||
      code ||
      COUNTRY_OPTIONS[0]
    );
  }
  const codeStr = String(code).trim();
  if (!codeStr) return COUNTRY_OPTIONS[0];
  const normalized = codeStr.startsWith('+') ? codeStr : `+${codeStr}`;
  return COUNTRY_OPTIONS.find((c) => c.code === normalized) || COUNTRY_OPTIONS[0];
}

export function getCountryByName(name?: string | null): CountryPhoneConfig {
  if (!name || typeof name !== 'string') return COUNTRY_OPTIONS[0];
  const lower = name.toLowerCase().trim();
  return (
    COUNTRY_OPTIONS.find(
      (c) => c.name.toLowerCase() === lower || c.name.toLowerCase().includes(lower)
    ) || COUNTRY_OPTIONS[0]
  );
}

/**
 * Formats a local phone number input dynamically according to the selected country code's grouping pattern.
 * Does NOT force starting with 7 or restricting to 10 digits.
 */
export function formatLocalPhoneInput(
  rawInput: string,
  countryCode?: string | CountryPhoneConfig | null
): string {
  const country = getCountryByCode(countryCode);
  let digits = String(rawInput || '').replace(/\D/g, '');
  const codeDigits = country.code.replace(/\D/g, '');

  // If the user pasted the full international number including country code, strip the country code prefix
  if (digits.startsWith(codeDigits) && digits.length > country.maxDigits) {
    digits = digits.slice(codeDigits.length);
  }

  // Cap to country maxDigits + 1 (to allow optional leading 0 trunk prefix)
  const maxAllowed = Math.max(country.maxDigits, 12);
  digits = digits.slice(0, maxAllowed);

  if (!digits) return '';

  const parts: string[] = [];
  let idx = 0;
  for (const groupLen of country.groups) {
    if (idx >= digits.length) break;
    parts.push(digits.slice(idx, idx + groupLen));
    idx += groupLen;
  }
  if (idx < digits.length) {
    parts.push(digits.slice(idx));
  }
  return parts.join(' ');
}

/**
 * Validates a phone number for the selected country code.
 * Supports any valid digit sequence for that country (does not require starting with 7 or fixed 10 digits).
 */
export function validatePhoneForCountry(
  rawInput: string,
  countryCode?: string | CountryPhoneConfig | null
): {
  valid: boolean;
  formattedDisplay: string;
  e164: string;
  nationalDigits: string;
  error?: string;
} {
  const country = getCountryByCode(countryCode);
  const safeInput = String(rawInput || '');
  const codeDigits = country.code.replace(/\D/g, '');
  let digits = safeInput.replace(/\D/g, '');

  if (digits.startsWith(codeDigits) && digits.length >= country.minDigits + codeDigits.length) {
    digits = digits.slice(codeDigits.length);
  }

  // Strip optional leading trunk '0' when building E.164 if length > minDigits or if country uses trunk 0
  let nationalDigits = digits;
  if (nationalDigits.startsWith('0') && nationalDigits.length > country.minDigits) {
    nationalDigits = nationalDigits.slice(1);
  } else if (nationalDigits.startsWith('0') && country.minDigits === 9 && nationalDigits.length === 10) {
    nationalDigits = nationalDigits.slice(1);
  }

  const effectiveLength = nationalDigits.length;
  const minAccepted = Math.max(6, country.minDigits - 1);
  const maxAccepted = Math.max(country.maxDigits + 1, 15);

  if (!digits || effectiveLength < minAccepted || effectiveLength > maxAccepted) {
    return {
      valid: false,
      formattedDisplay: `${country.code} ${safeInput.trim()}`,
      e164: `${country.code}${nationalDigits}`,
      nationalDigits,
      error: `Please enter a valid ${country.name} phone number (${country.exampleFormat}).`,
    };
  }

  const formattedLocal = formatLocalPhoneInput(nationalDigits, country.code);
  return {
    valid: true,
    formattedDisplay: `${country.code} ${formattedLocal}`,
    e164: `${country.code}${nationalDigits}`,
    nationalDigits,
  };
}
