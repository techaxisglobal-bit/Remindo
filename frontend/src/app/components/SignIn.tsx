import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { API_BASE_URL } from '@/app/api';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Bell, Mail, Lock, User, Eye, EyeOff, ArrowLeft, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SignInProps {
  onSignIn: (email: string) => void;
}

export function SignIn({ onSignIn }: SignInProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password states
  const [forgotStep, setForgotStep] = useState<'idle' | 'email' | 'otp'>('idle');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // OTP verification during signup
  const [signupOtpStep, setSignupOtpStep] = useState(false);
  const [signupOtp, setSignupOtp] = useState('');

  // Theme sync
  const [theme, setTheme] = useState('dark');
  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'light';
    setTheme(saved);
    document.documentElement.classList.toggle('dark', saved === 'dark');

    // Initialize GoogleAuth (native Android/iOS only)
    if (Capacitor.isNativePlatform()) {
      try {
        GoogleAuth.initialize({
          clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '733914668823-fl25s7gs82c51qu9vgq4prrp2h32qmd0.apps.googleusercontent.com',
          scopes: ['profile', 'email'],
          grantOfflineAccess: true,
        });
      } catch (err) {
        console.error('Failed to initialize Google Auth', err);
      }
    }
  }, []);

  // Auto-clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Clear error when user starts typing
  const handleInputChange = (setter: (val: string) => void, value: string) => {
    setter(value);
    if (error) setError(null);
  };

  // Clear error when switching views
  useEffect(() => {
    setError(null);
  }, [isSignUp, forgotStep, signupOtpStep]);

  const isValidEmail = (em: string) => {
    return em.includes('@') && em.includes('.');
  };

  /**
   * Helper to fetch with a simple retry mechanism
   * Useful for Railway cold starts (server sleep)
   */
  const fetchWithRetry = async (url: string, options: RequestInit, retries = 3): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (err: any) {
      clearTimeout(timeoutId);
      
      if (err.name === 'AbortError') {
        throw new Error('Server is taking too long to wake up. Please try again in a few seconds.');
      }

      if (retries > 0) {
        console.warn(`Fetch failed, retrying... (${retries} attempts left)`);
        await new Promise(res => setTimeout(res, 2000));
        return fetchWithRetry(url, options, retries - 1);
      }
      throw err;
    }
  };

  // ── Normal Sign In / Sign Up ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (isSignUp) {
      if (!name) { setError('Please enter your name'); return; }
      if (password.trim() !== confirmPassword.trim()) { 
        setError('Passwords do not match'); 
        return; 
      }
    }

    setLoading(true);
    setError(null);
    try {
      const endpoint = isSignUp ? 'signup' : 'login';
      const body = isSignUp ? { name, email, password } : { email, password };

      const res = await fetchWithRetry(`${API_BASE_URL}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.msg || 'Something went wrong');
        throw new Error(data.msg || 'Something went wrong');
      }

      if (isSignUp) {
        // After signup, show OTP verification
        toast.success('Account created! Check your email for the verification code.');
        setSignupOtpStep(true);
      } else {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        toast.success('Welcome back!');
        onSignIn(data.user.email);
      }
    } catch (err: any) {
      // toast.error(err.message); // We use the banner now, but toast can also stay for variety
    } finally {
      setLoading(false);
    }
  };

  // ── Verify Signup OTP ──
  const handleVerifySignupOtp = async () => {
    if (!signupOtp || signupOtp.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithRetry(`${API_BASE_URL}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: signupOtp })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.msg || 'Verification failed');
        throw new Error(data.msg || 'Verification failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      toast.success('Email verified! Welcome!');
      onSignIn(data.user.email);
    } catch (err: any) {
      // setError handled in block
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password: Send OTP ──
  const handleForgotSendOtp = async () => {
    if (!email) { toast.error('Please enter your email first'); return; }
    if (!isValidEmail(email)) { toast.error('Please enter a valid email address'); return; }

    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithRetry(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.msg || 'Something went wrong');
        throw new Error(data.msg || 'Something went wrong');
      }
      toast.success('OTP sent! Check your email (or server console).');
      setForgotStep('otp');
    } catch (err: any) {
      // setError handled
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password: Reset ──
  const handleVerifyOtpAndReset = async () => {
    if (!otp || otp.length !== 6) { setError('Please enter the 6-digit OTP'); return; }
    if (!newPassword) { setError('Please enter your new password'); return; }
    if (newPassword.trim() !== confirmNewPassword.trim()) { setError('Passwords do not match'); return; }

    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithRetry(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.msg || 'Something went wrong');
        throw new Error(data.msg || 'Something went wrong');
      }
      toast.success('Password reset successful! Please log in.');
      resetForgotFlow();
    } catch (err: any) {
      // setError handled
    } finally {
      setLoading(false);
    }
  };

  const resetForgotFlow = () => {
    setForgotStep('idle');
    setOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  // ── Apple Sign In ──
  const handleAppleResponse = async (response: any) => {
    setLoading(true);
    try {
      const res = await fetchWithRetry(`${API_BASE_URL}/api/auth/apple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_token: response.detail.id_token,
          code: response.detail.code,
          user: response.detail.user // Only provided on first sign-in
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Apple authentication failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      toast.success('Signed in with Apple!');
      onSignIn(data.user.email);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initialize Apple ID
    const appleClientId = import.meta.env.VITE_APPLE_CLIENT_ID;
    if (!appleClientId || appleClientId === 'YOUR_APPLE_CLIENT_ID_HERE') return;

    if ((window as any).AppleID) {
      (window as any).AppleID.auth.init({
        clientId: appleClientId,
        scope: 'name email',
        redirectURI: window.location.origin,
        usePopup: true
      });
    }

    // Listen for Apple response
    document.addEventListener('AppleIDSignInOnSuccess', handleAppleResponse);
    document.addEventListener('AppleIDSignInOnFailure', (error: any) => {
      console.error('Apple sign-in error:', error);
      toast.error('Apple sign-in failed');
    });

    return () => {
      document.removeEventListener('AppleIDSignInOnSuccess', handleAppleResponse);
    };
  }, []);

  // ── Google Sign In ──
  const handleGoogleResponse = async (response: any) => {
    setLoading(true);
    try {
      const res = await fetchWithRetry(`${API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Google authentication failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      toast.success('Signed in with Google!');
      onSignIn(data.user.email);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initialize Google Identity Services
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') return;

    const initGoogle = () => {
      if ((window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleResponse,
        });
      }
    };

    // GIS script might load after component mounts
    if ((window as any).google?.accounts?.id) {
      initGoogle();
    } else {
      const interval = setInterval(() => {
        if ((window as any).google?.accounts?.id) {
          initGoogle();
          clearInterval(interval);
        }
      }, 200);
      // Cleanup after 5 seconds
      setTimeout(() => clearInterval(interval), 5000);
    }
  }, []);

  const handleAppleClick = async () => {
    const clientId = import.meta.env.VITE_APPLE_CLIENT_ID;
    if (!clientId || clientId === 'YOUR_APPLE_CLIENT_ID_HERE') {
      toast.error('Apple Client ID not configured. Please add it to the .env file.');
      return;
    }

    if ((window as any).AppleID) {
      try {
        await (window as any).AppleID.auth.signIn();
      } catch (error) {
        console.error(error);
      }
    } else {
      toast.error('Apple Sign-In is still loading. Try again in a moment.');
    }
  };

  const handleGoogleClick = async () => {
    const isWeb = Capacitor.getPlatform() === 'web';

    if (!isWeb) {
      // Native Google Sign In
      setLoading(true);
      try {
        const googleUser = await GoogleAuth.signIn();
        const res = await fetchWithRetry(`${API_BASE_URL}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: googleUser.authentication.idToken })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.msg || 'Google authentication failed');

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        toast.success('Signed in with Google!');
        onSignIn(data.user.email);
      } catch (err: any) {
        console.error('Google Native Error:', err);
        toast.error(err.message || 'Google sign-in failed');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Web Google Sign In (Original flow)
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
      toast.error('Google Client ID not configured. Please add it to the .env file.');
      return;
    }

    if ((window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          toast.info('Please allow the Google popup or check your browser settings.');
        }
      });
    } else {
      toast.error('Google Sign-In is still loading. Try again in a moment.');
    }
  };

  // ── Shared Input Styles ──
  const inputClass = "pl-10 bg-white dark:bg-[#292929] border-gray-200 dark:border-[#3a3a3a] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-[#e0b596] focus:border-[#e0b596] transition-colors";
  const inputClassWithEye = "pl-10 pr-10 bg-white dark:bg-[#292929] border-gray-200 dark:border-[#3a3a3a] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-[#e0b596] focus:border-[#e0b596] transition-colors";

  // ── Determine current view title ──
  const getTitle = () => {
    if (signupOtpStep) return 'Verify Your Email';
    if (forgotStep === 'email') return 'Forgot Password';
    if (forgotStep === 'otp') return 'Reset Password';
    if (isSignUp) return 'Create Account';
    return 'Welcome Back';
  };

  const getSubtitle = () => {
    if (signupOtpStep) return `We sent a 6-digit code to ${email}`;
    if (forgotStep === 'email') return 'Enter your email to receive a reset code';
    if (forgotStep === 'otp') return `Enter the code sent to ${email}`;
    if (isSignUp) return 'Get started with RemindMe';
    return 'Sign in to your account';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#1f1f1f] p-4 transition-colors duration-300">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#e0b596]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#e0b596]/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/90 dark:bg-[#1b1b1b]/95 backdrop-blur-xl rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-black/30 p-8 border border-gray-200/80 dark:border-[#292929]">

          {/* Error Alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-medium"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="relative inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-[#e0b596] to-[#c69472] rounded-xl mb-4 shadow-[0_8px_30px_rgba(224,181,150,0.4)] overflow-hidden"
            >
              {/* Glossy shine overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/10 to-transparent rounded-xl pointer-events-none" />
              <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/30 pointer-events-none" />
              <Bell className="w-7 h-7 text-white relative z-10 drop-shadow-sm" />
            </motion.div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              {getTitle()}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {getSubtitle()}
            </p>
          </div>

          <AnimatePresence mode="wait">

            {/* ═══════ SIGNUP OTP VERIFICATION ═══════ */}
            {signupOtpStep && (
              <motion.div key="signup-otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div>
                  <Label htmlFor="signup-otp" className="text-gray-700 dark:text-gray-300">Verification Code</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      id="signup-otp"
                      type="text"
                      placeholder="123456"
                      value={signupOtp}
                      onChange={(e) => setSignupOtp(e.target.value)}
                      className={`${inputClass} tracking-[0.3em] text-center text-lg font-semibold`}
                      maxLength={6}
                    />
                  </div>
                </div>
                <Button onClick={handleVerifySignupOtp} disabled={loading} className="relative w-full bg-gradient-to-b from-[#e0b596] to-[#c69472] hover:brightness-110 text-[#1f1f1f] font-semibold shadow-[0_8px_24px_rgba(224,181,150,0.35),inset_0_1px_0_rgba(255,255,255,0.5)] border-0 transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/5 to-transparent rounded-md pointer-events-none" />
                  <span className="relative z-10">{loading ? 'Verifying...' : 'Verify & Continue'}</span>
                </Button>
                <Button variant="ghost" onClick={() => setSignupOtpStep(false)} className="w-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              </motion.div>
            )}

            {/* ═══════ FORGOT PASSWORD: EMAIL ═══════ */}
            {!signupOtpStep && forgotStep === 'email' && (
              <motion.div key="forgot-email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div>
                  <Label htmlFor="forgot-email" className="text-gray-700 dark:text-gray-300">Email Address</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input id="forgot-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                  </div>
                </div>
                <Button onClick={handleForgotSendOtp} disabled={loading} className="relative w-full bg-gradient-to-b from-[#e0b596] to-[#c69472] hover:brightness-110 text-[#1f1f1f] font-semibold shadow-[0_8px_24px_rgba(224,181,150,0.35),inset_0_1px_0_rgba(255,255,255,0.5)] border-0 transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/5 to-transparent rounded-md pointer-events-none" />
                  <span className="relative z-10">{loading ? 'Sending...' : 'Send Reset Code'}</span>
                </Button>
                <Button variant="ghost" onClick={resetForgotFlow} className="w-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sign In
                </Button>
              </motion.div>
            )}

            {/* ═══════ FORGOT PASSWORD: OTP + NEW PASS ═══════ */}
            {!signupOtpStep && forgotStep === 'otp' && (
              <motion.div key="forgot-otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div>
                  <Label htmlFor="reset-otp" className="text-gray-700 dark:text-gray-300">Reset Code</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input id="reset-otp" type="text" placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value)} className={`${inputClass} tracking-[0.3em] text-center text-lg font-semibold`} maxLength={6} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="new-pass" className="text-gray-700 dark:text-gray-300">New Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input id="new-pass" type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirm-new-pass" className="text-gray-700 dark:text-gray-300">Confirm New Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input id="confirm-new-pass" type="password" placeholder="••••••••" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className={inputClass} />
                  </div>
                </div>
                <Button onClick={handleVerifyOtpAndReset} disabled={loading} className="relative w-full bg-gradient-to-b from-[#e0b596] to-[#c69472] hover:brightness-110 text-[#1f1f1f] font-semibold shadow-[0_8px_24px_rgba(224,181,150,0.35),inset_0_1px_0_rgba(255,255,255,0.5)] border-0 transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/5 to-transparent rounded-md pointer-events-none" />
                  <span className="relative z-10">{loading ? 'Resetting...' : 'Reset Password'}</span>
                </Button>
                <Button variant="ghost" onClick={resetForgotFlow} className="w-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sign In
                </Button>
              </motion.div>
            )}

            {/* ═══════ MAIN SIGN IN / SIGN UP ═══════ */}
            {!signupOtpStep && forgotStep === 'idle' && (
              <motion.div key="main-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">

                {/* Google Sign In */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Google Sign In */}
                  <button
                    onClick={handleGoogleClick}
                    className="relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-[#292929] hover:bg-gray-50 dark:hover:bg-[#333] text-gray-700 dark:text-gray-200 font-medium text-sm transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] overflow-hidden shadow-sm"
                  >
                    {/* Glossy shine */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-transparent dark:from-white/5 pointer-events-none" />
                    <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/50 dark:ring-white/10 pointer-events-none" />
                    <svg className="w-5 h-5 relative z-10" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    <span className="relative z-10">Google</span>
                  </button>

                  {/* Apple Sign In */}
                  <button
                    onClick={handleAppleClick}
                    className="relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#3a3a3a] bg-white dark:bg-[#292929] hover:bg-gray-50 dark:hover:bg-[#333] text-gray-700 dark:text-gray-200 font-medium text-sm transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] overflow-hidden shadow-sm"
                  >
                    {/* Glossy shine */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-transparent dark:from-white/5 pointer-events-none" />
                    <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/50 dark:ring-white/10 pointer-events-none" />
                    <svg className="w-5 h-5 relative z-10 fill-current" viewBox="0 0 384 512">
                      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                    </svg>
                    <span className="relative z-10">Apple</span>
                  </button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200 dark:bg-[#3a3a3a]" />
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase">or</span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-[#3a3a3a]" />
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {isSignUp && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.2 }}>
                      <Label htmlFor="name" className="text-gray-700 dark:text-gray-300">Full Name</Label>
                      <div className="relative mt-1">
                        <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <Input id="name" type="text" placeholder="John Doe" value={name} onChange={(e) => handleInputChange(setName, e.target.value)} className={inputClass} />
                      </div>
                    </motion.div>
                  )}

                  <div>
                    <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">Email Address</Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input id="email" type="email" placeholder="your@email.com" value={email} onChange={(e) => handleInputChange(setEmail, e.target.value)} className={inputClass} />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">Password</Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => handleInputChange(setPassword, e.target.value)}
                        className={inputClassWithEye}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none">
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {isSignUp && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.2 }}>
                      <Label htmlFor="confirmPassword" className="text-gray-700 dark:text-gray-300">Confirm Password</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => handleInputChange(setConfirmPassword, e.target.value)}
                          className={inputClassWithEye}
                        />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none">
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {!isSignUp && (
                    <div className="flex justify-end">
                      <button type="button" onClick={() => setForgotStep('email')} className="text-sm font-medium text-[#e0b596] hover:text-[#c69472] transition-colors">
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="relative w-full bg-gradient-to-b from-[#e0b596] to-[#c69472] hover:brightness-110 text-[#1f1f1f] font-semibold shadow-[0_8px_24px_rgba(224,181,150,0.35),inset_0_1px_0_rgba(255,255,255,0.5)] border-0 border-t border-white/40 transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/5 to-transparent rounded-md pointer-events-none" />
                    <span className="relative z-10">{loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}</span>
                  </Button>
                </form>

                {/* Toggle Sign In / Sign Up */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError(null);
                    }}
                    className="group text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all py-2 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
                  >
                    {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                    <span className="text-[#e0b596] font-bold group-hover:text-[#c69472] underline decoration-2 underline-offset-4 decoration-[#e0b596]/30 group-hover:decoration-[#c69472]">
                      {isSignUp ? 'Sign In' : 'Sign Up'}
                    </span>
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
          RemindMe &copy; {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  );
}
