import { describe, it, expect } from 'vitest';
import { inferCompetitorDomain } from './competitorDomain';

describe('competitorDomain Utility', () => {
  describe('inferCompetitorDomain', () => {
    it('should infer "Restaurant / Cafe" for restaurant related names', () => {
      expect(inferCompetitorDomain({ name: 'The Pizza Place' })).toBe('Restaurant / Cafe');
      expect(inferCompetitorDomain({ name: 'Central Cafe' })).toBe('Restaurant / Cafe');
      expect(inferCompetitorDomain({ name: 'Bistro 42' })).toBe('Restaurant / Cafe');
    });

    it('should infer "Restaurant / Cafe" for restaurant related locations', () => {
      expect(inferCompetitorDomain({ location: 'Near the Grill' })).toBe('Restaurant / Cafe');
    });

    it('should infer "Hotel" by default or for non-restaurant names', () => {
      expect(inferCompetitorDomain({ name: 'Grand Hotel' })).toBe('Hotel');
      expect(inferCompetitorDomain({ name: 'City Lodge' })).toBe('Hotel');
      expect(inferCompetitorDomain({ name: 'The Residence' })).toBe('Hotel');
    });

    it('should be case insensitive', () => {
      expect(inferCompetitorDomain({ name: 'RESTAURANT' })).toBe('Restaurant / Cafe');
    });

    it('should handle empty or null inputs', () => {
      expect(inferCompetitorDomain({})).toBe('Hotel');
      expect(inferCompetitorDomain({ name: null, location: null })).toBe('Hotel');
    });

    it('should check both name and location', () => {
      expect(inferCompetitorDomain({ name: 'Grand', location: 'Diner' })).toBe('Restaurant / Cafe');
    });
  });
});
