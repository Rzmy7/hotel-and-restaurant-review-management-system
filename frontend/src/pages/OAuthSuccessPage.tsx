import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getDashboardPathForRole, isExternalDestination, normalizeRole } from '../utils/authRole';

export default function OAuthSuccessPage() {

    const navigate = useNavigate();
    const { persist, checkUserOrganizations } = useAuth();

    useEffect(() => {

        const handleOAuthSuccess = async () => {

        const params = new URLSearchParams(window.location.search);
        const rawToken = params.get("token");
        const token = rawToken?.replace(/^\"|\"$/g, "").trim();

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

            if (user.role === 'ADMIN') {
                const destination = getDashboardPathForRole(user.role);
                if (isExternalDestination(destination)) {
                    window.location.href = destination;
                    return;
                }
                navigate(destination);
            } else {
                await checkUserOrganizations();
            }

        } catch (err) {

            console.error("JWT decode error:", err);
            navigate("/login");

        }

        };

        handleOAuthSuccess();

    }, [checkUserOrganizations, navigate, persist]);

    return (
        <div style={{ textAlign: "center", marginTop: "100px" }}>
            Signing you in with Google...
        </div>
    );
}