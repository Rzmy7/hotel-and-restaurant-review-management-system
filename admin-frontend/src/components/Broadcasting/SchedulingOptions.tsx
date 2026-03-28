import React from 'react';

interface SchedulingOptionsProps {
    scheduleType: 'now' | 'scheduled';
    scheduledAt: string;
    timezone: string;
    onScheduleTypeChange: (type: 'now' | 'scheduled') => void;
    onScheduledAtChange: (date: string) => void;
}

export const SchedulingOptions: React.FC<SchedulingOptionsProps> = ({
    scheduleType,
    scheduledAt,
    timezone,
    onScheduleTypeChange,
    onScheduledAtChange,
}) => {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">Timing *</label>
            <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer" style={{ borderColor: scheduleType === 'now' ? '#2563eb' : '#e5e7eb' }}>
                    <input
                        type="radio"
                        name="schedule"
                        checked={scheduleType === 'now'}
                        onChange={() => onScheduleTypeChange('now')}
                        className="w-4 h-4"
                    />
                    <p className="text-sm font-medium text-gray-900">Send immediately</p>
                </label>

                <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer" style={{ borderColor: scheduleType === 'scheduled' ? '#2563eb' : '#e5e7eb' }}>
                    <input
                        type="radio"
                        name="schedule"
                        checked={scheduleType === 'scheduled'}
                        onChange={() => onScheduleTypeChange('scheduled')}
                        className="w-4 h-4"
                    />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Schedule for later</p>
                        {scheduleType === 'scheduled' && (
                            <>
                                <input
                                    type="datetime-local"
                                    value={scheduledAt}
                                    onChange={(e) => onScheduledAtChange(e.target.value)}
                                    className="w-full mt-2 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="mt-1 text-xs text-gray-500">Interpreted in system timezone: {timezone}</p>
                            </>
                        )}
                    </div>
                </label>
            </div>
        </div>
    );
};
