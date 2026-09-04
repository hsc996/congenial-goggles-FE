import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import MagneticButton from '../components/MagneticButton';
import { authAPI } from '../api/auth';
import { useUserAuthContext } from '../contexts/AuthContext/AuthContext';
import { useNotificationService } from '../components/Notifications/notificationService';

const inputClass = "flex h-10 w-full rounded-lg border border-zinc-200 bg-white/80 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 transition-all hover:border-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:border-brand-300";

function RegisterPage() {
    const { setUserJwt } = useUserAuthContext();
    const navigate = useNavigate();
    const { sendErrorNotification } = useNotificationService();
    const [searchParams] = useSearchParams();

    const inviteParam = searchParams.get('invite') ?? '';
    const emailParam  = searchParams.get('email')  ?? '';
    const fromInvite  = !!inviteParam;

    const [loading, setLoading] = useState(false);
    const [inviteValid, setInviteValid] = useState(null); // null = checking, true/false = result
    const [mode, setMode] = useState(fromInvite ? 'join' : 'create');

    useEffect(() => {
        if (!fromInvite) { setInviteValid(true); return; }
        authAPI.validateInvite(inviteParam)
            .then((res) => setInviteValid(res.valid))
            .catch(() => setInviteValid(false));
    }, [fromInvite, inviteParam]);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: emailParam,
        password: '',
        confirmPassword: '',
        companyName: '',
        inviteCode: inviteParam,
    });

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            sendErrorNotification('Passwords do not match.');
            return;
        }

        if (mode === 'create' && !formData.companyName.trim()) {
            sendErrorNotification('Please enter a company name.');
            return;
        }
        if (mode === 'join' && !formData.inviteCode.trim()) {
            sendErrorNotification('Please enter an invite code.');
            return;
        }

        setLoading(true);
        try {
            const result = await authAPI.signup(
                formData.firstName,
                formData.lastName,
                formData.email,
                formData.password,
                mode === 'create'
                    ? { companyName: formData.companyName.trim() }
                    : { inviteCode: formData.inviteCode.trim() },
            );
            setUserJwt(result.token);
            localStorage.setItem('refreshToken', result.refreshToken);
            navigate('/dashboard');
        } catch (error) {
            sendErrorNotification(error.response?.data?.message || 'Failed to create account.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#FFFDF2] p-4">

            {/* Gradient orbs */}
            <motion.div
                className="pointer-events-none absolute top-[15%] left-[20%] h-80 w-80 rounded-full bg-brand-100 blur-2xl"
                animate={{ x: [0, 24, 0], y: [0, 32, 0] }}
                transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
                style={{ opacity: 0.9 }}
            />
            <motion.div
                className="pointer-events-none absolute bottom-[15%] right-[20%] h-72 w-72 rounded-full bg-brand-200 blur-2xl"
                animate={{ x: [0, -20, 0], y: [0, -24, 0] }}
                transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
                style={{ opacity: 0.8 }}
            />
            <motion.div
                className="pointer-events-none absolute top-[40%] right-[25%] h-60 w-60 rounded-full bg-amber-100 blur-2xl"
                animate={{ x: [0, 16, 0], y: [0, -20, 0] }}
                transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
                style={{ opacity: 0.7 }}
            />

            {/* Glass card */}
            <motion.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 100, damping: 22 }}
                className="relative w-full max-w-md rounded-2xl border border-brand-200/50 bg-brand-50/40 px-8 py-10 shadow-xl shadow-black/[0.06] backdrop-blur-2xl"
            >
                {inviteValid === false ? (
                    <div className="flex flex-col items-center gap-4 py-6 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                            <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-zinc-900">This invite link has expired</h2>
                            <p className="mt-1 text-sm text-zinc-500">Ask your admin to send a new invite.</p>
                        </div>
                        <Link to="/signin" className="text-sm font-medium text-brand-600 hover:underline">
                            Back to sign in
                        </Link>
                    </div>
                ) : (
                <>

                <div className="mb-7 text-center">
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                        {fromInvite ? 'Join with invite code' : 'Create an account'}
                    </h1>
                    <p className="mt-1 text-sm text-zinc-500">
                        {fromInvite ? 'Complete your details to finish setting up your account.' : 'Get started with CareSync today'}
                    </p>
                </div>

                {/* Mode toggle — hidden when arriving from an invite link */}
                {!fromInvite && (
                    <div className="mb-5 flex rounded-lg bg-zinc-100 p-1 text-sm font-medium">
                        <button
                            type="button"
                            onClick={() => setMode('create')}
                            className={`flex-1 rounded-md py-1.5 transition-colors ${mode === 'create' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                        >
                            Create company
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('join')}
                            className={`flex-1 rounded-md py-1.5 transition-colors ${mode === 'join' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                        >
                            Join with invite code
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label htmlFor="firstName" className="text-sm font-medium text-zinc-700">First name</label>
                            <input
                                type="text"
                                id="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                required
                                placeholder="First name"
                                className={inputClass}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="lastName" className="text-sm font-medium text-zinc-700">Last name</label>
                            <input
                                type="text"
                                id="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                required
                                placeholder="Last name"
                                className={inputClass}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="email" className="text-sm font-medium text-zinc-700">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            readOnly={fromInvite && !!emailParam}
                            placeholder="Enter email address"
                            className={`${inputClass} ${fromInvite && emailParam ? 'cursor-not-allowed bg-zinc-100 text-zinc-500' : ''}`}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="password" className="text-sm font-medium text-zinc-700">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            placeholder="Enter password"
                            className={inputClass}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-700">Confirm password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                            placeholder="Confirm password"
                            className={inputClass}
                        />
                    </div>

                    {/* Company name or invite code */}
                    <AnimatePresence mode="wait">
                        {mode === 'create' ? (
                            <motion.div
                                key="companyName"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.18 }}
                                className="space-y-1.5 overflow-hidden"
                            >
                                <label htmlFor="companyName" className="text-sm font-medium text-zinc-700">Company name</label>
                                <input
                                    type="text"
                                    id="companyName"
                                    value={formData.companyName}
                                    onChange={handleChange}
                                    required={mode === 'create'}
                                    placeholder="e.g. Sunrise Care"
                                    className={inputClass}
                                />
                                <p className="text-xs text-zinc-400">You'll be the Admin and can invite others with a generated code.</p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="inviteCode"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.18 }}
                                className="space-y-1.5 overflow-hidden"
                            >
                                <label htmlFor="inviteCode" className="text-sm font-medium text-zinc-700">Invite code</label>
                                <input
                                    type="text"
                                    id="inviteCode"
                                    value={formData.inviteCode}
                                    onChange={handleChange}
                                    required={mode === 'join'}
                                    placeholder="Enter your invite code"
                                    className={inputClass}
                                />
                                <p className="text-xs text-zinc-400">Ask your company Admin for the invite code.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <MagneticButton
                        type="submit"
                        disabled={loading}
                        className="inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2 h-10 text-sm font-medium text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                    >
                        {loading ? 'Creating account…' : 'Sign Up'}
                    </MagneticButton>
                </form>

                <p className="mt-6 text-center text-sm text-zinc-500">
                    Already have an account?{' '}
                    <Link to="/signin" className="font-medium text-brand-600 hover:underline">
                        Sign in
                    </Link>
                </p>
                </>
                )}
            </motion.div>
        </div>
    );
}

export default RegisterPage;
