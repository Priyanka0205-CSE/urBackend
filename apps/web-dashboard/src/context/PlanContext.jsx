import { createContext, useState, useContext, useCallback, useEffect } from 'react';
import api from '../utils/api';

const PlanContext = createContext(null);

// Module-level ref so api.js interceptor can trigger modal without circular imports
let _openUpgradeModalFn = null;

// eslint-disable-next-line react-refresh/only-export-components
export const triggerUpgradeModal = () => {
    if (_openUpgradeModalFn) _openUpgradeModalFn();
};

export const PlanProvider = ({ children }) => {
    const [planData, setPlanData] = useState(null);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

    const openUpgradeModal = useCallback(() => setIsUpgradeModalOpen(true), []);
    const closeUpgradeModal = useCallback(() => setIsUpgradeModalOpen(false), []);

    // Register in effect (not during render) to satisfy react-hooks/globals rule
    useEffect(() => {
        _openUpgradeModalFn = openUpgradeModal;
        return () => { _openUpgradeModalFn = null; };
    }, [openUpgradeModal]);

    const fetchPlanData = useCallback(async () => {
        try {
            const res = await api.get('/api/analytics/stats');
            if (res.data?.success) {
                setPlanData(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch plan data:', err);
        }
    }, []);

    const value = {
        planData,
        fetchPlanData,
        isUpgradeModalOpen,
        openUpgradeModal,
        closeUpgradeModal,
    };

    return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePlan = () => useContext(PlanContext);
