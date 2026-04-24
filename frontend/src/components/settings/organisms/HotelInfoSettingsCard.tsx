import React from 'react';
import { Upload } from 'lucide-react';
import { FormField } from '../molecules/FormField';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import type { HotelInfoSettings } from '../../../types/settings';

interface HotelInfoSettingsCardProps {
    data: HotelInfoSettings;
    onChange: (updates: Partial<HotelInfoSettings>) => void;
    onLogoUpload: () => void;
    onLogoRemove: () => void;
    isUploadingLogo?: boolean;
}

export const HotelInfoSettingsCard: React.FC<HotelInfoSettingsCardProps> = ({
    data,
    onChange,
    onLogoUpload,
    onLogoRemove,
    isUploadingLogo = false
}) => {
    return (
        <div className="flex flex-col">

            {/* Logo Upload */}
            <div className="flex flex-col gap-2 py-6 border-b border-gray-100 dark:border-slate-700/50 last:border-b-0">
                <div className="flex gap-6 items-start max-md:flex-col">
                    <div
                        onClick={onLogoUpload}
                        className="w-[140px] h-[140px] border-2 border-dashed border-gray-200 dark:border-slate-600 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-gray-50/50 dark:bg-slate-800/50 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 group max-md:w-full max-md:max-w-[200px]"
                    >
                        {data.logoUrl ? (
                            <img
                                src={data.logoUrl}
                                alt="Hotel logo"
                                className="w-full h-full object-cover rounded-2xl"
                            />
                        ) : (
                            <>
                                <Upload className="text-gray-400 group-hover:text-[#4e80ee] transition-colors" size={32} />
                                <span className="text-[11px] font-black tracking-widest text-gray-400 uppercase group-hover:text-[#4e80ee] transition-colors text-center w-24">Upload Logo</span>
                            </>
                        )}
                    </div>
                    <div className="flex flex-col gap-3 pt-2">
                        <Button variant="outline" size="sm" onClick={onLogoUpload} isLoading={isUploadingLogo}>
                            {data.logoUrl ? 'Change Logo' : 'Upload Logo'}
                        </Button>
                        <Button variant="danger" size="sm" onClick={onLogoRemove} disabled={isUploadingLogo || !data.logoUrl}>Remove</Button>
                        <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 mt-2">Recommended 800x800px PNG</p>
                    </div>
                </div>
            </div>

            <FormField label="Hotel/Brand Name">
                <Input
                    value={data.hotelName}
                    onChange={(e) => onChange({ hotelName: e.target.value })}
                />
            </FormField>

            <div className="grid grid-cols-2 gap-6 py-6 border-b border-gray-100 dark:border-slate-700/50 max-md:grid-cols-1">
                <FormField label="Website URL">
                    <Input
                        type="url"
                        value={data.websiteUrl}
                        onChange={(e) => onChange({ websiteUrl: e.target.value })}
                        placeholder="https://"
                    />
                </FormField>

                <FormField label="Property Type">
                    <Input
                        value={data.propertyType}
                        onChange={(e) => onChange({ propertyType: e.target.value })}
                        placeholder="e.g. Hotel, Resort"
                    />
                </FormField>
            </div>

            <FormField label="Primary Email">
                <Input
                    type="email"
                    value={data.primaryEmail}
                    onChange={(e) => onChange({ primaryEmail: e.target.value })}
                />
            </FormField>

            <FormField label="Phone Number">
                <Input
                    type="tel"
                    value={data.phoneNumber}
                    onChange={(e) => onChange({ phoneNumber: e.target.value })}
                />
            </FormField>

            <div className="py-6 border-b border-gray-100 dark:border-slate-700/50 last:border-b-0">
                <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Google Maps Location Link</label>
                    <input
                        type="url"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                        value={data.locationUrl || ''}
                        onChange={(e) => onChange({ locationUrl: e.target.value })}
                        placeholder="https://www.google.com/maps/place/..."
                    />
                </div>
            </div>

        </div>
    );
};
