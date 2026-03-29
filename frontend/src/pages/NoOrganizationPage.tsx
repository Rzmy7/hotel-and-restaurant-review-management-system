import { useNavigate } from "react-router-dom";

const NoOrganizationPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">

            <div className="bg-white p-10 rounded-xl shadow-md text-center max-w-md">

                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    No Organization Found
                </h2>

                <p className="text-gray-600 mb-6">
                    You are not part of any organization yet.
                    Create one to start managing reviews.
                </p>

                <button
                    onClick={() => navigate("/setup")}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                >
                    Add Organization
                </button>

            </div>
        </div>
    );
};

export default NoOrganizationPage;