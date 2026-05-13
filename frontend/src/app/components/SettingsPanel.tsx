import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { X, User, Moon, Sun, Pencil, Check, Bell, Mail, LogOut, Shield, Key, Eye, EyeOff, Loader2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/app/api';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

interface SettingsPanelProps {
  userEmail: string;
  initialName: string;
  onClose: () => void;
  notificationsEnabled: boolean;
  onNotificationChange: () => void;
  onUpdateUser: (newName: string) => void;
}

export function SettingsPanel({
  userEmail,
  initialName,
  onClose,
  notificationsEnabled,
  onNotificationChange,
  onUpdateUser,
}: SettingsPanelProps) {

  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    }
  }, []);


  const [name, setName] = useState(initialName);
  const [editingName, setEditingName] = useState(false);
  const [showSaveTick, setShowSaveTick] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Change Password State
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);


  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);

    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    toast.success(`Switched to ${newMode ? 'Dark' : 'Light'} mode`);
  };


  const toggleNotifications = () => {
    onNotificationChange();
  };

  const handleUpdateName = async () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    setIsUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/auth/update-name', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || '',
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        onUpdateUser(name.trim());
        setEditingName(false);
        setShowSaveTick(false);
        toast.success('Name updated');
      } else {
        toast.error(data.msg || 'Failed to update name');
      }
    } catch (error) {
      console.error('Update name error:', error);
      toast.error('Server error');
    } finally {
      setIsUpdating(false);
    }
  };


  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsChangingPassword(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || '',
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Password changed successfully');
        setShowChangePassword(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(data.msg || 'Failed to change password');
      }
    } catch (error) {
      console.error('Change password error:', error);
      toast.error('Server error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      await GoogleAuth.signOut();
    } catch (e) {
      console.error('Google signOut error:', e);
    }
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    toast.success('Logged out successfully');
    window.location.reload();
  };

  const userInitials = userEmail
    .split('@')[0]
    .split(/[._]/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white/60 dark:bg-black/60 backdrop-blur-3xl border border-white/40 dark:border-white/10 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.3)] max-w-md w-full overflow-hidden flex flex-col max-h-[90vh] bg-gradient-to-b from-white/40 to-white/10 dark:from-white/5 dark:to-transparent ring-1 ring-white/50 dark:ring-white/10"
      >
        {/* Header - Minimal & Clean */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#333]">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#292929] rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">

          {/* Profile Section */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-1">Profile</h3>
            <div className="flex items-center gap-4 px-1">
              <Avatar className="w-16 h-16 border-2 border-white/20 dark:border-white/10 shadow-lg bg-[#e0b596]/90 backdrop-blur-sm">
                <AvatarFallback className="text-[#1f1f1f] text-xl font-bold bg-[#e0b596]/90 backdrop-blur-sm">
                  {name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-1">
                <Label className="text-xs text-gray-500 dark:text-gray-400 font-normal">Display Name</Label>

                {!editingName ? (
                  <div className="flex items-center gap-2 group">
                    <p className="font-semibold text-lg text-gray-900 dark:text-white">{name}</p>
                    <button
                      onClick={() => {
                        setEditingName(true);
                        setShowSaveTick(false);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-[#e0b596] p-1 hover:bg-[#e0b596]/10 rounded transition-all"
                      title="Edit name"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      autoFocus
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setShowSaveTick(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateName();
                        if (e.key === 'Escape') {
                          setName(initialName);
                          setEditingName(false);
                          setShowSaveTick(false);
                        }
                      }}
                      className="w-full bg-transparent border-b border-[#e0b596] text-lg font-semibold text-gray-900 dark:text-white focus:outline-none py-0.5 px-0"
                      disabled={isUpdating}
                    />
                    {showSaveTick && (
                      <button
                        onClick={handleUpdateName}
                        disabled={isUpdating}
                        className="absolute right-0 top-1/2 -translate-y-1/2 text-green-500 hover:text-green-600 p-1 disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <div className="w-4 h-4 border-2 border-green-500 border-t-transparent animate-spin rounded-full" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{userEmail}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Preferences Section */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Preferences</h3>

            {/* Appearance */}
            <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/40 dark:hover:bg-white/10 transition-all duration-300 border border-transparent hover:border-white/20 hover:shadow-lg hover:backdrop-blur-md group">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/50 dark:bg-white/10 backdrop-blur-md text-gray-700 dark:text-[#e0b596] shadow-inner ring-1 ring-white/20 dark:ring-white/5">
                  {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </div>
                <div>
                  <Label className="font-medium text-gray-900 dark:text-white block">Dark Mode</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Reduce eye strain</p>
                </div>
              </div>
              <Switch
                checked={isDarkMode}
                onCheckedChange={toggleTheme}
                className="data-[state=checked]:bg-[#e0b596]"
              />
            </div>

            {/* Notifications */}
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#25252b] transition-colors border border-transparent hover:border-gray-100 dark:hover:border-[#333]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-gray-100 dark:bg-[#333] text-gray-700 dark:text-[#e0b596]">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <Label className="font-medium text-gray-900 dark:text-white block">Notifications</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tasks & reminders</p>
                </div>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={toggleNotifications}
                className="data-[state=checked]:bg-[#e0b596]"
              />
            </div>
          </section>

          {/* Security */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-2 px-1">Security</h3>
            <div className="space-y-3">
              <div
                className={`p-3 rounded-2xl transition-all duration-300 border ${showChangePassword ? 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10' : 'hover:bg-white/40 dark:hover:bg-white/10 border-transparent hover:border-white/20 hover:shadow-lg hover:backdrop-blur-md group'}`}
              >
                <button
                  onClick={() => setShowChangePassword(!showChangePassword)}
                  className="flex items-center justify-between w-full group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-white/50 dark:bg-white/10 backdrop-blur-md text-gray-700 dark:text-[#e0b596] shadow-inner ring-1 ring-white/20 dark:ring-white/5">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <Label className="font-medium text-gray-900 dark:text-white block cursor-pointer">Security</Label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Password & Authentication</p>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${showChangePassword ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showChangePassword && (
                    <motion.form
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      onSubmit={handleChangePassword}
                      className="overflow-hidden space-y-4 pt-4 px-1"
                    >
                      <div className="space-y-3">
                        <div className="relative">
                          <Label className="text-[10px] text-gray-500 uppercase ml-1">Current Password</Label>
                          <div className="relative mt-1">
                            <input
                              type={showPass ? 'text' : 'password'}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#333] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#e0b596] transition-colors"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPass(!showPass)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                            >
                              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="relative">
                            <Label className="text-[10px] text-gray-500 uppercase ml-1">New Password</Label>
                            <input
                              type={showPass ? 'text' : 'password'}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Min. 6 characters"
                              className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#333] rounded-xl mt-1 px-4 py-2.5 text-sm focus:outline-none focus:border-[#e0b596] transition-colors"
                            />
                          </div>
                          <div className="relative">
                            <Label className="text-[10px] text-gray-500 uppercase ml-1">Confirm New Password</Label>
                            <input
                              type={showPass ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Match new password"
                              className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#333] rounded-xl mt-1 px-4 py-2.5 text-sm focus:outline-none focus:border-[#e0b596] transition-colors"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          disabled={isChangingPassword}
                          className="flex-1 bg-[#e0b596] hover:bg-[#d4a37f] text-white rounded-xl h-10 font-bold transition-all shadow-md active:scale-95"
                        >
                          {isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Update Password'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setShowChangePassword(false)}
                          className="px-4 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                        >
                          Cancel
                        </Button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </section>

          {/* Footer / About */}
          <section className="pt-6 border-t border-gray-100 dark:border-[#333]">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-6 px-1">
              <span>App Version</span>
              <span className="font-mono">v1.2.0</span>
            </div>

            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full h-12 border border-white/40 dark:border-white/10 bg-gradient-to-b from-white/30 to-white/10 dark:from-white/10 dark:to-transparent hover:bg-white/50 dark:hover:bg-white/20 backdrop-blur-md text-gray-700 dark:text-red-400 justify-center gap-2 group transition-all duration-300 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] ring-1 ring-white/40 dark:ring-transparent"
            >
              <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Sign out
            </Button>
          </section>

        </div>
      </motion.div>
    </motion.div>
  );
}
