import React from 'react';

interface ContentEditorProps {
    subject: string;
    body: string;
    onSubjectChange: (subject: string) => void;
    onBodyChange: (body: string) => void;
}

const MAX_SUBJECT = 120;
const MAX_BODY = 5000;

export const ContentEditor: React.FC<ContentEditorProps> = ({ subject, body, onSubjectChange, onBodyChange }) => {
    return (
        <div className="space-y-4">
            {/* Subject */}
            <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Subject Line *</label>
                <input
                    type="text"
                    value={subject}
                    onChange={(e) => onSubjectChange(e.target.value.slice(0, MAX_SUBJECT))}
                    placeholder="e.g., Important update: Platform maintenance"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">{subject.length} / {MAX_SUBJECT}</p>
            </div>

            {/* Body */}
            <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Message Body *</label>
                <textarea
                    value={body}
                    onChange={(e) => onBodyChange(e.target.value.slice(0, MAX_BODY))}
                    placeholder="Write your message here..."
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">{body.length} / {MAX_BODY}</p>
            </div>
        </div>
    );
};
