import React, { useState } from 'react';
import { API_BASE_URL } from '@/app/api';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import { toast } from 'sonner';
import { Store, MapPin, Phone, Mail, Globe, UploadCloud, RefreshCw } from 'lucide-react';

interface MerchantFormProps {
    onSuccess?: () => void;
}

export function MerchantForm({ onSuccess }: MerchantFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        businessName: '',
        category: '',
        location: '',
        serviceArea: '',
        description: '',
        website: '',
        phone: '',
        email: '',
        topPlacementBid: '',
        facebookUrl: '',
        instagramUrl: '',
        whatsappNumber: '',
        deliveryAvailable: false,
        onlineServiceAvailable: false
    });
    
    const [customCategory, setCustomCategory] = useState('');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [proofFile, setProofFile] = useState<File | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSwitchChange = (name: string, checked: boolean) => {
        setFormData(prev => ({ ...prev, [name]: checked }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'proof') => {
        if (e.target.files && e.target.files.length > 0) {
            if (type === 'logo') setLogoFile(e.target.files[0]);
            if (type === 'proof') setProofFile(e.target.files[0]);
        }
    };

    const handleUseCurrentLocation = () => {
        if ('geolocation' in navigator) {
            toast.info('Fetching location...');
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;
                setFormData(prev => ({ ...prev, location: `${latitude}, ${longitude}` }));
                toast.success('Location updated');
            }, () => {
                toast.error('Failed to get location');
            });
        } else {
            toast.error('Geolocation not supported');
        }
    };

    const handleReset = () => {
        setFormData({
            businessName: '', category: '', location: '', serviceArea: '', description: '',
            website: '', phone: '', email: '', topPlacementBid: '', facebookUrl: '',
            instagramUrl: '', whatsappNumber: '', deliveryAvailable: false, onlineServiceAvailable: false
        });
        setCustomCategory('');
        setLogoFile(null);
        setProofFile(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const finalCategory = formData.category === 'Other' ? customCategory : formData.category;
        
        if (!formData.businessName || !finalCategory || !formData.location || !formData.phone || !formData.email) {
            toast.error('Please fill in all required fields');
            return;
        }

        setIsLoading(true);
        const token = localStorage.getItem('token');
        
        const submitData = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
            if (key === 'category') {
                submitData.append(key, finalCategory);
            } else {
                submitData.append(key, String(value));
            }
        });
        
        if (logoFile) submitData.append('logo', logoFile);
        if (proofFile) submitData.append('proofDocument', proofFile);

        try {
            const res = await fetch(`${API_BASE_URL}/api/merchants`, {
                method: 'POST',
                headers: { 'x-auth-token': token || '' },
                body: submitData
            });

            if (res.ok) {
                toast.success('Merchant listing submitted for approval!');
                handleReset();
                onSuccess?.();
            } else {
                toast.error('Failed to submit listing');
            }
        } catch (error) {
            console.error('Error submitting merchant:', error);
            toast.error('An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-[#1b1b1b] rounded-2xl shadow-sm border border-gray-100 dark:border-[#292929] overflow-hidden max-w-4xl mx-auto my-8">
            <div className="p-6 md:p-8 border-b border-gray-100 dark:border-[#292929] bg-gradient-to-r from-gray-50 to-white dark:from-[#202020] dark:to-[#1b1b1b]">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-[#e0b596]/10 text-[#e0b596] rounded-xl">
                        <Store className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Register Your Business</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Join our marketplace and reach more customers</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
                {/* Basic Info */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b border-gray-100 dark:border-[#292929] pb-2">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="businessName">Business Name *</Label>
                            <Input id="businessName" name="businessName" value={formData.businessName} onChange={handleChange} placeholder="e.g. Acme Corp" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category">Category *</Label>
                            <select 
                                id="category" 
                                name="category" 
                                value={formData.category} 
                                onChange={handleChange} 
                                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#292929] dark:bg-[#1b1b1b] dark:ring-offset-gray-950 dark:focus-visible:ring-gray-300" 
                                required
                            >
                                <option value="" disabled>Select a category</option>
                                <option value="Retail & FMCG">Retail & FMCG (Supermarkets, Groceries, Clothing)</option>
                                <option value="Food & Beverage">Food & Beverage (Restaurants, Cafes, Bakeries)</option>
                                <option value="Health & Wellness">Health & Wellness (Hospitals, Clinics, Pharmacies, Gyms)</option>
                                <option value="IT & Technology Services">IT & Technology Services</option>
                                <option value="Education & Training">Education & Training (Schools, Tutors, Institutes)</option>
                                <option value="Real Estate & Construction">Real Estate & Construction</option>
                                <option value="Automotive">Automotive (Dealerships, Garages, Spares)</option>
                                <option value="Financial & Legal Services">Financial & Legal Services (CA, Insurance, Lawyers)</option>
                                <option value="Travel & Hospitality">Travel & Hospitality (Hotels, Tours, Travel Agents)</option>
                                <option value="Logistics & Transport">Logistics & Transport</option>
                                <option value="Manufacturing & Industrial">Manufacturing & Industrial</option>
                                <option value="Beauty & Personal Care">Beauty & Personal Care (Salons, Spas)</option>
                                <option value="Event Management & Entertainment">Event Management & Entertainment</option>
                                <option value="Home Services">Home Services (Plumbing, Electrical, Cleaning)</option>
                                <option value="Agriculture & Farming">Agriculture & Farming</option>
                                <option value="Other">Other (Request new category)</option>
                            </select>
                        </div>
                        {formData.category === 'Other' && (
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="customCategory">Please specify your category *</Label>
                                <Input 
                                    id="customCategory" 
                                    value={customCategory} 
                                    onChange={(e) => setCustomCategory(e.target.value)} 
                                    placeholder="e.g. Pet Grooming, Specialized Tech" 
                                    required={formData.category === 'Other'} 
                                />
                                <p className="text-xs text-gray-500">This category will be sent to our team for approval.</p>
                            </div>
                        )}
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="description">Description</Label>
                            <textarea id="description" name="description" value={formData.description} onChange={handleChange} className="flex min-h-[80px] w-full rounded-md border border-gray-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:placeholder:text-gray-400 dark:focus-visible:ring-gray-300" placeholder="Briefly describe your business..." />
                        </div>
                    </div>
                </div>

                {/* Contact & Location */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b border-gray-100 dark:border-[#292929] pb-2">Contact & Location</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number *</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} className="pl-9" placeholder="(555) 123-4567" required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address *</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className="pl-9" placeholder="hello@acme.com" required />
                            </div>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="location">Location / Address *</Label>
                                <Button type="button" variant="ghost" size="sm" onClick={handleUseCurrentLocation} className="h-6 text-xs text-[#e0b596]">
                                    <MapPin className="w-3 h-3 mr-1" /> Use Current Location
                                </Button>
                            </div>
                            <Input id="location" name="location" value={formData.location} onChange={handleChange} placeholder="Full address" required />
                        </div>
                    </div>
                </div>

                {/* Digital Presence & Uploads */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b border-gray-100 dark:border-[#292929] pb-2">Digital Presence & Files</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="website">Website</Label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                <Input id="website" name="website" value={formData.website} onChange={handleChange} className="pl-9" placeholder="https://..." />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                            <Input id="whatsappNumber" name="whatsappNumber" value={formData.whatsappNumber} onChange={handleChange} placeholder="For quick chat" />
                        </div>
                        <div className="space-y-2">
                            <Label>Logo Upload</Label>
                            <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors relative">
                                <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'logo')} />
                                <UploadCloud className="w-6 h-6 text-gray-400 mb-2" />
                                <span className="text-sm text-gray-500">{logoFile ? logoFile.name : 'Upload Business Logo'}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Proof Document (PDF/JPG)</Label>
                            <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors relative">
                                <input type="file" accept=".pdf,image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, 'proof')} />
                                <UploadCloud className="w-6 h-6 text-gray-400 mb-2" />
                                <span className="text-sm text-gray-500">{proofFile ? proofFile.name : 'Upload Business License/Proof'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Additional Settings */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b border-gray-100 dark:border-[#292929] pb-2">Settings & Features</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-center justify-between p-4 border border-gray-100 dark:border-[#292929] rounded-xl">
                            <div>
                                <Label className="text-base">Delivery Available</Label>
                                <p className="text-xs text-gray-500">Do you deliver to customers?</p>
                            </div>
                            <Switch checked={formData.deliveryAvailable} onCheckedChange={(c) => handleSwitchChange('deliveryAvailable', c)} />
                        </div>
                        <div className="flex items-center justify-between p-4 border border-gray-100 dark:border-[#292929] rounded-xl">
                            <div>
                                <Label className="text-base">Online Service</Label>
                                <p className="text-xs text-gray-500">Do you offer virtual/online services?</p>
                            </div>
                            <Switch checked={formData.onlineServiceAvailable} onCheckedChange={(c) => handleSwitchChange('onlineServiceAvailable', c)} />
                        </div>
                    </div>
                </div>

                {/* Submit Actions */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 dark:border-[#292929]">
                    <Button type="button" variant="outline" onClick={handleReset} disabled={isLoading}>
                        <RefreshCw className="w-4 h-4 mr-2" /> Reset
                    </Button>
                    <Button type="submit" className="bg-[#e0b596] hover:bg-[#cda283] text-white" disabled={isLoading}>
                        {isLoading ? 'Submitting...' : 'Save Listing'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
