import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/app/api';

export default function InvitationHandler({ onNavigate }: { onNavigate: (path: string) => void }) {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const action = urlParams.get('action');
    const [loading, setLoading] = useState(true);
    const [inviteDetails, setInviteDetails] = useState<any>(null);
    const [error, setError] = useState('');
    const processingRef = useRef(false);

    useEffect(() => {
        const processInvitation = async () => {
            if (processingRef.current) return;
            processingRef.current = true;
            if (!token || !action) {
                setError('Invalid invitation link.');
                setLoading(false);
                return;
            }

            const authToken = localStorage.getItem('token');

            if (authToken) {
                // User is logged in, try to accept/decline directly
                try {
                    const res = await fetch(`${API_BASE_URL}/api/invitations/respond`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-auth-token': authToken
                        },
                        body: JSON.stringify({ token, action })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.msg || 'Failed to process invitation.');
                    toast.success(data.msg || 'Invitation processed successfully!');
                    onNavigate('/dashboard');
                } catch (err: any) {
                    setError(err.message || 'Failed to process invitation.');
                    setLoading(false);
                }
            } else {
                // Not logged in, fetch preview details
                try {
                    const res = await fetch(`${API_BASE_URL}/api/invitations/${token}`);
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.msg || 'Failed to fetch invitation details.');
                    setInviteDetails(data);
                    // Save to session storage for post-login processing
                    sessionStorage.setItem('inviteToken', token);
                    sessionStorage.setItem('inviteAction', action);
                    sessionStorage.setItem('inviteEmail', data.email); // Helpful to prefill signup email
                    setLoading(false);
                } catch (err: any) {
                    setError(err.message || 'Failed to fetch invitation details.');
                    setLoading(false);
                }
            }
        };

        processInvitation();
    }, [token, action, onNavigate]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#1a1a1a]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e0b596]"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#1a1a1a] p-4">
                <div className="bg-white dark:bg-[#252525] p-8 rounded-[2rem] max-w-md w-full shadow-2xl border border-gray-100 dark:border-[#333] text-center space-y-4">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
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

    if (inviteDetails) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#1a1a1a] p-4">
                <div className="bg-white dark:bg-[#252525] p-8 rounded-[2rem] max-w-md w-full shadow-2xl border border-gray-100 dark:border-[#333] text-center space-y-6">
                    <div className="w-16 h-16 bg-[#e0b596]/10 text-[#e0b596] rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">You've been invited!</h2>
                        <p className="text-gray-500 dark:text-gray-400">
                            <strong>{inviteDetails.task.creatorName}</strong> invited you to a reminder:
                        </p>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-[#1f1f1f] border border-gray-100 dark:border-[#333] p-4 rounded-2xl text-left space-y-2">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white line-clamp-2">{inviteDetails.task.title}</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {inviteDetails.task.date}
                        </p>
                    </div>

                    <div className="pt-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Please sign in or create an account to {action === 'accept' ? 'accept' : 'decline'} this invitation.
                        </p>
                        <div className="space-y-3 flex flex-col">
                            <button
                                onClick={() => onNavigate(`/signup?email=${encodeURIComponent(inviteDetails.email)}`)}
                                className="w-full bg-[#e0b596] hover:bg-[#d4a37f] text-white py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
                            >
                                Create an Account
                            </button>
                            <button
                                onClick={() => onNavigate('/signin')}
                                className="w-full bg-white dark:bg-[#333] hover:bg-gray-50 dark:hover:bg-[#444] text-gray-900 dark:text-white py-3 rounded-xl font-bold transition-all border border-gray-200 dark:border-[#444] active:scale-[0.98]"
                            >
                                Sign In
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
