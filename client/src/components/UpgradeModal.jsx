import { useState } from 'react';
import { api } from '../lib/api';
import './UpgradeModal.css';

const PLANS = [
  { id: 'starter', name: 'Starter', yearly: 9.99,  monthly: 12.99, hours: 4 },
  { id: 'pro',     name: 'Pro',     yearly: 19.99, monthly: 23.99, hours: 10, popular: true },
  { id: 'max',     name: 'Max',     yearly: 39.99, monthly: 44.99, hours: 20 },
];

export default function UpgradeModal({ onClose }) {
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState('');
  const [billing, setBilling] = useState('yearly');

  const handleUpgrade = async (plan) => {
    setLoading(plan);
    setError('');
    try {
      const { url } = await api.post('/stripe/create-checkout', { plan, billing });
      window.location.href = url;
    } catch (err) {
      setError('Payment failed. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h2>Keep the momentum going</h2>
        <p className="modal-sub">You're making real progress.</p>

        <div className="billing-toggle">
          <button
            type="button"
            className={billing === 'yearly' ? 'active' : ''}
            onClick={e => { e.stopPropagation(); setBilling('yearly'); }}
          >
            Yearly <span className="save-badge">Save 23%</span>
          </button>
          <button
            type="button"
            className={billing === 'monthly' ? 'active' : ''}
            onClick={e => { e.stopPropagation(); setBilling('monthly'); }}
          >
            Monthly
          </button>
        </div>

        <div className="plans">
          {PLANS.map(plan => (
            <button
              key={plan.id}
              type="button"
              className={`plan-row ${plan.popular ? 'plan-row--popular' : ''}`}
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleUpgrade(plan.id); }}
              disabled={!!loading}
            >
              <div className="plan-info">
                <span className="plan-name">{plan.name}</span>
                {plan.popular && <span className="popular-tag">★ Most Popular</span>}
                <span className="plan-hours">{plan.hours} hours / month</span>
                {billing === 'yearly' && <span className="plan-billed">billed annually</span>}
              </div>
              <span className="plan-price">
                ${billing === 'yearly' ? plan.yearly : plan.monthly}
                <span className="plan-period">/mo</span>
              </span>
              {loading === plan.id && <span className="plan-loading">...</span>}
            </button>
          ))}
        </div>

        {error && <p className="modal-error">{error}</p>}

        <button className="btn-secondary" onClick={onClose}>
          Maybe later
        </button>
      </div>
    </div>
  );
}
