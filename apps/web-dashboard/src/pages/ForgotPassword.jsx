import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Terminal } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

function ForgotPassword() {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        email: location.state?.email || '',
        otp: '',
        newPassword: '',
        confirmPassword: '',
    });

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            navigate('/dashboard', { replace: true });
        }
    }, [authLoading, isAuthenticated, navigate]);

    if (authLoading) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (!formData.email) {
            toast.error('Email is required.');
            return;
        }

        setIsSubmitting(true);
        const loadingToast = toast.loading('Sending reset code...');

        try {
            const response = await api.post('/api/auth/forgot-password', {
                email: formData.email,
            });

            toast.dismiss(loadingToast);
            toast.success(response.data?.message || 'If this email exists, a reset code has been sent.');
            setStep(2);
        } catch (err) {
            toast.dismiss(loadingToast);
            const data = err.response?.data;
            let message = 'Failed to send reset code.';

            if (typeof data?.error === 'string') {
                message = data.error;
            } else if (Array.isArray(data?.error)) {
                message = data.error[0]?.message || message;
            }

            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();

        if (!formData.otp || !formData.newPassword || !formData.confirmPassword) {
            toast.error('OTP and both password fields are required.');
            return;
        }
        if (formData.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters.');
            return;
        }
        if (formData.newPassword !== formData.confirmPassword) {
            toast.error('Passwords do not match.');
            return;
        }

        setIsSubmitting(true);
        const loadingToast = toast.loading('Resetting password...');

        try {
            const response = await api.post('/api/auth/reset-password', {
                email: formData.email,
                otp: formData.otp,
                newPassword: formData.newPassword,
            });

            toast.dismiss(loadingToast);
            toast.success(response.data?.message || 'Password reset successfully.');
            navigate('/login', {
                replace: true,
                state: { email: formData.email },
            });
        } catch (err) {
            toast.dismiss(loadingToast);
            const data = err.response?.data;
            let message = 'Password reset failed.';

            if (typeof data?.error === 'string') {
                message = data.error;
            } else if (Array.isArray(data?.error)) {
                message = data.error[0]?.message || message;
            }

            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            padding: '1rem',
            background: 'radial-gradient(circle at top center, #1a1a1a 0%, #000000 100%)'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '460px', padding: '2.5rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, var(--color-primary), #059669)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem auto',
                        boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)'
                    }}>
                        <Terminal size={28} color="#000" />
                    </div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
                        Reset Your Password
                    </h2>
                    <p style={{ color: 'var(--color-text-muted)' }}>
                        {step === 1
                            ? 'We will email you a one-time reset code.'
                            : `Enter the reset code sent to ${formData.email}`}
                    </p>
                </div>

                {step === 1 ? (
                    <form onSubmit={handleSendOtp}>
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label className="form-label" style={{ fontSize: '0.9rem' }}>Email Address</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="name@example.com"
                                required
                                style={{
                                    padding: '12px',
                                    background: 'var(--color-bg-input)',
                                    border: '1px solid var(--color-border)',
                                    color: '#fff'
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{
                                width: '100%',
                                padding: '12px',
                                fontSize: '1rem',
                                fontWeight: 600,
                                justifyContent: 'center'
                            }}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Sending...' : 'Send Reset Code'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword}>
                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label className="form-label" style={{ fontSize: '0.9rem' }}>Reset Code</label>
                            <input
                                type="text"
                                name="otp"
                                value={formData.otp}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="Enter 6-digit code"
                                required
                                maxLength={6}
                                style={{
                                    padding: '12px',
                                    background: 'var(--color-bg-input)',
                                    border: '1px solid var(--color-border)',
                                    color: '#fff',
                                    letterSpacing: '0.18em'
                                }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label className="form-label" style={{ fontSize: '0.9rem' }}>New Password</label>
                            <input
                                type="password"
                                name="newPassword"
                                value={formData.newPassword}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="Min. 6 characters"
                                required
                                minLength={6}
                                style={{
                                    padding: '12px',
                                    background: 'var(--color-bg-input)',
                                    border: '1px solid var(--color-border)',
                                    color: '#fff'
                                }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label className="form-label" style={{ fontSize: '0.9rem' }}>Confirm New Password</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="Re-enter your password"
                                required
                                minLength={6}
                                style={{
                                    padding: '12px',
                                    background: 'var(--color-bg-input)',
                                    border: '1px solid var(--color-border)',
                                    color: '#fff'
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{
                                width: '100%',
                                padding: '12px',
                                fontSize: '1rem',
                                fontWeight: 600,
                                justifyContent: 'center',
                                marginBottom: '0.75rem'
                            }}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Resetting...' : 'Reset Password'}
                        </button>

                        <button
                            type="button"
                            className="btn"
                            style={{
                                width: '100%',
                                padding: '12px',
                                fontSize: '0.95rem',
                                fontWeight: 500,
                                justifyContent: 'center',
                                background: 'transparent',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-muted)'
                            }}
                            disabled={isSubmitting}
                            onClick={handleSendOtp}
                        >
                            Resend Code
                        </button>
                    </form>
                )}

                <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
                        Remembered your password? <Link to="/login" state={{ email: formData.email }} style={{ color: 'var(--color-primary)', fontWeight: 500, textDecoration: 'none' }}>Back to login</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default ForgotPassword;
