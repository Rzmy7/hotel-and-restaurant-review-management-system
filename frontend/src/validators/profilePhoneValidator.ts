const SRI_LANKA_COUNTRY_CODE = '+94';
//used here set because faster lookup than array
const SRI_LANKA_PREFIXES = new Set(['70', '71', '72', '74', '75', '76', '77', '78']);

//using export Make this variables available to other files
export const PHONE_DIGITS_ONLY_ERROR = 'Phone number must contain only digits';
export const PHONE_LENGTH_ERROR = 'Phone number must be exactly 9 digits';
export const PHONE_PREFIX_ERROR = 'Invalid Sri Lankan mobile number';

// hrere Convert ANY format into local number (without +94)
export const extractSriLankanLocalNumber = (value: string): string => {
    const normalized = (value || '').trim();   //here remove spaces & handle null

    if (!normalized) {
        return '';
    }

    const noSpaces = normalized.replace(/\s+/g, '');   //remove all spaces by replacing spaces with nothing

    if (noSpaces.startsWith('+94')) {
        return noSpaces.slice(3);      // remove +94
    }

    if (noSpaces.startsWith('94')) {
        return noSpaces.slice(2);      // reomove 94
    }

    return noSpaces;   // returns the local number
};

export const validateSriLankanLocalPhone = (localPhone: string): string | null => {
    const normalized = (localPhone || '').trim();

    if (!normalized) {
        return null;      // no error if empty
    }

    if (!/^\d+$/.test(normalized)) {
        return PHONE_DIGITS_ONLY_ERROR;
    }

    if (normalized.length !== 9) {
        return PHONE_LENGTH_ERROR;
    }

    if (!SRI_LANKA_PREFIXES.has(normalized.slice(0, 2))) {
        return PHONE_PREFIX_ERROR;
    }

    return null;     // valid local number
};


// Convert to standard international format
export const toSriLankanE164 = (localPhone: string): string => {
    const digits = (localPhone || '').replace(/\D/g, '');
    return digits ? `${SRI_LANKA_COUNTRY_CODE}${digits}` : '';
};


// Convert user input into a nice formatted phone number preview
export const formatSriLankanFullNumberPreview = (localPhone: string): string => {
    const digits = (localPhone || '').replace(/\D/g, '').slice(0, 9);  // If localPhone is null/undefined → use empty string

    if (!digits) {
        return '+94';
    }

    const first = digits.slice(0, 2);
    const second = digits.slice(2, 5);
    const third = digits.slice(5, 9);

    return ['+94', first, second, third].filter(Boolean).join(' ');
};
