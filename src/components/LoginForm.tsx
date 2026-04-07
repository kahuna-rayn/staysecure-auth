import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { debugLog } from '../utils/debugLog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import AuthBranding from './AuthBranding';
import MFAChallenge from './MFAChallenge';
import MFAEnrollment from './MFAEnrollment';

interface LoginFormProps {
  /** Optional displayName badge text. If not provided, badge won't show. */
  displayName?: string | null;
}

const LoginForm: React.FC<LoginFormProps> = ({ displayName }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState('');
  const [ssoLoading, setSsoLoading] = useState(false);
  const [entraEnabled, setEntraEnabled] = useState(false);

  const { signIn, error, loading: authLoading, mfaState, clearMfaState, supabaseClient } = useAuth();

  // Use displayName from props (passed by consuming app)
  const badgeText = displayName || null;

  // Preserve client path segment (e.g. /rayn) when navigating away from login
  const reserved = ['admin', 'activate-account', 'reset-password', 'forgot-password', 'email-notifications', 'auth'];
  const pathParts = location.pathname.split('/').filter(Boolean);
  const clientPrefix = pathParts[0] && !reserved.includes(pathParts[0]) ? `/${pathParts[0]}` : '';

  // Check if Microsoft SSO is enabled for this org (unauthenticated query via RPC)
  useEffect(() => {
    if (!supabaseClient) return;
    supabaseClient.rpc('get_org_sso_config').then(({ data, error }: { data: any; error: any }) => {
      if (error) {
        debugLog('[LoginForm] get_org_sso_config error', error.message);
        return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      debugLog('[LoginForm] sso config', row);
      setEntraEnabled(!!row?.entra_enabled);
    });
  }, [supabaseClient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');

    try {
      await signIn(email, password);
    } catch (error: any) {
      debugLog('[LoginForm] login failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    if (!supabaseClient) return;
    setSsoLoading(true);
    try {
      const redirectTo = `${window.location.origin}${clientPrefix}/auth/callback`;
      debugLog('[LoginForm] signInWithOAuth azure → redirectTo', redirectTo);
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo,
          scopes: 'openid email profile',
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) throw error;
      // Browser will redirect to Microsoft — no further action needed here
    } catch (err: any) {
      debugLog('[LoginForm] Microsoft sign-in error', err.message);
      setSsoLoading(false);
    }
  };

  const handleMfaSuccess = () => {
    clearMfaState();
    // Navigation is handled by the consuming app reacting to user state change
  };

  const handleMfaCancel = () => {
    // Sign out and return to login form
    supabaseClient?.auth.signOut();
    clearMfaState();
    setPassword('');
  };

  // ── MFA intercept screens ─────────────────────────────────────────────────
  if (mfaState === 'challenge') {
    return (
      <MFAChallenge
        supabaseClient={supabaseClient}
        onSuccess={handleMfaSuccess}
        onCancel={handleMfaCancel}
      />
    );
  }

  if (mfaState === 'enroll') {
    return (
      <MFAEnrollment
        supabaseClient={supabaseClient}
        onSuccess={handleMfaSuccess}
        required
      />
    );
  }

  if (mfaState === 'prompt') {
    return (
      <MFAEnrollment
        supabaseClient={supabaseClient}
        onSuccess={handleMfaSuccess}
        onSkip={handleMfaSuccess}
        required={false}
      />
    );
  }
  // ── end MFA intercept ─────────────────────────────────────────────────────


  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <AuthBranding size="large" />
      <Card>
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <CardTitle>Sign In</CardTitle>
            {badgeText && (
              <Badge variant="outline" className="text-xs">
                {badgeText}
              </Badge>
            )}
          </div>
          <CardDescription>
            Enter your email and password to access your learning dashboard
          </CardDescription>
        </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
          
          <Button type="submit" className="w-full" disabled={loading || authLoading}>
            {(loading || authLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>

          {entraEnabled && (
            <>
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                disabled={ssoLoading}
                onClick={handleMicrosoftSignIn}
              >
                {ssoLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21" className="h-4 w-4">
                    <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                    <rect x="11" y="1" width="9" height="9" fill="#00a4ef"/>
                    <rect x="1" y="11" width="9" height="9" fill="#7fba00"/>
                    <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                  </svg>
                )}
                Sign in with Microsoft
              </Button>
            </>
          )}
          
          <div className="text-center">
            <Button 
              variant="link" 
              type="button"
              onClick={() => {
                navigate(`${clientPrefix}/forgot-password`);
              }}
            >
              Forgot Password?
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
    </div>
  );
};

export default LoginForm;