/**
 * Unit tests for loginValidator.
 */

import { describe, it, expect } from 'vitest';
import {
    validateLoginEmail,
    validateLoginPassword,
    validateVerificationCode,
    validateLoginForm,
    normalizeLoginPayload,
    mapBackendLoginErrorToField,
} from '../../validators/loginValidator';


// ── validateLoginEmail ───────────────────────────────────────────

describe('validateLoginEmail', () => {
    it('accepts valid email', () => {
        expect(validateLoginEmail('user@gmail.com')).toBeNull();
    });

    it('rejects empty email', () => {
        expect(validateLoginEmail('')).not.toBeNull();
    });

    it('rejects invalid email', () => {
        expect(validateLoginEmail('not-an-email')).not.toBeNull();
    });
    it('rejects invalid format email', () => {
        expect(validateLoginEmail('abc.@gmail.com')).not.toBeNull();
    });
});


// ── validateLoginPassword ────────────────────────────────────────

describe('validateLoginPassword', () => {
    it('accepts any non-empty password', () => {
        expect(validateLoginPassword('abc@123')).toBeNull();
    });

    it('rejects empty password', () => {
        expect(validateLoginPassword('')).toBe('Password is required.');
    });
});


// ── validateVerificationCode ─────────────────────────────────────

describe('validateVerificationCode', () => {
    it('accepts valid 6-digit code', () => {
        expect(validateVerificationCode('123456')).toBeNull();
    });

    it('strips whitespace', () => {
        expect(validateVerificationCode('  123456  ')).toBeNull();
    });

    it('rejects empty', () => {
        expect(validateVerificationCode('')).toBe('Verification code is required.');
    });

    it('rejects 5 digits', () => {
        expect(validateVerificationCode('12345')).toContain('6-digit');
    });

    it('rejects 7 digits', () => {
        expect(validateVerificationCode('1234567')).toContain('6-digit');
    });

    it('rejects letters', () => {
        expect(validateVerificationCode('abcdef')).toContain('6-digit');
    });

    it('rejects special characters', () => {
        expect(validateVerificationCode('12-456')).toContain('6-digit');
    });
});


// ── validateLoginForm ────────────────────────────────────────────

describe('validateLoginForm', () => {
    it('returns no errors for valid form', () => {
        const errors = validateLoginForm({ email: 'user@gmail.com', password: 'pass' });
        expect(Object.keys(errors)).toHaveLength(0);
    });

    it('catches empty email', () => {
        const errors = validateLoginForm({ email: '', password: 'pass' });
        expect(errors.email).toBeDefined();
    });

    it('catches empty password', () => {
        const errors = validateLoginForm({ email: 'user@gmail.com', password: '' });
        expect(errors.password).toBeDefined();
    });

    it('catches both empty', () => {
        const errors = validateLoginForm({ email: '', password: '' });
        expect(errors.email).toBeDefined();
        expect(errors.password).toBeDefined();
    });
});


// ── normalizeLoginPayload ────────────────────────────────────────

describe('normalizeLoginPayload', () => {
    it('lowercases and trims email', () => {
        const result = normalizeLoginPayload({ email: '  User@GMAIL.COM  ', password: 'pass' });
        expect(result.email).toBe('user@gmail.com');
    });

    it('preserves password as-is', () => {
        const result = normalizeLoginPayload({ email: 'user@gmail.com', password: 'MyPass123' });
        expect(result.password).toBe('MyPass123');
    });
});


// ── mapBackendLoginErrorToField ──────────────────────────────────

describe('mapBackendLoginErrorToField', () => {
    it('maps credential error to password field', () => {
        const errors = mapBackendLoginErrorToField('Invalid email or password');
        expect(errors.password).toContain('incorrect');
    });

    it('maps email error', () => {
        const errors = mapBackendLoginErrorToField('Email not found');
        expect(errors.email).toBeDefined();
    });

    it('maps password error', () => {
        const errors = mapBackendLoginErrorToField('Password expired');
        expect(errors.password).toBeDefined();
    });

    it('maps verification code error', () => {
        const errors = mapBackendLoginErrorToField('Invalid verification code');
        expect(errors.verificationCode).toBeDefined();
    });

    it('returns empty for unknown error', () => {
        const errors = mapBackendLoginErrorToField('Unknown server error');
        expect(Object.keys(errors)).toHaveLength(0);
    });
});
