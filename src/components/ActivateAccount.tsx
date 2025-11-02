import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import raynLogo from '@/assets/rayn-logo.png';

const ActivateAccount: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activateUser, error: authError, loading: authLoading, signOut, supabaseClient } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const clientPathRef = useRef<string>('');
  
  // Parse URL parameters at component level
  const searchParams = new URLSearchParams(location.search);

  // Extract client path from URL on mount (preserve for redirects)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathParts = window.location.pathname.split('/').filter(Boolean);
      const clientId = pathParts[0];
      console.log('[ActivateAccount] Extracting client path:', {
        pathname: window.location.pathname,
        pathParts,
        clientId,
        validClientId: clientId && !['admin', 'activate-account', 'reset-password', 'forgot-password', 'email-notifications'].includes(clientId)
      });
      // Exclude common routes that aren't client IDs
      const validClientId = clientId && 
        !['admin', 'activate-account', 'reset-password', 'forgot-password', 'email-notifications'].includes(clientId);
      
      if (validClientId) {
        clientPathRef.current = `/${clientId}`;
        console.log('[ActivateAccount] Set clientPathRef to:', clientPathRef.current);
      } else {
        // Fallback: try sessionStorage
        const storedClientId = sessionStorage.getItem('currentClientId');
        if (storedClientId) {
          clientPathRef.current = `/${storedClientId}`;
          console.log('[ActivateAccount] Using stored client ID from sessionStorage:', clientPathRef.current);
        }
      }
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      // Debug logging
      console.log('ActivateAccount: URL hash:', window.location.hash);
      console.log('ActivateAccount: URL search:', window.location.search);
      console.log('ActivateAccount: Full URL:', window.location.href);
      console.log('ActivateAccount: Location hash:', location.hash);
      
      // Parse tokens from hash fragment if present: #access_token=...&refresh_token=...&type=signup
      const hash = location.hash || window.location.hash;
      const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
      
      const type = hashParams.get('type') || searchParams.get('type');
      const access = hashParams.get('access_token');
      const refresh = hashParams.get('refresh_token');
      const token = searchParams.get('token');
      const tokenHash = searchParams.get('token_hash');

      console.log('ActivateAccount: Parsed URL params:', { 
        type, 
        hasAccessToken: !!access, 
        hasRefreshToken: !!refresh,
        hasToken: !!token,
        hasTokenHash: !!tokenHash
      });

      // Handle invite flow with token (Supabase inviteUserByEmail)
      if (tokenHash && type === 'invite') {
        console.log('ActivateAccount: Processing invite token');
        try {
          const { data, error } = await supabaseClient.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'invite',
          });
          
          if (error) {
            console.error('ActivateAccount: verifyOtp error:', error);
            setError('Invalid or expired activation link. Please contact your administrator.');
          } else if (data.user) {
            console.log('ActivateAccount: Invite verified successfully for:', data.user.email);
            setEmail(data.user.email || '');
            // User is now authenticated and can set password
          }
        } catch (e) {
          console.error('ActivateAccount: verifyOtp exception:', e);
          setError('Failed to verify activation link. Please try again.');
        }
        return;
      }

      // Handle simple activation flow with email and user_id
const emailParam = searchParams.get('email');
const userIdParam = searchParams.get('user_id');

if (emailParam && userIdParam) {
  console.log('ActivateAccount: Processing simple activation for:', emailParam);
  setEmail(emailParam);
  // User can now set their password without token verification
  return;
}

      // Handle signup/invite flows with hash tokens (legacy)
      // Don't auto-login - just extract email if possible
      if ((type === 'signup' || type === 'invite') && access && refresh) {
        console.log('ActivateAccount: Found tokens for', type, 'flow - will NOT auto-login');
        // Don't set session - user must set password first
        // Just store tokens for later use if needed
        setAccessToken(access);
        setRefreshToken(refresh);
        // Try to get email from existing session if available, otherwise user will enter it
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.user?.email) {
          console.log('ActivateAccount: Found email from existing session:', session.user.email);
          setEmail(session.user.email);
          // Sign out - user needs to set password first
          await signOut();
        }
        return;
      }

      // Check for existing session - if found, sign out so user can set password
      console.log('ActivateAccount: Checking for existing session');
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session) {
        console.log('ActivateAccount: Found existing session for:', session.user?.email);
        // Set the email from the session user
        setEmail(session.user?.email || '');
        // Sign out - user needs to set password first
        await signOut();
        console.log('ActivateAccount: Signed out to allow password setup');
        return;
      }

      console.log('ActivateAccount: No session or tokens found');
      setError('Invalid or expired activation link. Please contact your administrator.');
      
      // For testing purposes, allow proceeding without valid session
      console.log('ActivateAccount: No valid session found - this is expected when testing directly');
    };

    void run();
  }, [location.hash]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 [ActivateAccount] Form submitted');
    console.log('📧 Email:', email);
    console.log('🔑 Password length:', password.length);
    setLoading(true);
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

// Check password requirements: lowercase, uppercase, digit, special character
const hasLowercase = /[a-z]/.test(password);
const hasUppercase = /[A-Z]/.test(password);
const hasDigit = /\d/.test(password);
const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"|,.<>?`~]/.test(password);

if (password.length < 12 || !hasLowercase || !hasUppercase || !hasDigit || !hasSpecial) {
  setError('Password must be at least 12 characters long and contain at least one lowercase letter, one uppercase letter, one digit, and one special character');
  setLoading(false);
  return;
}

    try {
      // Check if this is a simple activation flow with user_id
      const userIdParam = searchParams.get('user_id');
      console.log('🔍 [ActivateAccount] User ID param:', userIdParam);
      
      // Get client path for redirect (preserve from URL)
      const clientPath = clientPathRef.current || '';
      const loginPath = clientPath || '/';
      
      console.log('[ActivateAccount] Preparing redirect:', {
        clientPathRef: clientPathRef.current,
        clientPath,
        loginPath,
        currentPathname: window.location.pathname
      });
      
      if (userIdParam) {
        // Simple activation flow - use activateUser with userId
        console.log('📞 [ActivateAccount] Calling activateUser with userId');
        await activateUser(email, password, confirmPassword, userIdParam);
        setSuccess('Account activated successfully! Redirecting to login...');
        
        // Sign out the user after activation (don't auto-login)
        await signOut();
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          console.log('[ActivateAccount] Redirecting to:', loginPath);
          navigate(loginPath, { replace: true });
        }, 2000);
      } else {
        // Legacy flow - use activateUser function
        await activateUser(email, password, confirmPassword);
        setSuccess('Account activated successfully! Redirecting to login...');
        
        // Sign out the user after activation
        await signOut();
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          console.log('[ActivateAccount] Redirecting to (legacy flow):', loginPath);
          navigate(loginPath, { replace: true });
        }, 2000);
      }

    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center mb-6">
          <img 
            src={raynLogo} 
            alt="RAYN Secure Logo" 
            className="mx-auto h-12 w-auto mb-2"
          />
          <h1 className="text-xl font-semibold text-gray-800">RAYN Secure</h1>
          <p className="text-sm text-gray-600">Cybersecurity Training Platform</p>
        </div>
        
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              Activate Your Account
            </CardTitle>
            <CardDescription>
              Set your password to complete account activation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {(error || authError) && (
                <Alert variant="destructive">
                  <AlertDescription>{error || authError}</AlertDescription>
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
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled
                  className="bg-gray-50"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pr-10"
                    placeholder="Enter your password"
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
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pr-10"
                    placeholder="Confirm your password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || authLoading}
              >
                {(loading || authLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Activate Account
              </Button>
              
              <div className="text-center">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const clientPath = clientPathRef.current || '';
                    navigate(clientPath || '/');
                  }}
                  className="w-full"
                >
                  Back to Login
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ActivateAccount;
