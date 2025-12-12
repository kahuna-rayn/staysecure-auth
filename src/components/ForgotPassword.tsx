import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import AuthBranding from './AuthBranding';

interface ForgotPasswordProps {
  /** Optional displayName badge text. If not provided, badge won't show. */
  displayName?: string | null;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ displayName }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const { resetPassword } = useAuth();
  
  // Use displayName from props (passed by consuming app)
  const badgeText = displayName || null;

  // Check for error message from navigation state (e.g., expired link)
  useEffect(() => {
    if (location.state?.authError) {
      setMessage(location.state.authError);
      setIsError(true);
    }
  }, [location.state]);

  // Clear any hash tokens when on forgot-password page
  // This page is for requesting a reset, not for processing reset links
  useEffect(() => {
    if (location.hash && (location.hash.includes('access_token') || location.hash.includes('refresh_token'))) {
      // Remove hash from URL without causing a navigation
      // This prevents the RecoveryRedirect component from redirecting to activate-account
      const newUrl = window.location.pathname + (location.search || '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [location.hash, location.search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setIsError(true);
      setMessage('Please enter your email address');
      return;
    }
    
    setLoading(true);
    setMessage('');
    setIsError(false);
    
    try {
      await resetPassword(email);
      setIsError(false);
      setMessage('Password reset email sent! Please check your inbox and follow the instructions.');
    } catch (error: any) {
      setIsError(true);
      setMessage(error.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-learning-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <AuthBranding size="large" />
        <Card>
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <CardTitle>Reset Your Password</CardTitle>
              {badgeText && (
                <Badge variant="outline" className="text-xs">
                  {badgeText}
                </Badge>
              )}
            </div>
            <CardDescription>
              Enter your email address and we'll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {message && (
                <Alert variant={isError ? "destructive" : "default"}>
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <div className="mr-2 h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />}
                Send Reset Link
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Button
                variant="link"
                className="p-0 h-auto text-teal-600"
                onClick={() => navigate('/')}
              >
                ← Back to Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
