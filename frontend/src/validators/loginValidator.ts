import {
    validateEmailAddress,
    validatePassword,
} from './signupValidator';

export type LoginFormData = {
    email: string;
    password: string;
};

export type LoginField = 'email' | 'password' | 'verificationCode';
export type LoginFieldErrors = Partial<Record<LoginField, string>>;

export const validateLoginEmail = (value: string): string | null => {
    return validateEmailAddress(value);
};

export const validateLoginPassword = (value: string): string | null => {
    return validatePassword(value);
};

export const validateVerificationCode = (value: string): string | null => {
    const trimmed = value.trim();

    if (!trimmed) return 'Verification code is required.';
    if (!/^\d{6}$/.test(trimmed)) return 'Verification code must be a 6-digit number.';

    return null;
};

export const validateLoginForm = (data: LoginFormData): LoginFieldErrors => {
    const errors: LoginFieldErrors = {};

    const emailError = validateLoginEmail(data.email);
    if (emailError) errors.email = emailError;

    const passwordError = validateLoginPassword(data.password);
    if (passwordError) errors.password = passwordError;

    return errors;
};

export const normalizeLoginPayload = (data: LoginFormData) => ({
    email: data.email.trim().toLowerCase(),
    password: data.password,
});

export const mapBackendLoginErrorToField = (message: string): LoginFieldErrors => {
    const lowered = message.toLowerCase();

    // Credential matching is validated on the backend against the stored password hash.
    // When that check fails, map the generic error to the password field for user correction.
    if (lowered.includes('invalid email or password')) {
        return { password: 'Email or password is incorrect.' };
    }

    if (lowered.includes('email')) {
        return { email: message };
    }

    if (lowered.includes('password')) {
        return { password: message };
    }

    if (lowered.includes('verification') || lowered.includes('code')) {
        return { verificationCode: message };
    }

    return {};
};
