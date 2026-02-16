// Main exports for the auth module
export { default as ActivateAccount } from './components/ActivateAccount';
export { default as AuthBranding } from './components/AuthBranding';
export { default as AuthEventRedirect } from './components/AuthEventRedirect';
export { AuthProvider, useAuth } from './components/AuthProvider';
export { default as ForgotPassword } from './components/ForgotPassword';
export { default as LoginForm } from './components/LoginForm';
export { default as ResetPassword } from './components/ResetPassword';
export { default as SignUpForm } from './components/SignUpForm';

// Hooks
export { createUseAuth } from './hooks/useAuth';

// Types
export * from './types';
