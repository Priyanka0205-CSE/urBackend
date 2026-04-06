import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Terminal } from 'lucide-react';

function Login() {
    const location = useLocation();
    const [formData, setFormData] = useState({ email: location.state?.email || '', password: '' });
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();
    const { login, isAuthenticated, isLoading: authLoading } = useAuth();

    // If already authenticated, redirect to dashboard
    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, authLoading, navigate]);

    if (authLoading) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.email || !formData.password) {
            toast.error('Email and password are required!');
            return;
        }

        setIsLoading(true);
        const loadingToast = toast.loading('Logging in...');

        try {
            const response = await api.post('/api/auth/login', formData);
            
            if (response.data.success) {
                login(response.data.user);
                toast.dismiss(loadingToast);
                toast.success("Welcome back!");
                navigate('/dashboard');
            }
        } catch (err) {
            console.error(err);
            toast.dismiss(loadingToast);
            const data = err.response?.data;
            let errorMessage = 'Login failed. Check your credentials.';

            if (data?.error) {
                if (typeof data.error === 'string') {
                    errorMessage = data.error;
                } else if (Array.isArray(data.error)) {
                    errorMessage = data.error[0]?.message || 'Validation failed';
                }
            }

            toast.error(errorMessage);
            setIsLoading(false);
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
            <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem' }}>
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
                        Welcome Back
                    </h2>
                    <p style={{ color: 'var(--color-text-muted)' }}>
                        Sign in to your dashboard
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                        <label className="form-label" style={{ fontSize: '0.9rem' }}>Email Address</label>
                        <input
                            type="email"
                            name="email"
                            className="input-field"
                            placeholder="name@example.com"
                            onChange={handleChange}
                            required
                            style={{
                                padding: '12px',
                                background: 'var(--color-bg-input)',
                                border: '1px solid var(--color-border)',
                                color: '#fff'
                            }}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <label className="form-label" style={{ marginBottom: 0, fontSize: '0.9rem' }}>Password</label>
                            <Link
                                to="/forgot-password"
                                state={{ email: formData.email }}
                                style={{ color: 'var(--color-primary)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 500 }}
                            >
                                Forgot password?
                            </Link>
                        </div>
                        <input
                            type="password"
                            name="password"
                            className="input-field"
                            placeholder="••••••••"
                            onChange={handleChange}
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
                            justifyContent: 'center',
                            marginTop: '0.5rem'
                        }}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Authenticating...' : 'Sign In'}
                    </button>
                </form>

                <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
                        Don't have an account? <Link to="/signup" style={{ color: 'var(--color-primary)', fontWeight: 500, textDecoration: 'none' }}>Create Account</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Login;
