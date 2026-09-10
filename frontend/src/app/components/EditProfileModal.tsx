import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { motion } from 'motion/react';
import { User } from '@/app/types';
import { X, Camera, Check, AlertCircle, Loader2, CalendarIcon } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Calendar } from '@/app/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/app/api';
import { fetchWithAuth } from '../../utils/apiClient';

interface EditProfileModalProps {
  user: User;
  onClose: () => void;
  onUpdateUser: (updatedData: Partial<User>) => void;
}

export function EditProfileModal({ user, onClose, onUpdateUser }: EditProfileModalProps) {
  const [formData, setFormData] = useState({
    name: user.name || '',
    username: user.username || '',
    phoneNumber: user.phoneNumber || '',
    dateOfBirth: user.dateOfBirth ? parseISO(user.dateOfBirth) : undefined,
    anniversary: user.anniversary ? parseISO(user.anniversary) : undefined,
    gender: user.gender || '',
  });

  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  

  
  // Profile Picture State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const defaultCode = user.phoneNumber?.startsWith('+1') ? '+1' : (user.phoneNumber?.startsWith('+44') ? '+44' : (user.phoneNumber?.startsWith('+61') ? '+61' : '+91'));
  const [countryCode, setCountryCode] = useState(defaultCode);
  const [phoneNumberBase, setPhoneNumberBase] = useState(user.phoneNumber?.replace(/^\+\d+\s?/, '') || '');

  useEffect(() => {
    if (phoneNumberBase) {
      setFormData(prev => ({ ...prev, phoneNumber: `${countryCode}${phoneNumberBase}` }));
    } else {
      setFormData(prev => ({ ...prev, phoneNumber: '' }));
    }
  }, [countryCode, phoneNumberBase]);

  // Check username availability with debounce
  useEffect(() => {
    if (!formData.username || formData.username === user.username) {
      setUsernameStatus('idle');
      return;
    }

    const checkUsername = async () => {
      setUsernameStatus('checking');
      try {
        const token = localStorage.getItem('token');
        const res = await fetchWithAuth(`${API_BASE_URL}/api/auth/check-username/${formData.username}`, {
          headers: { 'x-auth-token': token || '' }
        });
        const data = await res.json();
        if (data.available) {
          setUsernameStatus('available');
        } else {
          setUsernameStatus('taken');
        }
      } catch (err) {
        console.error('Failed to check username:', err);
        setUsernameStatus('idle');
      }
    };

    const timer = setTimeout(checkUsername, 500);
    return () => clearTimeout(timer);
  }, [formData.username, user.username]);

  // Track changes
  useEffect(() => {
    const isChanged = 
      formData.name !== user.name ||
      formData.username !== (user.username || '') ||
      formData.phoneNumber !== (user.phoneNumber || '') ||
      (formData.dateOfBirth ? format(formData.dateOfBirth, 'yyyy-MM-dd') : '') !== (user.dateOfBirth || '') ||
      (formData.anniversary ? format(formData.anniversary, 'yyyy-MM-dd') : '') !== (user.anniversary || '') ||
      formData.gender !== (user.gender || '');

    setHasChanges(isChanged);
  }, [formData, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Username character validation
    if (name === 'username' && value && !/^[a-zA-Z0-9_.]+$/.test(value)) {
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (field: 'dateOfBirth' | 'anniversary', date: Date | undefined) => {
    setFormData(prev => ({ ...prev, [field]: date }));
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploadingImage(true);

    const applyCartoonFilter = (originalFile: File): Promise<Blob> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(originalFile);
        
        img.onload = () => {
          URL.revokeObjectURL(url);
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Failed to get canvas context'));
          
          // Crop to a perfect square for avatars
          const size = Math.min(img.width, img.height);
          canvas.width = size;
          canvas.height = size;
          
          const startX = (img.width - size) / 2;
          const startY = (img.height - size) / 2;
          
          // Apply a vibrant, illustrated "avatar/comic" style filter
          ctx.filter = 'contrast(1.4) saturate(2) sepia(0.15) brightness(1.1)';
          
          // Draw the cropped and filtered image
          ctx.drawImage(img, startX, startY, size, size, 0, 0, size, size);
          
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob failed'));
          }, 'image/jpeg', 0.9);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = url;
      });
    };

    try {
      const processedBlob = await applyCartoonFilter(file);
      const processedFile = new File([processedBlob], `avatar_${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      const formData = new FormData();
      formData.append('profilePicture', processedFile);

      const token = localStorage.getItem('token');
      const res = await fetchWithAuth(`${API_BASE_URL}/api/auth/upload-profile-picture`, {
        method: 'POST',
        headers: { 'x-auth-token': token || '' },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        onUpdateUser({ profilePictureUrl: data.profilePictureUrl });
        toast.success('Profile picture updated!');
      } else {
        const data = await res.json();
        toast.error(data.msg || 'Failed to upload image');
      }
    } catch (err) {
      console.error(err);
      toast.error('Upload failed');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (usernameStatus === 'taken') {
      toast.error('Please choose an available username');
      return;
    }
    
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      
      const payload = {
        name: formData.name,
        username: formData.username,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth ? format(formData.dateOfBirth, 'yyyy-MM-dd') : null,
        anniversary: formData.anniversary ? format(formData.anniversary, 'yyyy-MM-dd') : null,
        phoneNumber: formData.phoneNumber,
      };

      const res = await fetchWithAuth(`${API_BASE_URL}/api/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || ''
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const data = await res.json();
        onUpdateUser(data.user);
        
        toast.success('Profile updated successfully');
        onClose();
      } else {
        const data = await res.json();
        toast.error(data.msg || 'Failed to update profile');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving profile');
    } finally {
      setIsSaving(false);
    }
  };

  const avatarUrl = user.profilePictureUrl 
    ? (user.profilePictureUrl.startsWith('http') ? user.profilePictureUrl : `${API_BASE_URL}${user.profilePictureUrl}`) 
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[60] bg-white dark:bg-[#0a0a0a] flex flex-col overscroll-none h-[100dvh] max-h-[100dvh] w-full touch-none"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="w-full h-full max-w-2xl mx-auto overflow-hidden flex flex-col"
      >
        <div 
          className="flex items-center justify-between px-6 pb-4 border-b border-gray-100 dark:border-white/[0.04] dark:shadow-[0_2px_8px_rgba(0,0,0,0.5)] sticky top-0 bg-white/95 dark:bg-[#0a0a0a] backdrop-blur-md z-10"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 48px)' }}
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Profile</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-black rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 overscroll-contain touch-pan-y">
          
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <Avatar className="w-24 h-24 border-4 border-white dark:border-[#1a1a1a] shadow-lg">
                <AvatarImage src={avatarUrl} className="object-cover" />
                <AvatarFallback className="text-3xl font-bold bg-[#e0b596]/90 text-[#1f1f1f]">
                  {user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              >
                {uploadingImage ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            </div>
            <p className="text-sm text-gray-500">Click picture to update</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div className="space-y-2">
              <Label>Full Name <span className="text-red-500">*</span></Label>
              <Input 
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
              />
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label>Username</Label>
              <div className="relative">
                <Input 
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="johndoe"
                  className={usernameStatus === 'taken' ? 'border-red-500' : ''}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameStatus === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                  {usernameStatus === 'available' && <Check className="w-4 h-4 text-green-500" />}
                  {usernameStatus === 'taken' && <AlertCircle className="w-4 h-4 text-red-500" />}
                </div>
              </div>
              {usernameStatus === 'taken' && <p className="text-xs text-red-500">Username is already taken.</p>}
            </div>

            {/* Email (Readonly) */}
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input 
                value={user.email}
                disabled
                className="bg-gray-50 dark:bg-black text-gray-500 cursor-not-allowed"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <div className="flex gap-2">
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger className="w-[90px] shrink-0">
                    <SelectValue placeholder="+91" />
                  </SelectTrigger>
                  <SelectContent className="z-[70] bg-white dark:bg-[#0a0a0a] border-gray-200 dark:border-white/[0.04] dark:shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                    <SelectItem value="+1">+1 (US)</SelectItem>
                    <SelectItem value="+91">+91 (IN)</SelectItem>
                    <SelectItem value="+44">+44 (UK)</SelectItem>
                    <SelectItem value="+61">+61 (AU)</SelectItem>
                  </SelectContent>
                </Select>
                <Input 
                  name="phoneNumberBase"
                  value={phoneNumberBase}
                  onChange={(e) => setPhoneNumberBase(e.target.value)}
                  placeholder="9999999999"
                  className="flex-1 min-w-0"
                />
              </div>
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input
                type="date"
                max={format(new Date(), 'yyyy-MM-dd')}
                value={formData.dateOfBirth ? format(formData.dateOfBirth, 'yyyy-MM-dd') : ''}
                onChange={(e) => handleDateChange('dateOfBirth', e.target.value ? parseISO(e.target.value) : undefined)}
                className="w-full appearance-none min-w-0"
              />
            </div>

            {/* Anniversary */}
            <div className="space-y-2">
              <Label>Anniversary (Optional)</Label>
              <Input
                type="date"
                value={formData.anniversary ? format(formData.anniversary, 'yyyy-MM-dd') : ''}
                onChange={(e) => handleDateChange('anniversary', e.target.value ? parseISO(e.target.value) : undefined)}
                className="w-full appearance-none min-w-0"
              />
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select 
                value={formData.gender} 
                onValueChange={(val) => setFormData(prev => ({ ...prev, gender: val }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent className="z-[70] bg-white dark:bg-[#0a0a0a] border-gray-200 dark:border-white/[0.04] dark:shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                  <SelectItem value="Male" className="focus:bg-gray-100 dark:focus:bg-black cursor-pointer">Male</SelectItem>
                  <SelectItem value="Female" className="focus:bg-gray-100 dark:focus:bg-black cursor-pointer">Female</SelectItem>
                  <SelectItem value="Non-binary" className="focus:bg-gray-100 dark:focus:bg-black cursor-pointer">Non-binary</SelectItem>
                  <SelectItem value="Prefer not to say" className="focus:bg-gray-100 dark:focus:bg-black cursor-pointer">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-white/[0.04] dark:shadow-[0_2px_8px_rgba(0,0,0,0.5)] flex justify-end gap-3 bg-gray-50/50 dark:bg-[#0a0a0a]">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || isSaving || usernameStatus === 'checking'}
            className="bg-[#e0b596] hover:bg-[#d4a37f] text-white min-w-[120px]"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
