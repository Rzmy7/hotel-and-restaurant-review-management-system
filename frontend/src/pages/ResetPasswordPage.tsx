import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { AuthLayout } from "../components/shared/AuthLayout";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

const ResetPasswordPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const auth = useAuth();
    const navigate = useNavigate();

    // Silently log out the user if they navigate to this page while still authenticated
    useEffect(() => {
        if (auth.user) {
            auth.persist(null);
        }
    }, [auth.user, auth]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return setError("Missing token");
        if (password !== confirm) return setError("Passwords do not match");
        
        setLoading(true);
        setError(null);
        setMessage(null);
        
        try {
            await auth.resetPassword(token, password);
            setMessage("Password reset successful — redirecting to login...");
            setTimeout(() => navigate("/login"), 1500);
        } catch (err: any) {
            setError(err.message || "Unable to reset password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout 
            title="Set New Password" 
            description="Create a secure password for your account"
        >
            {message && (
                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-xl flex items-start gap-3 mb-6 animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-sm font-bold text-emerald-700 leading-snug">{message}</span>
                </div>
            )}

            {error && (
                <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-xl flex items-center gap-3 mb-6 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5 text-rose-500" />
                    <span className="text-sm font-bold text-rose-700">{error}</span>
                </div>
            )}

            <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-[13px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider ml-1">
                        New Password
                    </label>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-colors group-focus-within:text-blue-500" />
                        <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="px-11"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[13px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider ml-1">
                        Confirm Password
                    </label>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-colors group-focus-within:text-blue-500" />
                        <Input
                            type={showConfirm ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            className="px-11"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full h-12 text-sm uppercase tracking-widest mt-4"
                    isLoading={loading}
                >
                    {loading ? 'Updating...' : 'Update Password'}
                </Button>

                <p className="text-center mt-6">
                    <Link 
                        to="/login" 
                        className="text-gray-500 font-bold hover:text-blue-600 transition-colors uppercase text-[12px] tracking-widest inline-flex items-center gap-2"
                    >
                        Return to login
                    </Link>
                </p>
            </form>
        </AuthLayout>
    );
};

export default ResetPasswordPage;
