import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, KeyRound, Lock, Shield, XCircle, Sun, Moon, Monitor } from "lucide-react";
import { settingsService } from "../../../services/settingsService";
import { ToggleRow } from "../molecules/ToggleRow";
import { FormField } from "../molecules/FormField";
import type { SecuritySettings } from "../../../types/settings";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Modal } from "../../ui/Modal";
import { Toggle } from "../../ui/Toggle";

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
  const [twoFaStep, setTwoFaStep] = useState<"intro" | "confirm" | "otp">("intro");
  const [otpValue, setOtpValue] = useState("");
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

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

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
      setOtpError(error instanceof Error ? error.message : "Failed to send OTP.");
    } finally {
      setIsIssuingOtp(false);
    }
  };

  const handleTwoFaToggle = async (checked: boolean) => {
    if (checked) {
      setTwoFaSuccess(null);
      setTwoFaStep("intro");
      setIs2faModalOpen(true);
      return;
    }
    try {
      setIsDisabling2fa(true);
      await settingsService.disable2FA();
      onChange({ twoFactorAuth: false });
      setTwoFaSuccess("2FA disabled successfully.");
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : "Failed to disable 2FA.");
    } finally {
      setIsDisabling2fa(false);
    }
  };

  const handleVerifyOtp = async () => {
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
    } catch (error) {
      setOtpAttempts(p => p + 1);
      setOtpError(error instanceof Error ? error.message : "Invalid code.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleSavePassword = async () => {
    if (!currentPassword || !isPasswordValid || !passwordsMatch) return;
    try {
      setIsSavingPassword(true);
      const msg = await onPasswordChange({ currentPassword, newPassword, confirmPassword });
      setIsPasswordModalOpen(false);
      setPasswordSuccess(msg);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Failed to update password.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const RequirementRow = ({ isValid, label }: { isValid: boolean; label: string }) => (
    <div className="flex items-center gap-2">
      {isValid ? <CheckCircle2 size={14} className="text-emerald-400" /> : <XCircle size={14} className="text-slate-500" />}
      <span className={`text-[10px] ${isValid ? "text-emerald-300" : "text-slate-400"}`}>{label}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {(twoFaSuccess || passwordSuccess) && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
          {twoFaSuccess || passwordSuccess}
        </div>
      )}

      <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Shield size={16} className="text-blue-400" />
              Two-Factor Authentication
            </h3>
            <p className="text-xs text-slate-400">Add an extra layer of security to your account</p>
          </div>
          <Toggle checked={data.twoFactorAuth} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTwoFaToggle(e.target.checked)} disabled={isDisabling2fa} />
        </div>

        <div className="border-t border-slate-700/50 pt-6 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Lock size={16} className="text-purple-400" />
              Account Password
            </h3>
            <p className="text-xs text-slate-400">Change your password regularly to stay secure</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsPasswordModalOpen(true)} className="border-slate-700 text-slate-300 hover:bg-slate-700/50">
            Change Password
          </Button>
        </div>
      </div>

      <Modal isOpen={is2faModalOpen} onClose={() => setIs2faModalOpen(false)} title="Two-Factor Authentication" size="md">
        <div className="p-6 space-y-4">
          {twoFaStep === "intro" && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
                <Shield size={32} className="text-blue-400" />
              </div>
              <h4 className="text-lg font-bold text-white">Secure your account</h4>
              <p className="text-sm text-slate-400">We'll send a verification code to your email each time you log in.</p>
              <Button onClick={() => { setTwoFaStep("otp"); issueNewOtp(); }} className="w-full">Get Started</Button>
            </div>
          )}

          {twoFaStep === "otp" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">Enter the 6-digit code sent to your email.</p>
              <Input value={otpValue} onChange={e => setOtpValue(e.target.value)} placeholder="000000" className="text-center text-2xl tracking-widest" maxLength={6} />
              {otpError && <p className="text-xs text-rose-400 text-center">{otpError}</p>}
              <Button onClick={handleVerifyOtp} isLoading={isVerifyingOtp} className="w-full">Verify & Enable</Button>
            </div>
          )}
        </div>
      </Modal>

      <Modal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} title="Update Password" size="md">
        <div className="p-6 space-y-4">
          <FormField label="Current Password">
            <Input type="password" value={currentPassword} onChange={e => { setPasswordError(null); setCurrentPassword(e.target.value); }} />
          </FormField>
          <FormField label="New Password">
            <Input type="password" value={newPassword} onChange={e => { setPasswordError(null); setNewPassword(e.target.value); }} />
            <div className="mt-3 grid grid-cols-2 gap-2 p-3 bg-slate-900/50 rounded-xl">
              <RequirementRow isValid={passwordChecks.minLength} label="8+ chars" />
              <RequirementRow isValid={passwordChecks.uppercase} label="Uppercase" />
              <RequirementRow isValid={passwordChecks.number} label="Number" />
              <RequirementRow isValid={passwordChecks.symbol} label="Symbol" />
            </div>
          </FormField>
          <FormField label="Confirm Password">
            <Input type="password" value={confirmPassword} onChange={e => { setPasswordError(null); setConfirmPassword(e.target.value); }} />
          </FormField>
          {passwordError && <p className="text-xs text-rose-400">{passwordError}</p>}
          <Button onClick={handleSavePassword} isLoading={isSavingPassword} disabled={!currentPassword || !isPasswordValid || !passwordsMatch} className="w-full">Save New Password</Button>
        </div>
      </Modal>
    </div>
  );
};
