import React from 'react';
import raynLogo from '@/assets/rayn-logo.png';

interface AuthBrandingProps {
  /** Logo size - 'large' (h-20) or 'small' (h-12). Default: 'large' */
  size?: 'large' | 'small';
  /** Additional className for the container */
  className?: string;
}

/**
 * Shared branding component for authentication pages.
 * Displays RAYN Secure logo, title, and tagline.
 */
const AuthBranding: React.FC<AuthBrandingProps> = ({ size = 'large', className = '' }) => {
  const logoSize = size === 'large' ? 'h-20' : 'h-12';
  const headingSize = size === 'large' ? 'text-3xl' : 'text-xl';
  const textSize = size === 'large' ? 'mt-2' : 'text-sm';
  
  return (
    <div className={`text-center ${className}`}>
      <img 
        src={raynLogo} 
        alt="RAYN Secure Logo" 
        className={`mx-auto ${logoSize} w-auto mb-4`}
      />
      <h1 className={`${headingSize} font-bold text-learning-primary`}>RAYN Secure</h1>
      <p className={`text-muted-foreground ${textSize}`}>Get Secure, Stay Secure!</p>
    </div>
  );
};

export default AuthBranding;

