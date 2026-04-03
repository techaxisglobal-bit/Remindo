import { motion } from 'motion/react';
import { X, User, Plus, LogOut, Check } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { toast } from 'sonner';

interface ProfileMenuProps {
    userEmail: string;
    userName: string;
    onClose: () => void;
    onLogout: () => void;
}

export function ProfileMenu({ userEmail, userName, onClose, onLogout }: ProfileMenuProps) {
    const accounts = [
        { email: userEmail, name: userName, active: true },
        // Mock previous account if any
        // { email: 'demo@example.com', name: 'Demo User', active: false }
    ];

    const handleAddAccount = () => {
        toast.info("Multi-account support coming soon!");
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-end p-4 z-50 pt-20 pr-6" // Positioned top-right
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: -10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: -10 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white/60 dark:bg-black/60 backdrop-blur-3xl border border-white/40 dark:border-white/10 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.3)] w-80 overflow-hidden flex flex-col bg-gradient-to-b from-white/40 to-white/10 dark:from-white/5 dark:to-transparent ring-1 ring-white/50 dark:ring-white/10"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#333]">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#292929] rounded-full transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-6">

                    {/* Current User Info */}
                    <div className="flex flex-col items-center text-center">
                        <Avatar className="w-20 h-20 border-2 border-white/20 dark:border-white/10 shadow-xl bg-[#e0b596]/90 backdrop-blur-sm mb-3">
                            <AvatarFallback className="text-[#1f1f1f] text-3xl font-bold bg-[#e0b596]/90 backdrop-blur-sm">
                                {userName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{userName}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{userEmail}</p>
                    </div>

                    {/* Accounts List */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">Accounts</h4>

                        {accounts.map((acc, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/20 dark:border-white/5 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-8 h-8 bg-gray-200 dark:bg-gray-700">
                                        <AvatarFallback className="text-xs">{acc.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="text-sm">
                                        <p className="font-medium text-gray-900 dark:text-white leading-none">{acc.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{acc.email}</p>
                                    </div>
                                </div>
                                {acc.active && <Check className="w-4 h-4 text-green-500" />}
                            </div>
                        ))}

                        <button
                            onClick={handleAddAccount}
                            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/40 dark:hover:bg-white/10 border border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-[#e0b596] hover:text-[#e0b596] transition-all group"
                        >
                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-[#e0b596]/10">
                                <Plus className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium">Add another account</span>
                        </button>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-[#333] bg-gray-50/50 dark:bg-[#1f1f1f]/50">
                    <Button
                        onClick={onLogout}
                        variant="ghost"
                        className="w-full justify-center text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign out
                    </Button>
                </div>

            </motion.div>
        </motion.div>
    );
}
