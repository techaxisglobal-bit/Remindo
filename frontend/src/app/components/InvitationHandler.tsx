import { useEffect, useState, useRef } from 'react';

export default function InvitationHandler({ onNavigate }: { onNavigate: (path: string) => void }) {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const isFriend = window.location.pathname === '/friend-invite';
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const processingRef = useRef(false);

    useEffect(() => {
        const processInvitation = async () => {
            if (processingRef.current) return;
            processingRef.current = true;
            if (!token) {
                setError('Invalid invitation link.');
                setLoading(false);
                return;
            }

            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
            const isAndroid = /android/i.test(navigator.userAgent);
            
            if (isIOS || isAndroid) {
                const deepLinkUrl = `remindo://${isFriend ? 'friend-invite' : 'invite'}?token=${token}`;
                window.location.href = deepLinkUrl;
                
                setTimeout(() => {
                    if (isIOS) {
                        window.location.href = "https://apps.apple.com/"; // Fallback to App Store
                    } else if (isAndroid) {
                        window.location.href = "https://play.google.com/store/apps/details?id=com.techaxisglobal.remindo";
                    }
                }, 2000);
                
                // Allow a few seconds for redirect before falling back to web logic
                await new Promise(resolve => setTimeout(resolve, 2500));
            }

            const authToken = localStorage.getItem('token');

            if (authToken) {
                onNavigate('/dashboard');
            } else {
                setLoading(false);
            }
        };

        processInvitation();
    }, [token, isFriend, onNavigate]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e0b596]"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black p-4">
                <div className="bg-white dark:bg-[#0a0a0a] p-8 rounded-[2rem] max-w-md w-full shadow-2xl border border-gray-100 dark:border-white/[0.04] dark:shadow-[0_2px_8px_rgba(0,0,0,0.5)] text-center space-y-4">
                    <div className="w-16 h-16 bg-red-100 dark:bg-[#0a0a0a] text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Invitation Error</h2>
                    <p className="text-gray-500 dark:text-gray-400">{error}</p>
                    <button
                        onClick={() => onNavigate('/signin')}
                        className="mt-6 w-full bg-[#e0b596] hover:bg-[#d4a37f] text-white py-3 rounded-xl font-bold transition-all"
                    >
                        Go to Sign In
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black p-4">
            <div className="bg-white dark:bg-[#0a0a0a] p-8 rounded-[2rem] max-w-md w-full shadow-2xl border border-gray-100 dark:border-white/[0.04] dark:shadow-[0_2px_8px_rgba(0,0,0,0.5)] text-center space-y-6">
                <div className="w-16 h-16 bg-[#e0b596]/10 text-[#e0b596] rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">You've been invited!</h2>
                </div>
                
                <div className="pt-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Please sign in or create an account to view and respond to this invitation.
                    </p>
                    <div className="space-y-3 flex flex-col">
                        <button
                            onClick={() => onNavigate(`/signup`)}
                            className="w-full bg-[#e0b596] hover:bg-[#d4a37f] text-white py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
                        >
                            Create an Account
                        </button>
                        <button
                            onClick={() => onNavigate('/signin')}
                            className="w-full bg-white dark:bg-[#0a0a0a] hover:bg-gray-50 dark:hover:bg-black text-gray-900 dark:text-white py-3 rounded-xl font-bold transition-all border border-gray-200 dark:border-[#444] active:scale-[0.98]"
                        >
                            Sign In
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
