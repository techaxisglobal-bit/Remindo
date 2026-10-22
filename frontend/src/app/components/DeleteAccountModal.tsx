import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, X, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/app/api';
import { fetchWithAuth } from '../../utils/apiClient';
import { tokenManager } from '../../utils/tokenManager';
import { SocialLogin } from '@capgo/capacitor-social-login';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteAccountModal({ isOpen, onClose }: DeleteAccountModalProps) {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmed = confirmationInput.trim().toUpperCase() === 'DELETE';

  const handleDelete = async () => {
    if (!isConfirmed || isDeleting) return;

    setIsDeleting(true);
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/api/auth/delete-account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      let data: any = {};
      try {
        data = await response.json();
      } catch (jsonErr) {
        // Not JSON
      }

      if (response.ok) {
        toast.success(data?.msg || 'Your account and data have been permanently deleted.');

        // Clear social logins if active
        try {
          await SocialLogin.logout({ provider: 'google' });
        } catch (e) {
          console.error('Google logout error on delete:', e);
        }
        try {
          await SocialLogin.logout({ provider: 'apple' });
        } catch (e) {
          console.error('Apple logout error on delete:', e);
        }

        // Wipe tokens & local data
        await tokenManager.clearTokens();
        localStorage.clear();
        sessionStorage.clear();

        // Notify app to transition back to auth screen
        window.dispatchEvent(new Event('auth-expired'));
        setTimeout(() => {
          window.location.reload();
        }, 300);
      } else {
        const errorMsg = data?.msg || (response.status === 404 ? 'Account deletion is not yet deployed on the backend server. Please push to GitHub so the server can deploy.' : 'Failed to delete account. Please try again.');
        toast.error(errorMsg);
        setIsDeleting(false);
      }
    } catch (error: any) {
      console.error('Account deletion error:', error);
      toast.error(error.message || 'Server error occurred while deleting account.');
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (isDeleting) return;
    setConfirmationInput('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-[#121212] border border-red-500/20 dark:border-red-500/30 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.5)] w-full max-w-md overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400">
              <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/50">
                <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Delete Account</h2>
            </div>
            <button
              onClick={handleClose}
              disabled={isDeleting}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors disabled:opacity-40"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* Warning Banner */}
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-300">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <p className="font-semibold text-sm mb-1 text-red-900 dark:text-red-200">
                    This action is permanent and cannot be undone.
                  </p>
                  <p>
                    Deleting your account will immediately remove all your personal data in accordance with privacy regulations and Apple App Store guidelines.
                  </p>
                </div>
              </div>
            </div>

            {/* What gets deleted list */}
            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
              <p className="font-medium text-gray-900 dark:text-white text-xs">
                The following data will be permanently wiped:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-gray-500 dark:text-gray-400">
                <li>All tasks, reminders, schedules, and past history</li>
                <li>Merchant profiles and registered business information</li>
                <li>Group memberships, collaborations, and shared tasks</li>
                <li>Friend connections and pending invitations</li>
                <li>Personal profile details and account credentials</li>
              </ul>
            </div>

            {/* Confirmation Input */}
            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-white/5">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                To confirm deletion, please type <span className="font-bold text-red-600 dark:text-red-400 tracking-wider">DELETE</span> below:
              </label>
              <Input
                type="text"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder="DELETE"
                disabled={isDeleting}
                className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 tracking-wider font-mono uppercase"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isDeleting}
                className="flex-1 rounded-xl h-11 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                disabled={!isConfirmed || isDeleting}
                className="flex-1 rounded-xl h-11 bg-red-600 hover:bg-red-700 text-white font-semibold transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Account</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
