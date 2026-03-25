import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getDashboardPathForRole, isExternalDestination, normalizeRole } from '../utils/authRole';

export default function OAuthSuccessPage() {

    const navigate = useNavigate();
    const { persist } = useAuth();

    useEffect(() => {

        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");

        if (!token) {
            navigate("/login");
            return;
        }

        try {

            // Fix Base64URL encoding for JWT
            const base64 = token.split(".")[1]
                .replace(/-/g, "+")
                .replace(/_/g, "/");

            const payload = JSON.parse(window.atob(base64));

            const user = {
                user_id: payload.user_id,
                email: payload.email,
                full_name: payload.full_name,
                role: normalizeRole(payload.role || payload.roles)
            };

            // Save user + token using AuthContext
            persist(user, token);

            const destination = getDashboardPathForRole(user.role);
            if (isExternalDestination(destination)) {
                window.location.href = destination;
                return;
            }
            navigate(destination);

        } catch (err) {

            console.error("JWT decode error:", err);
            navigate("/login");

        }

    }, [navigate, persist]);

    return (
        <div style={{ textAlign: "center", marginTop: "100px" }}>
            Signing you in with Google...
        </div>
    );
}