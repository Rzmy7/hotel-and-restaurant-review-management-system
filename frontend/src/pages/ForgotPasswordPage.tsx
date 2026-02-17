import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const auth = useAuth();

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            await auth.forgotPassword(email);
            setMessage(
                "If that email exists we sent a reset link. Check your inbox (development: link logged on backend)."
            );
        } catch (err: any) {
            setMessage(err.message || "Unable to send reset link");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: 24 }}>
            <div style={{ maxWidth: 520, margin: "40px auto", background: "#fff", padding: 32, borderRadius: 8 }}>
                <h2>Forgot password</h2>
                <p>Enter your account email and we'll send a reset link.</p>
                <form onSubmit={submit}>
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ display: "block", marginBottom: 6 }}>Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #e5e7eb" }}
                        />
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                        <button type="submit" disabled={loading} style={{ padding: "10px 14px", background: "#0284c7", color: "#fff", border: "none", borderRadius: 6 }}>
                            Send reset link
                        </button>
                        <Link to="/login" style={{ alignSelf: "center", color: "#0284c7" }}>Back to login</Link>
                    </div>
                </form>
                {message && <div style={{ marginTop: 12 }}>{message}</div>}
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
