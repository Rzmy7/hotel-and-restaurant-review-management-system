/**
 * Unit tests for signupValidator.
 *
 * Tests: validateFullName, validateEmailAddress, validatePassword,
 *        validateConfirmPassword, validateSignupForm, normalizeSignupPayload,
 *        mapBackendSignupErrorToField
 */

import { describe, it, expect } from 'vitest';
import {
    validateFullName,
    validateEmailAddress,
    validatePassword,
    validateConfirmPassword,
    validateSignupForm,
    normalizeSignupPayload,
    mapBackendSignupErrorToField,
} from '../../validators/signupValidator';


// ── validateFullName ─────────────────────────────────────────────

describe('validateFullName', () => {
    it('accepts valid name', () => {
        expect(validateFullName('John Doe')).toBeNull();
    });

    it('trims whitespace', () => {
        expect(validateFullName('  Jane  ')).toBeNull();
    });

    it('rejects empty string', () => {
        expect(validateFullName('')).toBe('Full name is required.');
    });

    it('rejects whitespace only', () => {
        expect(validateFullName('   ')).toBe('Full name is required.');
    });

    it('rejects single character', () => {
        expect(validateFullName('A')).toContain('at least 2 characters');
    });

    it('accepts two characters', () => {
        expect(validateFullName('Al')).toBeNull();
    });

    it('rejects over 100 characters', () => {
        const longName = 'A'.repeat(101);
        expect(validateFullName(longName)).toContain('at most 100 characters');
    });

    it('accepts exactly 100 characters', () => {
        const name = 'A'.repeat(100);
        expect(validateFullName(name)).toBeNull();
    });

    it('rejects digits in name', () => {
        expect(validateFullName('John123')).not.toBeNull();
    });

    it('accepts hyphenated names', () => {
        expect(validateFullName("O'Brien-Smith")).toBeNull();
    });

    it('accepts apostrophes', () => {
        expect(validateFullName("O'Connor")).toBeNull();
    });
});


// ── validateEmailAddress ─────────────────────────────────────────

describe('validateEmailAddress', () => {
    it('accepts valid gmail', () => {
        expect(validateEmailAddress('user@gmail.com')).toBeNull();
    });

    it('accepts valid org domain', () => {
        expect(validateEmailAddress('admin@company.org')).toBeNull();
    });

    it('accepts short domain name', () => {
        expect(validateEmailAddress('user@ab.com')).toBeNull();
    });

    it('accepts various domains and TLDs', () => {
        expect(validateEmailAddress('user@startup.ai')).toBeNull();
        expect(validateEmailAddress('user@platform.io')).toBeNull();
        expect(validateEmailAddress('user@company.co.uk')).toBeNull();
        expect(validateEmailAddress('user@domain.xyz')).toBeNull();
    });

    it('accepts plus tags', () => {
        expect(validateEmailAddress('user+tag@gmail.com')).toBeNull();
    });

    it('rejects empty string', () => {
        expect(validateEmailAddress('')).toBe('Email is required.');
    });

    it('rejects missing @', () => {
        expect(validateEmailAddress('userexample.com')).not.toBeNull();
    });

    it('rejects single-character TLD', () => {
        expect(validateEmailAddress('user@domain.c')).not.toBeNull();
    });

    it('rejects numeric TLD', () => {
        expect(validateEmailAddress('user@domain.123')).not.toBeNull();
    });

    it('rejects consecutive dots in local part', () => {
        expect(validateEmailAddress('us..er@gmail.com')).not.toBeNull();
    });

    it('rejects consecutive dots in domain', () => {
        expect(validateEmailAddress('user@domain..com')).not.toBeNull();
    });

    it('rejects leading dot in local part', () => {
        expect(validateEmailAddress('.user@gmail.com')).not.toBeNull();
    });

    it('rejects trailing dot in local part', () => {
        expect(validateEmailAddress('user.@gmail.com')).not.toBeNull();
    });

    it('trims whitespace', () => {
        expect(validateEmailAddress('  user@gmail.com  ')).toBeNull();
    });
});


// ── validatePassword ─────────────────────────────────────────────

describe('validatePassword', () => {
    it('accepts strong password', () => {
        expect(validatePassword('StrongP@ss1')).toBeNull();
    });

    it('rejects empty password', () => {
        expect(validatePassword('')).toBe('Password is required.');
    });

    it('rejects short password', () => {
        expect(validatePassword('Sh1!')).toContain('at least 8 characters');
    });

    it('rejects no uppercase', () => {
        expect(validatePassword('weakpass1!')).toContain('uppercase');
    });

    it('rejects no digit', () => {
        expect(validatePassword('StrongPass!')).toContain('number');
    });

    it('rejects no symbol', () => {
        expect(validatePassword('StrongPass1')).toContain('symbol');
    });

    it('accepts exactly 8 chars with all requirements', () => {
        expect(validatePassword('Abcdef1!')).toBeNull();
    });
});


// ── validateConfirmPassword ──────────────────────────────────────

describe('validateConfirmPassword', () => {
    it('accepts matching passwords', () => {
        expect(validateConfirmPassword('Pass1!', 'Pass1!')).toBeNull();
    });

    it('rejects empty confirm', () => {
        expect(validateConfirmPassword('Pass1!', '')).toBe('Please confirm your password.');
    });

    it('rejects mismatched passwords', () => {
        expect(validateConfirmPassword('Pass1!', 'Pass2!')).toBe('Passwords do not match.');
    });
});


// ── validateSignupForm ───────────────────────────────────────────

describe('validateSignupForm', () => {
    const validData = {
        fullName: 'John Doe',
        email: 'john@gmail.com',
        password: 'StrongP@ss1',
        confirmPassword: 'StrongP@ss1',
        acceptedTerms: true,
    };

    it('returns no errors for valid data', () => {
        const errors = validateSignupForm(validData);
        expect(Object.keys(errors)).toHaveLength(0);
    });

    it('catches missing name', () => {
        const errors = validateSignupForm({ ...validData, fullName: '' });
        expect(errors.fullName).toBeDefined();
    });

    it('catches bad email', () => {
        const errors = validateSignupForm({ ...validData, email: 'bad' });
        expect(errors.email).toBeDefined();
    });

    it('catches weak password', () => {
        const errors = validateSignupForm({ ...validData, password: 'weak' });
        expect(errors.password).toBeDefined();
    });

    it('catches mismatched confirm password', () => {
        const errors = validateSignupForm({ ...validData, confirmPassword: 'different' });
        expect(errors.confirmPassword).toBeDefined();
    });

    it('catches unaccepted terms', () => {
        const errors = validateSignupForm({ ...validData, acceptedTerms: false });
        expect(errors.acceptedTerms).toBeDefined();
    });

    it('catches multiple errors at once', () => {
        const errors = validateSignupForm({
            fullName: '', email: '', password: '', confirmPassword: '', acceptedTerms: false,
        });
        expect(Object.keys(errors).length).toBeGreaterThanOrEqual(4);
    });
});


// ── normalizeSignupPayload ───────────────────────────────────────

describe('normalizeSignupPayload', () => {
    it('trims name', () => {
        const result = normalizeSignupPayload({
            fullName: '  John Doe  ', email: 'User@GMAIL.COM', password: 'Pass1!',
            confirmPassword: 'Pass1!', acceptedTerms: true,
        });
        expect(result.fullName).toBe('John Doe');
    });

    it('lowercases email', () => {
        const result = normalizeSignupPayload({
            fullName: 'John', email: 'User@GMAIL.COM', password: 'Pass1!',
            confirmPassword: 'Pass1!', acceptedTerms: true,
        });
        expect(result.email).toBe('user@gmail.com');
    });

    it('strips whitespace from email', () => {
        const result = normalizeSignupPayload({
            fullName: 'John', email: '  user@gmail.com  ', password: 'Pass1!',
            confirmPassword: 'Pass1!', acceptedTerms: true,
        });
        expect(result.email).toBe('user@gmail.com');
    });

    it('does not include confirmPassword or acceptedTerms', () => {
        const result = normalizeSignupPayload({
            fullName: 'John', email: 'user@gmail.com', password: 'Pass1!',
            confirmPassword: 'Pass1!', acceptedTerms: true,
        });
        expect(result).not.toHaveProperty('confirmPassword');
        expect(result).not.toHaveProperty('acceptedTerms');
    });
});


// ── mapBackendSignupErrorToField ─────────────────────────────────

describe('mapBackendSignupErrorToField', () => {
    it('maps email exists error', () => {
        const errors = mapBackendSignupErrorToField('Email already exists');
        expect(errors.email).toContain('already registered');
    });

    it('maps password error', () => {
        const errors = mapBackendSignupErrorToField('Password too weak');
        expect(errors.password).toBeDefined();
    });

    it('maps name error', () => {
        const errors = mapBackendSignupErrorToField('Invalid name provided');
        expect(errors.fullName).toBeDefined();
    });

    it('returns empty for unknown error', () => {
        const errors = mapBackendSignupErrorToField('Unknown server error');
        expect(Object.keys(errors)).toHaveLength(0);
    });
});
