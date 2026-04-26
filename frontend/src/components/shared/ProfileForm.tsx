import React, { useState, useEffect } from "react";

interface Profile {
  name: string;
  email: string;
  phone: string;
  organization: string;
}

interface ProfileFormProps {
  profile: Profile;
  onSave: (profile: Profile) => void;
  saving: boolean;
}

const ProfileForm: React.FC<ProfileFormProps> = ({
  profile,
  onSave,
  saving,
}) => {
  const [form, setForm] = useState(profile);

  // Sync form with updated profile if profile prop changes
  useEffect(() => {
    setForm(profile);
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  const inputClasses =
    "border border-gray-300 rounded p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block font-medium mb-1">Name</label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          className={inputClasses}
          required
        />
      </div>

      <div>
        <label className="block font-medium mb-1">Email</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          className={inputClasses}
          required
        />
      </div>

      <div>
        <label className="block font-medium mb-1">Phone</label>
        <input
          type="text"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          className={inputClasses}
        />
      </div>

      <div>
        <label className="block font-medium mb-1">Organization</label>
        <input
          type="text"
          name="organization"
          value={form.organization}
          onChange={handleChange}
          className={`${inputClasses} bg-gray-100 text-gray-500 cursor-not-allowed`}
          disabled
        />
      </div>

      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        disabled={saving}
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
};

export default ProfileForm;
