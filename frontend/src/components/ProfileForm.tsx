import React, { useState, useEffect } from 'react';

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

const ProfileForm: React.FC<ProfileFormProps> = ({ profile, onSave, saving }) => {
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

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block font-medium">Name</label>
                <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="border rounded p-2 w-full"
                    required
                />
            </div>

            <div>
                <label className="block font-medium">Email</label>
                <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="border rounded p-2 w-full"
                    required
                />
            </div>

            <div>
                <label className="block font-medium">Phone</label>
                <input
                    type="text"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="border rounded p-2 w-full"
                />
            </div>

            <div>
                <label className="block font-medium">Organization</label>
                <input
                    type="text"
                    name="organization"
                    value={form.organization}
                    onChange={handleChange}
                    className="border rounded p-2 w-full bg-gray-100"
                    disabled
                />
            </div>

            <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                disabled={saving}
            >
                {saving ? 'Saving...' : 'Save Changes'}
            </button>
        </form>
    );
};

export default ProfileForm;
