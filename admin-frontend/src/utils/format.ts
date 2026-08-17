export interface TrendInfo {
    text: string;
    isPositive: boolean;
}

/**
 * Formats a growth/trend value (number or string) into a clean display string and positivity indicator.
 * Handles positive (+X%), negative (-X%), zero (0%), and cleans up any accidental malformed strings (like "+-100%").
 */
export const formatTrend = (value: number | string | null | undefined): TrendInfo => {
    if (value === null || value === undefined) {
        return { text: '0%', isPositive: true };
    }

    if (typeof value === 'number') {
        if (isNaN(value)) {
            return { text: '0%', isPositive: true };
        }
        if (value > 0) {
            return { text: `+${value}%`, isPositive: true };
        }
        if (value < 0) {
            return { text: `${value}%`, isPositive: false };
        }
        return { text: '0%', isPositive: true };
    }

    let str = String(value).trim();
    if (!str) {
        return { text: '0%', isPositive: true };
    }

    // Clean up potential malformed "+-..." or "-+..."
    while (str.startsWith('+-') || str.startsWith('-+')) {
        str = '-' + str.slice(2).trim();
    }

    if (str.startsWith('-')) {
        const withPercent = str.endsWith('%') ? str : `${str}%`;
        return { text: withPercent, isPositive: false };
    }

    if (str.startsWith('+')) {
        const withPercent = str.endsWith('%') ? str : `${str}%`;
        return { text: withPercent, isPositive: true };
    }

    const num = parseFloat(str);
    if (!isNaN(num)) {
        if (num > 0) {
            return { text: `+${str.endsWith('%') ? str : `${str}%`}`, isPositive: true };
        }
        if (num < 0) {
            return { text: str.endsWith('%') ? str : `${str}%`, isPositive: false };
        }
        return { text: str.endsWith('%') ? str : `${str}%`, isPositive: true };
    }

    return { text: str, isPositive: true };
};
