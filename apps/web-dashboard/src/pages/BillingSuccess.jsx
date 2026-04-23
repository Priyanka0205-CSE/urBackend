import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Zap } from 'lucide-react';
import { usePlan } from '../context/PlanContext';

export default function BillingSuccess() {
    const navigate = useNavigate();
    const { fetchPlanData } = usePlan();

    useEffect(() => {
        // Refresh plan data to reflect new Pro status
        fetchPlanData();

        // Redirect to dashboard after 4 seconds
        const timer = setTimeout(() => navigate('/dashboard'), 4000);
        return () => clearTimeout(timer);
    }, [fetchPlanData, navigate]);

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'var(--color-bg)', gap: '1.5rem', padding: '2rem', textAlign: 'center'
        }}>
            <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #7B61FF22, #00C2FF22)',
                border: '2px solid #7B61FF55',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <CheckCircle size={40} color="#7B61FF" />
            </div>

            <div>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>
                    Welcome to Pro! 🎉
                </h1>
                <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem', fontSize: '1rem' }}>
                    Your account has been upgraded. Enjoy unlimited power.
                </p>
            </div>

            <div style={{
                display: 'flex', flexDirection: 'column', gap: '8px',
                background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                borderRadius: '12px', padding: '1.25rem', maxWidth: '360px', width: '100%'
            }}>
                {['Unlimited collections', 'BYOK enabled', 'Custom email templates', '50,000 requests/day'].map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                        <Zap size={14} color="#7B61FF" />
                        {f}
                    </div>
                ))}
            </div>

            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                Redirecting you to dashboard in a moment...
            </p>
        </div>
    );
}
