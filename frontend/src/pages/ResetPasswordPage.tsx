import React, { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const ResetPasswordPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const auth = useAuth();
    const navigate = useNavigate();

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return setMessage("Missing token");
        if (password !== confirm) return setMessage("Passwords do not match");
        setLoading(true);
        setMessage(null);
        try {
            await auth.resetPassword(token, password);
            setMessage("Password reset successful — redirecting to login...");
            setTimeout(() => navigate("/login"), 1200);
        } catch (err: any) {
            setMessage(err.message || "Unable to reset password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: 24 }}>
            <div style={{ maxWidth: 520, margin: "40px auto", background: "#fff", padding: 32, borderRadius: 8 }}>
                <h2>Reset password</h2>
                <form onSubmit={submit}>
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ display: "block", marginBottom: 6 }}>New password</label>
                        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #e5e7eb" }} />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ display: "block", marginBottom: 6 }}>Confirm password</label>
                        <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #e5e7eb" }} />
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                        <button type="submit" disabled={loading} style={{ padding: "10px 14px", background: "#0284c7", color: "#fff", border: "none", borderRadius: 6 }}>
                            Reset password
                        </button>
                        <Link to="/login" style={{ alignSelf: "center", color: "#0284c7" }}>Back to login</Link>
                    </div>
                </form>
                {message && <div style={{ marginTop: 12 }}>{message}</div>}
            </div>
        </div>
    );
};

export default ResetPasswordPage;
