import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { House, Users } from 'lucide-react';
import axios from "axios";

const SetupPage = () => {
  const navigate = useNavigate();

  // ----------------------------------------
  // STATE
  // ----------------------------------------
  const [selectedType, setSelectedType] = useState<'hotel' | 'restaurant' | 'other'>('hotel');
  const [organizationName, setOrganizationName] = useState('');
  const [groupAssignment, setGroupAssignment] = useState('');

  // ----------------------------------------
  // CREATE ORGANIZATION (STEP 1 → STEP 2)
  // ----------------------------------------
  const handleSubmit = async () => {
    console.log("Continue clicked");

    const token = localStorage.getItem("token");

    console.log("Organization Name BEFORE SEND:", organizationName);

    if (!token) {
      alert("User not authenticated");
      return;
    }

    // ✅ validation
    if (!organizationName || organizationName.trim() === "") {
      alert("Organization name is required");
      return;
    }

    try {
      await axios.post(
        "http://localhost:8000/api/organizations",
        {
          organization_name: organizationName,
          organization_type: selectedType,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      navigate("/setup/sources"); // next step

    } catch (error) {
      console.error(error);
      alert("Server error");
    }
  };

  // ----------------------------------------
  // SKIP SETUP
  // ----------------------------------------
  const handleSkip = () => {
    console.log("⏭️ Skip clicked");

    // ❌ don't call API (not needed now)
    // 👉 direct navigation
    navigate("/no-organization");
  };

  // ----------------------------------------
  // UI DATA
  // ----------------------------------------
  const steps = [
    { number: 1, label: 'Add Organization' },
    { number: 2, label: 'Add Sources' },
    { number: 3, label: 'Choose Schedule' },
    { number: 4, label: 'Finish Setup' },
  ];

  const organizationTypes = [
    { id: 'hotel' as const, label: 'Hotel' },
    { id: 'restaurant' as const, label: 'Restaurant' },
    { id: 'other' as const, label: 'Other' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      {/* ----------------------------------------
          HEADER (STEP INDICATOR)
      ---------------------------------------- */}
      <div className="bg-gray-100 pt-8 px-6">
        <div className="max-w-[920px] mx-auto">

          <div className="grid grid-cols-4 gap-6">
            {steps.map((step) => (
              <div key={step.number}>
                <div className={`text-sm mb-1 ${step.number === 1 ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>
                  Step {step.number}
                </div>

                <div className={`text-lg ${step.number === 1 ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>
                  {step.label}
                </div>
              </div>
            ))}
          </div>

          {/* progress bar */}
          <div className="h-2 bg-gray-200 rounded-full mt-4 overflow-hidden">
            <div className="h-full w-1/4 bg-blue-600 rounded-full" />
          </div>
        </div>
      </div>

      {/* ----------------------------------------
          CONTENT
      ---------------------------------------- */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[920px] mx-auto px-6 mt-10">

          <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 text-center mb-10">
            Let&apos;s Set Up your Hotel or Restaurant
          </h1>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-10 py-10 max-md:px-6">

            {/* TYPE */}
            <div className="mb-8">
              <label className="block text-lg font-semibold text-gray-800 mb-3">
                Organization Type
              </label>

              <div className="grid grid-cols-3 bg-gray-100 p-1 rounded-full">
                {organizationTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedType(type.id)}
                    className={`h-12 rounded-full text-sm font-medium transition ${selectedType === type.id
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-gray-500'
                      }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* NAME */}
            <div className="mb-8">
              <label className="block text-lg font-semibold text-gray-800 mb-3">
                Organization Name
              </label>

              <div className="relative">
                <House className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />

                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="e.g. Ocean Bay Hotel"
                  className="w-full h-12 rounded-lg border border-gray-300 pl-12 pr-4 text-sm"
                />
              </div>
            </div>

            {/* GROUP */}
            <div>
              <label className="block text-lg font-semibold text-gray-800 mb-3">
                Group Assignment
              </label>

              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />

                <input
                  type="text"
                  value={groupAssignment}
                  onChange={(e) => setGroupAssignment(e.target.value)}
                  placeholder="Enter group invite link"
                  className="w-full h-12 rounded-lg border border-gray-300 pl-12 pr-4 text-sm"
                />
              </div>
            </div>

          </div>

          {/* ----------------------------------------
              ACTION BUTTONS
          ---------------------------------------- */}
          <div className="mt-10 flex items-center justify-center relative">

            {/* SKIP */}
            <button
              type="button"
              onClick={handleSkip}
              className="absolute left-0 text-blue-600 font-medium"
            >
              Skip
            </button>

            {/* CONTINUE */}
            <button
              type="button"
              onClick={handleSubmit}
              className="h-14 min-w-[300px] rounded-full bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Continue
            </button>

          </div>

        </div>
      </div>
    </div>
  );
};

export default SetupPage;