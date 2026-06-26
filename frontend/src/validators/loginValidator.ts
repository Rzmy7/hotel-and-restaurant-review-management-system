import {
    validateEmailAddress,
} from './signupValidator';

export type LoginFormData = {
    email: string;
    password: string;
};

// Defines all possible fields that can have errors.
export type LoginField = 'email' | 'password' | 'verificationCode';

//use Partial<Record<>> to represent validation errors dynamically
export type LoginFieldErrors = Partial<Record<LoginField, string>>;

// reused signup validator for maintain consistancy across signup & login
export const validateLoginEmail = (value: string): string | null => {
    return validateEmailAddress(value);
};

export const validateLoginPassword = (value: string): string | null => {
    if (!value) return 'Password is required.';
    return null;
};

export const validateVerificationCode = (value: string): string | null => {
    const trimmed = value.trim();

    if (!trimmed) return 'Verification code is required.';
    if (!/^\d{6}$/.test(trimmed)) return 'Verification code must be a 6-digit number.';

    return null;
};

// Full Form Validation
export const validateLoginForm = (data: LoginFormData): LoginFieldErrors => {
    const errors: LoginFieldErrors = {};

    const emailError = validateLoginEmail(data.email);
    if (emailError) errors.email = emailError;

    const passwordError = validateLoginPassword(data.password);
    if (passwordError) errors.password = passwordError;

    return errors;
};

// Normalization ensures consistent data format before sending to backend
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
