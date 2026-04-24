const SRI_LANKA_COUNTRY_CODE = '+94';
const SRI_LANKA_PREFIXES = new Set(['70', '71', '72', '74', '75', '76', '77', '78']);

export const PHONE_DIGITS_ONLY_ERROR = 'Phone number must contain only digits';
export const PHONE_LENGTH_ERROR = 'Phone number must be exactly 9 digits';
export const PHONE_PREFIX_ERROR = 'Invalid Sri Lankan mobile number';

export const extractSriLankanLocalNumber = (value: string): string => {
    const normalized = (value || '').trim();

    if (!normalized) {
        return '';
    }

    const noSpaces = normalized.replace(/\s+/g, '');

    if (noSpaces.startsWith('+94')) {
        return noSpaces.slice(3);
    }

    if (noSpaces.startsWith('94')) {
        return noSpaces.slice(2);
    }

    return noSpaces;
};

export const validateSriLankanLocalPhone = (localPhone: string): string | null => {
    const normalized = (localPhone || '').trim();

    if (!normalized) {
        return null;
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

    return null;
};

export const toSriLankanE164 = (localPhone: string): string => {
    const digits = (localPhone || '').replace(/\D/g, '');
    return digits ? `${SRI_LANKA_COUNTRY_CODE}${digits}` : '';
};

export const formatSriLankanFullNumberPreview = (localPhone: string): string => {
    const digits = (localPhone || '').replace(/\D/g, '').slice(0, 9);

    if (!digits) {
        return '+94';
    }

    const first = digits.slice(0, 2);
    const second = digits.slice(2, 5);
    const third = digits.slice(5, 9);

    return ['+94', first, second, third].filter(Boolean).join(' ');
};
