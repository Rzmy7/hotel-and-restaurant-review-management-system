export type SignupFormData = {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    acceptedTerms: boolean;
};

export type SignupField = 'fullName' | 'email' | 'password' | 'confirmPassword' | 'acceptedTerms';
export type SignupFieldErrors = Partial<Record<SignupField, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_PATTERN = /^[A-Za-z][A-Za-z\s'-]*$/;
const SYMBOL_PATTERN = /[!@#$%^&*(),.?":{}|<>\-_]/;

export const validateFullName = (value: string): string | null => {
    const trimmed = value.trim();

    if (!trimmed) return 'Full name is required.';
    if (trimmed.length < 2) return 'Full name must be at least 2 characters.';
    if (trimmed.length > 100) return 'Full name must be at most 100 characters.';
    if (!NAME_PATTERN.test(trimmed)) {
        return "Full name can contain letters, spaces, apostrophes, and hyphens only.";
    }

    return null;
};

export const validateEmailAddress = (value: string): string | null => {
    const trimmed = value.trim();

    if (!trimmed) return 'Email is required.';
    if (!EMAIL_PATTERN.test(trimmed)) return 'Enter a valid email address.';

    return null;
};

export const validatePassword = (value: string): string | null => {
    if (!value) return 'Password is required.';
    if (value.length < 8) return 'Password must be at least 8 characters long.';
    if (!/[A-Z]/.test(value)) return 'Password must include at least one uppercase letter.';
    if (!/\d/.test(value)) return 'Password must include at least one number.';
    if (!SYMBOL_PATTERN.test(value)) return 'Password must include at least one symbol.';

    return null;
};

export const validateConfirmPassword = (password: string, confirmPassword: string): string | null => {
    if (!confirmPassword) return 'Please confirm your password.';
    if (password !== confirmPassword) return 'Passwords do not match.';

    return null;
};

export const validateSignupForm = (data: SignupFormData): SignupFieldErrors => {
    const errors: SignupFieldErrors = {};

    const nameError = validateFullName(data.fullName);
    if (nameError) errors.fullName = nameError;

    const emailError = validateEmailAddress(data.email);
    if (emailError) errors.email = emailError;

    const passwordError = validatePassword(data.password);
    if (passwordError) errors.password = passwordError;

    const confirmPasswordError = validateConfirmPassword(data.password, data.confirmPassword);
    if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;

    if (!data.acceptedTerms) {
        errors.acceptedTerms = 'Please accept the Terms of Service and Privacy Policy.';
    }

    return errors;
};

export const normalizeSignupPayload = (data: SignupFormData) => ({
    fullName: data.fullName.trim(),
    email: data.email.trim().toLowerCase(),
    password: data.password,
});

export const mapBackendSignupErrorToField = (message: string): SignupFieldErrors => {
    const lowered = message.toLowerCase();

    if (lowered.includes('email') && lowered.includes('exists')) {
        return { email: 'This email is already registered.' };
    }

    if (lowered.includes('password')) {
        return { password: message };
    }

    if (lowered.includes('name')) {
        return { fullName: message };
    }

    return {};
};
