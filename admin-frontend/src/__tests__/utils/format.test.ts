/**
 * Unit tests for utils/format — formatTrend.
 */

import { describe, it, expect } from 'vitest';
import { formatTrend } from '../../utils/format';

describe('formatTrend', () => {
    describe('numeric inputs', () => {
        it('formats positive growth with a leading plus sign and positive status', () => {
            const result = formatTrend(12.5);
            expect(result).toEqual({ text: '+12.5%', isPositive: true });
        });

        it('formats negative growth with a minus sign (no plus) and negative status', () => {
            const result = formatTrend(-100);
            expect(result).toEqual({ text: '-100%', isPositive: false });
        });

        it('formats negative decimal growth properly', () => {
            const result = formatTrend(-15.3);
            expect(result).toEqual({ text: '-15.3%', isPositive: false });
        });

        it('formats zero growth as 0% and positive status', () => {
            const result = formatTrend(0);
            expect(result).toEqual({ text: '0%', isPositive: true });
        });

        it('handles NaN gracefully', () => {
            const result = formatTrend(NaN);
            expect(result).toEqual({ text: '0%', isPositive: true });
        });
    });

    describe('string inputs', () => {
        it('cleans up malformed "+-100%" string to "-100%" with negative status', () => {
            const result = formatTrend('+-100%');
            expect(result).toEqual({ text: '-100%', isPositive: false });
        });

        it('cleans up malformed "-+50%" string to "-50%" with negative status', () => {
            const result = formatTrend('-+50%');
            expect(result).toEqual({ text: '-50%', isPositive: false });
        });

        it('formats string with existing minus sign correctly', () => {
            const result = formatTrend('-25%');
            expect(result).toEqual({ text: '-25%', isPositive: false });
        });

        it('formats string with existing plus sign correctly', () => {
            const result = formatTrend('+18.2%');
            expect(result).toEqual({ text: '+18.2%', isPositive: true });
        });

        it('formats plain number string correctly', () => {
            expect(formatTrend('25')).toEqual({ text: '+25%', isPositive: true });
            expect(formatTrend('-25')).toEqual({ text: '-25%', isPositive: false });
            expect(formatTrend('0')).toEqual({ text: '0%', isPositive: true });
        });

        it('handles empty string gracefully', () => {
            const result = formatTrend('');
            expect(result).toEqual({ text: '0%', isPositive: true });
        });
    });

    describe('null/undefined inputs', () => {
        it('handles null', () => {
            const result = formatTrend(null);
            expect(result).toEqual({ text: '0%', isPositive: true });
        });

        it('handles undefined', () => {
            const result = formatTrend(undefined);
            expect(result).toEqual({ text: '0%', isPositive: true });
        });
    });
});
