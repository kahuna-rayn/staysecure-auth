import React from 'react';
import AuthPage from './AuthPage';
import ActivateAccount from './ActivateAccount';
import ResetPassword from './ResetPassword';

interface AuthModuleWrapperProps {
  // Supabase client - should be passed from the consuming app
  supabase: any;
  // UI components - should be passed from the consuming app
  Button: any;
  Input: any;
  Label: any;
  Card: any;
  CardContent: any;
  CardDescription: any;
  CardHeader: any;
  CardTitle: any;
  Alert: any;
  AlertDescription: any;
  // Assets - should be passed from the consuming app
  logoUrl?: string;
  // Component to render
  component: 'AuthPage' | 'ActivateAccount' | 'ResetPassword';
  // Additional props for specific components
  authError?: string;
}

export const AuthModuleWrapper: React.FC<AuthModuleWrapperProps> = ({
  supabase,
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
  logoUrl,
  component,
  authError
}) => {
  const commonProps = {
    Button,
    Input,
    Label,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Alert,
    AlertDescription,
    logoUrl
  };

  switch (component) {
    case 'AuthPage':
      return <AuthPage {...commonProps} authError={authError} />;
    case 'ActivateAccount':
      return <ActivateAccount {...commonProps} supabase={supabase} />;
    case 'ResetPassword':
      return <ResetPassword {...commonProps} supabase={supabase} />;
    default:
      return null;
  }
};
