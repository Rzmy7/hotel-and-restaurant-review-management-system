/**
 * Unit tests for competitorDomain utilities.
 */

import { describe, it, expect } from 'vitest';
import {
    DOMAIN_OPTIONS,
    inferCompetitorDomain,
} from '../../utils/competitorDomain';


// ── DOMAIN_OPTIONS ───────────────────────────────────────────────

describe('DOMAIN_OPTIONS', () => {
    it('has exactly 2 options', () => {
        expect(DOMAIN_OPTIONS).toHaveLength(2);
    });

    it('includes Hotel', () => {
        expect(DOMAIN_OPTIONS).toContain('Hotel');
    });

    it('includes Restaurant / Cafe', () => {
        expect(DOMAIN_OPTIONS).toContain('Restaurant / Cafe');
    });
});


// ── inferCompetitorDomain ────────────────────────────────────────

describe('inferCompetitorDomain', () => {
    // Restaurant keywords
    it('detects "restaurant" in name', () => {
        expect(inferCompetitorDomain({ name: 'Italian Restaurant', location: 'NYC' }))
            .toBe('Restaurant / Cafe');
    });

    it('detects "cafe" in name', () => {
        expect(inferCompetitorDomain({ name: 'Sunrise Cafe' }))
            .toBe('Restaurant / Cafe');
    });

    it('detects "bar" in name', () => {
        expect(inferCompetitorDomain({ name: 'The Sports Bar' }))
            .toBe('Restaurant / Cafe');
    });

    it('detects "coffee" in name', () => {
        expect(inferCompetitorDomain({ name: 'Blue Coffee House' }))
            .toBe('Restaurant / Cafe');
    });

    it('detects "pizza" in name', () => {
        expect(inferCompetitorDomain({ name: 'Pizza Palace' }))
            .toBe('Restaurant / Cafe');
    });

    it('detects "zomato" in location', () => {
        expect(inferCompetitorDomain({ name: 'Place', location: 'zomato.com/place' }))
            .toBe('Restaurant / Cafe');
    });

    it('detects "yelp" in location', () => {
        expect(inferCompetitorDomain({ name: 'Diner', location: 'yelp.com/biz' }))
            .toBe('Restaurant / Cafe');
    });

    it('detects "food" in name', () => {
        expect(inferCompetitorDomain({ name: 'Food Court Central' }))
            .toBe('Restaurant / Cafe');
    });

    // Hotel defaults
    it('defaults to Hotel for "Hilton"', () => {
        expect(inferCompetitorDomain({ name: 'Hilton Garden Inn' }))
            .toBe('Hotel');
    });

    it('defaults to Hotel for generic names', () => {
        expect(inferCompetitorDomain({ name: 'Grand Palace Resort' }))
            .toBe('Hotel');
    });

    it('defaults to Hotel for empty name', () => {
        expect(inferCompetitorDomain({ name: '', location: '' }))
            .toBe('Hotel');
    });

    it('defaults to Hotel for null fields', () => {
        expect(inferCompetitorDomain({ name: null, location: null }))
            .toBe('Hotel');
    });

    it('defaults to Hotel when no fields provided', () => {
        expect(inferCompetitorDomain({}))
            .toBe('Hotel');
    });

    // Case insensitivity
    it('is case insensitive', () => {
        expect(inferCompetitorDomain({ name: 'THE RESTAURANT' }))
            .toBe('Restaurant / Cafe');
    });
});
