import { useAuth } from '../context/AuthContext';
import { VERIFICATION_STATUS } from '../config/constants';
import './VerificationBanner.css';

export default function VerificationBanner() {
  const { user } = useAuth();

  if (!user || user.verification_status === VERIFICATION_STATUS.APPROVED) return null;

  const statusConfig = {
    [VERIFICATION_STATUS.PENDING_VERIFICATION]: {
      className: 'banner-warning',
      icon: '📋',
      title: 'Verification Required',
      message: 'Please submit your verification documents to start using Annayog.',
      action: { label: 'Submit Documents', href: '/verification/submit' },
    },
    [VERIFICATION_STATUS.PENDING]: {
      className: 'banner-info',
      icon: '⏳',
      title: 'Verification Pending',
      message: 'Your documents are being reviewed. This usually takes 24-48 hours.',
      action: null,
    },
    [VERIFICATION_STATUS.REJECTED]: {
      className: 'banner-error',
      icon: '❌',
      title: 'Verification Rejected',
      message: 'Your verification was rejected. Please review the feedback and resubmit.',
      action: { label: 'Resubmit', href: '/verification/submit' },
    },
    [VERIFICATION_STATUS.RESUBMIT_REQUIRED]: {
      className: 'banner-warning',
      icon: '🔄',
      title: 'Resubmission Required',
      message: 'Additional information is needed for your verification.',
      action: { label: 'Update Documents', href: '/verification/submit' },
    },
  };

  const config = statusConfig[user.verification_status];
  if (!config) return null;

  return (
    <div className={`verification-banner ${config.className}`}>
      <span className="banner-icon">{config.icon}</span>
      <div className="banner-content">
        <strong>{config.title}</strong>
        <p>{config.message}</p>
      </div>
      {config.action && (
        <a href={config.action.href} className="banner-action">
          {config.action.label}
        </a>
      )}
    </div>
  );
}
