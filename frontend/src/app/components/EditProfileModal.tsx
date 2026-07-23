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
  
  // OTP State
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  
  // Profile Picture State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

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
        const res = await fetch(`${API_BASE_URL}/api/auth/check-username/${formData.username}`, {
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
    const formData = new FormData();
    formData.append('profilePicture', file);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/auth/upload-profile-picture`, {
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

  const handleSendOtp = async () => {
    if (!formData.phoneNumber) {
      toast.error('Please enter a valid phone number');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/auth/send-phone-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || ''
        },
        body: JSON.stringify({ phoneNumber: formData.phoneNumber })
      });
      if (res.ok) {
        setShowOtpInput(true);
        toast.success('OTP sent to phone');
      } else {
        toast.error('Failed to send OTP');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error sending OTP');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) return;
    setIsVerifyingOtp(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/auth/verify-phone-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || ''
        },
        body: JSON.stringify({ phoneNumber: formData.phoneNumber, otp })
      });
      if (res.ok) {
        toast.success('Phone verified!');
        setShowOtpInput(false);
        onUpdateUser({ phoneNumber: formData.phoneNumber, phoneVerified: true });
        
        // Refresh local user state reference to prevent showing changes again
        setHasChanges(false); 
      } else {
        const data = await res.json();
        toast.error(data.msg || 'Invalid OTP');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error verifying OTP');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleSave = async () => {
    if (usernameStatus === 'taken') {
      toast.error('Please choose an available username');
      return;
    }
    
    if (formData.phoneNumber !== user.phoneNumber && !showOtpInput) {
      // Need to verify phone first
      handleSendOtp();
      return;
    }

    if (showOtpInput) {
      toast.error('Please verify your new phone number first');
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
      };

      const res = await fetch(`${API_BASE_URL}/api/auth/update-profile`, {
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

  const avatarUrl = user.profilePictureUrl ? `${API_BASE_URL}${user.profilePictureUrl}` : '';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#1a1a1a] rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] ring-1 ring-black/5 dark:ring-white/10"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#333] sticky top-0 bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-md z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Profile</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-[#333] rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
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
                className="bg-gray-50 dark:bg-[#25252b] text-gray-500 cursor-not-allowed"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <div className="flex gap-2">
                <Input 
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="+1234567890"
                  disabled={showOtpInput}
                />
                {formData.phoneNumber !== user.phoneNumber && !showOtpInput && formData.phoneNumber && (
                  <Button onClick={handleSendOtp} variant="secondary">Verify</Button>
                )}
              </div>
            </div>

            {/* OTP Verification */}
            {showOtpInput && (
              <div className="space-y-2 md:col-span-2 bg-[#e0b596]/10 p-4 rounded-xl border border-[#e0b596]/30">
                <Label>Enter OTP sent to {formData.phoneNumber}</Label>
                <div className="flex gap-2">
                  <Input 
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                  />
                  <Button onClick={handleVerifyOtp} disabled={isVerifyingOtp} className="bg-[#e0b596] hover:bg-[#d4a37f] text-white">
                    {isVerifyingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
                  </Button>
                  <Button onClick={() => setShowOtpInput(false)} variant="ghost">Cancel</Button>
                </div>
              </div>
            )}

            {/* Date of Birth */}
            <div className="space-y-2 flex flex-col">
              <Label>Date of Birth</Label>
              <Input
                type="date"
                max={format(new Date(), 'yyyy-MM-dd')}
                value={formData.dateOfBirth ? format(formData.dateOfBirth, 'yyyy-MM-dd') : ''}
                onChange={(e) => handleDateChange('dateOfBirth', e.target.value ? parseISO(e.target.value) : undefined)}
              />
            </div>

            {/* Anniversary */}
            <div className="space-y-2 flex flex-col">
              <Label>Anniversary (Optional)</Label>
              <Input
                type="date"
                value={formData.anniversary ? format(formData.anniversary, 'yyyy-MM-dd') : ''}
                onChange={(e) => handleDateChange('anniversary', e.target.value ? parseISO(e.target.value) : undefined)}
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
                <SelectContent className="z-[70] bg-white dark:bg-[#222] border-gray-200 dark:border-[#333]">
                  <SelectItem value="Male" className="focus:bg-gray-100 dark:focus:bg-[#333] cursor-pointer">Male</SelectItem>
                  <SelectItem value="Female" className="focus:bg-gray-100 dark:focus:bg-[#333] cursor-pointer">Female</SelectItem>
                  <SelectItem value="Non-binary" className="focus:bg-gray-100 dark:focus:bg-[#333] cursor-pointer">Non-binary</SelectItem>
                  <SelectItem value="Prefer not to say" className="focus:bg-gray-100 dark:focus:bg-[#333] cursor-pointer">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-[#333] flex justify-end gap-3 bg-gray-50/50 dark:bg-[#1a1a1a]/50">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            disabled={(!hasChanges && !showOtpInput) || isSaving || usernameStatus === 'checking' || showOtpInput}
            className="bg-[#e0b596] hover:bg-[#d4a37f] text-white min-w-[120px]"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (formData.phoneNumber !== user.phoneNumber && !showOtpInput ? 'Verify to Save' : 'Save Changes')}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
