import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, KeyRound, Lock, Shield, XCircle } from "lucide-react";
import { settingsService } from "../../../services/settingsService";
import { ToggleRow } from "../molecules/ToggleRow";
import { FormField } from "../molecules/FormField";
import type { SecuritySettings } from "../../../types/settings";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Modal } from "../../ui/Modal";

interface SecuritySettingsCardProps {
  data: SecuritySettings;
  onChange: (updates: Partial<SecuritySettings>) => void;
  onPasswordChange: (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword?: string;
  }) => Promise<string>;
}

export const SecuritySettingsCard: React.FC<SecuritySettingsCardProps> = ({
  data,
  onChange,
  onPasswordChange,
}) => {
  const MAX_OTP_ATTEMPTS = 5;
  const OTP_TTL_SECONDS = 180;
  const RESEND_COOLDOWN_SECONDS = 30;

  const [is2faModalOpen, setIs2faModalOpen] = useState(false);
  const [twoFaStep, setTwoFaStep] = useState<"intro" | "confirm" | "otp">(
    "intro",
  );
  const [otpValue, setOtpValue] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [otpExpiresIn, setOtpExpiresIn] = useState(OTP_TTL_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [twoFaSuccess, setTwoFaSuccess] = useState<string | null>(null);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [logoutAllSessions, setLogoutAllSessions] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const passwordChecks = useMemo(() => {
    return {
      minLength: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      number: /\d/.test(newPassword),
      symbol: /[^A-Za-z0-9]/.test(newPassword),
    };
  }, [newPassword]);

  const isPasswordValid =
    passwordChecks.minLength &&
    passwordChecks.uppercase &&
    passwordChecks.number &&
    passwordChecks.symbol;

  const passwordsMatch =
    newPassword.length > 0 && newPassword === confirmPassword;

  const passwordStrength = useMemo(() => {
    const score = Object.values(passwordChecks).filter(Boolean).length;
    if (score <= 1) return { label: "Weak", className: "text-rose-400" };
    if (score <= 3) return { label: "Medium", className: "text-amber-400" };
    return { label: "Strong", className: "text-emerald-400" };
  }, [passwordChecks]);

  useEffect(() => {
    if (!is2faModalOpen || twoFaStep !== "otp") return;

    const timer = window.setInterval(() => {
      setOtpExpiresIn((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [is2faModalOpen, twoFaStep]);

  const formatTimer = (seconds: number) => {
    const mm = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const ss = (seconds % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const [isIssuingOtp, setIsIssuingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isDisabling2fa, setIsDisabling2fa] = useState(false);

  const issueNewOtp = async () => {
    try {
      setIsIssuingOtp(true);
      await settingsService.request2FA();
      setOtpValue("");
      setOtpAttempts(0);
      setOtpExpiresIn(OTP_TTL_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setOtpError(null);
    } catch (error) {
      setOtpError(
        error instanceof Error ? error.message : "Failed to send OTP code.",
      );
    } finally {
      setIsIssuingOtp(false);
    }
  };

  const open2faFlow = () => {
    setTwoFaSuccess(null);
    setTwoFaStep("intro");
    setIs2faModalOpen(true);
  };

  const handleTwoFaToggle = async (checked: boolean) => {
    if (checked) {
      open2faFlow();
      return;
    }

    try {
      setIsDisabling2fa(true);
      setOtpError(null);
      await settingsService.disable2FA();
      onChange({ twoFactorAuth: false });
      setTwoFaSuccess("2FA disabled successfully.");
    } catch (error) {
      setOtpError(
        error instanceof Error ? error.message : "Failed to disable 2FA.",
      );
    } finally {
      setIsDisabling2fa(false);
    }
  };

  const handleConfirmEnable2fa = async () => {
    setTwoFaStep("otp");
    await issueNewOtp();
  };

  const handleVerifyOtp = async () => {
    if (otpExpiresIn <= 0) {
      setOtpError("Code expired. Please resend a new code.");
      return;
    }

    if (otpAttempts >= MAX_OTP_ATTEMPTS) {
      setOtpError("Maximum attempts reached. Please resend a new code.");
      return;
    }

    if (otpValue.length !== 6) {
      setOtpError("Enter a valid 6-digit code.");
      return;
    }

    try {
      setIsVerifyingOtp(true);
      await settingsService.enable2FA(otpValue);
      onChange({ twoFactorAuth: true });
      setIs2faModalOpen(false);
      setTwoFaSuccess("2FA enabled successfully.");
      setOtpValue("");
    } catch (error) {
      setOtpAttempts((prev) => prev + 1);
      setOtpError(
        error instanceof Error
          ? error.message
          : `Invalid code. ${Math.max(MAX_OTP_ATTEMPTS - (otpAttempts + 1), 0)} attempts left.`,
      );
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = () => {
    if (resendCooldown > 0) return;
    issueNewOtp();
  };

  const openPasswordModal = () => {
    setPasswordError(null);
    setPasswordSuccess(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setLogoutAllSessions(false);
    setIsPasswordModalOpen(true);
  };

  const handleSavePassword = async () => {
    if (!currentPassword) {
      setPasswordError("Current password is required.");
      return;
    }

    if (!isPasswordValid) {
      setPasswordError("Please satisfy all password requirements.");
      return;
    }

    if (!passwordsMatch) {
      setPasswordError("Confirm password does not match.");
      return;
    }

    try {
      setIsSavingPassword(true);
      setPasswordError(null);

      const responseMessage = await onPasswordChange({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setIsPasswordModalOpen(false);
      setPasswordSuccess(
        logoutAllSessions
          ? `${responseMessage} All other sessions will be logged out.`
          : responseMessage,
      );
    } catch (error) {
      setPasswordError(
        error instanceof Error ? error.message : "Failed to update password",
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  const canSavePassword =
    !!currentPassword && isPasswordValid && passwordsMatch;

  const RequirementRow = ({
    isValid,
    label,
  }: {
    isValid: boolean;
    label: string;
  }) => (
    <div className="flex items-center gap-2">
      {isValid ? (
        <CheckCircle2 size={16} className="text-emerald-400" />
      ) : (
        <XCircle size={16} className="text-slate-500" />
      )}
      <span
        className={
          isValid ? "text-emerald-300 text-xs" : "text-slate-400 text-xs"
        }

        if (!passwordsMatch) {
            setPasswordError('Confirm password does not match.');
            return;
        }

        try {
            setIsSavingPassword(true);
            setPasswordError(null);

            const responseMessage = await onPasswordChange({
                currentPassword,
                newPassword,
                confirmPassword,
            });

            setIsPasswordModalOpen(false);
            setPasswordSuccess(
                logoutAllSessions
                    ? `${responseMessage} All other sessions will be logged out.`
                    : responseMessage
            );
        } catch (error) {
            setPasswordError(error instanceof Error ? error.message : 'Failed to update password');
        } finally {
            setIsSavingPassword(false);
        }
    };

    const canSavePassword = !!currentPassword && isPasswordValid && passwordsMatch;

    const RequirementRow = ({
        isValid,
        label,
    }: {
        isValid: boolean;
        label: string;
    }) => (
        <div className="flex items-center gap-2">
            {isValid ? (
                <CheckCircle2 size={16} className="text-emerald-400" />
            ) : (
                <XCircle size={16} className="text-slate-500" />
            )}
            <span className={isValid ? 'text-emerald-300 text-xs' : 'text-slate-400 text-xs'}>{label}</span>
        </div>
    );

    return (
        <>
            <div className="flex flex-col">
                {(twoFaSuccess || passwordSuccess) && (
                    <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-300 animate-in fade-in duration-300">
                        {twoFaSuccess || passwordSuccess}
                    </div>
                )}

                {data.twoFactorFeatureEnabled !== false && (
                    <>
                        <ToggleRow
                            label="Two-Factor Authentication"
                            description="Require a verification code during login"
                            checked={data.twoFactorAuth}
                            onChange={(e) => {
                                void handleTwoFaToggle(e.target.checked);
                            }}
                        />
                        {otpError && !is2faModalOpen && (
                            <p className="mt-2 text-xs text-rose-400">{otpError}</p>
                        )}
                        {isDisabling2fa && (
                            <p className="mt-2 text-xs text-slate-400">Disabling 2FA...</p>
                        )}
                    </>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setTwoFaStep("confirm")}
                  className="dark:border-slate-600 dark:text-slate-300"
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  onClick={handleVerifyOtp}
                  disabled={isVerifyingOtp}
                  isLoading={isVerifyingOtp}
                >
                  Verify & Enable
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Update Password"
        description="Keep your account secure by using a strong password"
        size="md"
        className="dark:bg-slate-900 bg-slate-900 text-white border border-slate-700"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsPasswordModalOpen(false)}
              className="dark:border-slate-600 dark:text-slate-300"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSavePassword}
              disabled={!canSavePassword || isSavingPassword}
              isLoading={isSavingPassword}
            >
              Save Password
            </Button>
          </div>
        }
      >
        <div className="p-6 space-y-4">
          <FormField label="Current Password">
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setPasswordError(null);
                setCurrentPassword(e.target.value);
              }}
              placeholder="Enter current password"
              className="bg-slate-900 border-slate-700 text-slate-100"
            />
          </FormField>

          <FormField label="New Password">
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => {
                setPasswordError(null);
                setNewPassword(e.target.value);
              }}
              placeholder="Enter new password"
              className="bg-slate-900 border-slate-700 text-slate-100"
            />
            <div className="mt-3 rounded-xl border border-slate-700 bg-slate-800/70 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-300">
                  Password Requirements
                </p>
                <span
                  className={`text-xs font-semibold ${passwordStrength.className}`}
                >
                  {passwordStrength.label}
                </span>
              </div>
              <RequirementRow
                isValid={passwordChecks.minLength}
                label="At least 8 characters"
              />
              <RequirementRow
                isValid={passwordChecks.uppercase}
                label="Includes uppercase letter"
              />
              <RequirementRow
                isValid={passwordChecks.number}
                label="Includes number"
              />
              <RequirementRow
                isValid={passwordChecks.symbol}
                label="Includes symbol"
              />
            </div>
          </FormField>

          <FormField label="Confirm Password">
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setPasswordError(null);
                setConfirmPassword(e.target.value);
              }}
              placeholder="Re-enter new password"
              className="bg-slate-900 border-slate-700 text-slate-100"
            />
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="mt-2 text-xs text-rose-400">
                Passwords do not match.
              </p>
            )}
          </FormField>

          <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <KeyRound size={16} className="text-blue-400" />
              Log out all other active sessions
            </div>
            <input
              type="checkbox"
              checked={logoutAllSessions}
              onChange={(e) => setLogoutAllSessions(e.target.checked)}
              className="h-4 w-4 accent-blue-500"
            />
          </div>

          {passwordError && (
            <p className="text-xs text-rose-400">{passwordError}</p>
          )}
        </div>
      </Modal>
    </>
  );
};
