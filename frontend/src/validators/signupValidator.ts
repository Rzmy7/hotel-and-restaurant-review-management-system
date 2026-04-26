export type SignupFormData = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
};

export type SignupField =
  | "fullName"
  | "email"
  | "password"
  | "confirmPassword"
  | "acceptedTerms";
export type SignupFieldErrors = Partial<Record<SignupField, string>>;

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const NAME_PATTERN = /^[A-Za-z][A-Za-z\s'-]*$/;
const SYMBOL_PATTERN = /[!@#$%^&*(),.?":{}|<>\-_]/;

// Only the most common generic TLDs
const COMMON_TLDS = new Set(["com", "org", "net", "edu"]);

const isRealisticDomain = (domain: string): boolean => {
  const parts = domain.toLowerCase().split(".");

  // Must have at least 2 parts (domain + TLD)
  if (parts.length < 2) return false;

  const tld = parts[parts.length - 1];

  // TLD must be in common list and at least 2 chars
  if (tld.length < 2 || !COMMON_TLDS.has(tld)) return false;

  // Domain name part (before TLD) must be realistic
  const domainName = parts.slice(0, -1).join(".");

  // No consecutive dots
  if (domainName.includes("..")) return false;

  // Each label must be 1-63 chars, start/end with alphanumeric
  const labels = domainName.split(".");
  for (const label of labels) {
    if (!label || label.length > 63) return false;
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(label)) return false;
    // Domain labels should be at least 4 chars to look realistic on simple domains
    // (prevents obviously fake domains like 'kaa.com', 'xyz.net')
    // But allow shorter labels in multi-part domains (e.g., co.uk)
    if (label.length < 4 && parts.length === 2) return false;
  }

  return true;
};

export const validateFullName = (value: string): string | null => {
  const trimmed = value.trim();

  if (!trimmed) return "Full name is required.";
  if (trimmed.length < 2) return "Full name must be at least 2 characters.";
  if (trimmed.length > 100) return "Full name must be at most 100 characters.";
  if (!NAME_PATTERN.test(trimmed)) {
    return "Full name can contain letters, spaces, apostrophes, and hyphens only.";
  }

  return null;
};

export const validateEmailAddress = (value: string): string | null => {
  const trimmed = value.trim();

  if (!trimmed) return "Email is required.";

  // Basic pattern check
  if (!EMAIL_PATTERN.test(trimmed)) return "Enter a valid email address.";

  const [localPart, domain] = trimmed.split("@");

  // Local part checks
  if (!localPart || localPart.length > 64) return "Invalid email format.";
  if (localPart.startsWith(".") || localPart.endsWith("."))
    return "Invalid email format.";
  if (localPart.includes("..")) return "Invalid email format.";

  // Domain checks
  if (!domain) return "Invalid email format.";
  if (!isRealisticDomain(domain))
    return "Please enter a valid email address with a recognized domain.";

  return null;
};

export const validatePassword = (value: string): string | null => {
  if (!value) return "Password is required.";
  if (value.length < 8) return "Password must be at least 8 characters long.";
  if (!/[A-Z]/.test(value))
    return "Password must include at least one uppercase letter.";
  if (!/\d/.test(value)) return "Password must include at least one number.";
  if (!SYMBOL_PATTERN.test(value))
    return "Password must include at least one symbol.";

  return null;
};

export const validateConfirmPassword = (
  password: string,
  confirmPassword: string,
): string | null => {
  if (!confirmPassword) return "Please confirm your password.";
  if (password !== confirmPassword) return "Passwords do not match.";

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

  const confirmPasswordError = validateConfirmPassword(
    data.password,
    data.confirmPassword,
  );
  if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;

  if (!data.acceptedTerms) {
    errors.acceptedTerms =
      "Please accept the Terms of Service and Privacy Policy.";
  }

  return errors;
};

export const normalizeSignupPayload = (data: SignupFormData) => ({
  fullName: data.fullName.trim(),
  email: data.email.trim().toLowerCase(),
  password: data.password,
});

export const mapBackendSignupErrorToField = (
  message: string,
): SignupFieldErrors => {
  const lowered = message.toLowerCase();

  if (lowered.includes("email") && lowered.includes("exists")) {
    return { email: "This email is already registered." };
  }

  if (lowered.includes("password")) {
    return { password: message };
  }

  if (lowered.includes("name")) {
    return { fullName: message };
  }

  return {};
};
