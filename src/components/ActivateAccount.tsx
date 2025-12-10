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
      
      // Check for backup hash in sessionStorage (in case hash was cleared before Supabase processed it)
      const backupHash = typeof window !== 'undefined' ? sessionStorage.getItem('activation_hash_backup') : null;
      if (backupHash && !location.hash && !window.location.hash) {
        console.log('ActivateAccount: Hash was cleared, restoring from sessionStorage backup');
        window.location.hash = backupHash;
        // Wait a moment for hash to be restored, then continue
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Parse tokens from hash fragment: #access_token=...&refresh_token=...&type=recovery
      // This is what Supabase generates when using generateLink with type='recovery'
      const hash = location.hash || window.location.hash || backupHash;
      const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
      
      const type = hashParams.get('type') || searchParams.get('type');
      const access = hashParams.get('access_token');
      const refresh = hashParams.get('refresh_token');

      console.log('ActivateAccount: Parsed URL params:', { 
        type, 
        hasAccessToken: !!access, 
        hasRefreshToken: !!refresh
      });

      // Handle activation flow with recovery tokens (from Supabase generateLink)
      // When Supabase processes the activation link, it auto-creates a session from the access_token
      // We use that session to get the email - no need to sign out!
      const hasAccessToken = !!access || hash.includes('access_token');
      const isRecoveryType = type === 'recovery' || hash.includes('type=recovery');
      
      if (hasAccessToken && isRecoveryType) {
        console.log('ActivateAccount: Found recovery activation tokens in hash - this is an activation flow');
        console.log('ActivateAccount: Type:', type, 'Has access_token:', !!access);
        
        // Store hash in sessionStorage as backup (in case hash gets cleared before Supabase processes it)
        if (hash && typeof window !== 'undefined') {
          sessionStorage.setItem('activation_hash_backup', hash);
          console.log('ActivateAccount: Stored hash in sessionStorage as backup');
        }
        
        // Wait for Supabase to finish processing the hash and creating the session
        // This fixes the race condition where components check before Supabase finishes
        console.log('ActivateAccount: Waiting for Supabase to process hash and create session...');
        
        let session = null;
        const maxRetries = 10; // Try for up to 5 seconds (10 * 500ms)
        const retryDelay = 500; // 500ms between retries
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          const { data: { session: currentSession } } = await supabaseClient.auth.getSession();
          
          if (currentSession?.user?.email) {
            session = currentSession;
            console.log(`ActivateAccount: Session found on attempt ${attempt + 1}`);
            break;
          }
          
          if (attempt < maxRetries - 1) {
            console.log(`ActivateAccount: No session yet (attempt ${attempt + 1}/${maxRetries}), waiting ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
        
        // Get email from session (Supabase auto-created this session from the activation token)
        // DO NOT sign out - we need this session for activation!
        if (session?.user?.email) {
          console.log('ActivateAccount: Found email from session (created from activation token):', session.user.email);
          setEmail(session.user.email);
          console.log('ActivateAccount: Keeping session for activation flow');
          
          // Clear backup hash now that we've successfully processed it
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('activation_hash_backup');
          }
        } else {
          console.log('ActivateAccount: No session found after waiting - Supabase may not have processed the hash yet');
          console.log('ActivateAccount: This could be a race condition - hash may have been cleared too early');
          
          // Try to restore hash from backup if it was cleared
          const backupHash = typeof window !== 'undefined' ? sessionStorage.getItem('activation_hash_backup') : null;
          if (backupHash && !hash) {
            console.log('ActivateAccount: Hash was cleared, restoring from backup...');
            // Restore hash to URL (this will trigger Supabase to process it again)
            window.location.hash = backupHash;
            // Retry after a short delay
            setTimeout(() => {
              window.location.reload();
            }, 1000);
            return;
          }
          
          setError('Unable to retrieve user information. Please wait a moment and try again, or contact your administrator.');
        }
        return;
      }

      // No activation tokens found - this shouldn't happen for new user activation
      console.log('ActivateAccount: No activation tokens found in hash');
      setError('Invalid or expired activation link. Please contact your administrator.');
    };

    void run();
  }, [location.hash, supabaseClient]);

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
      // Get client path for redirect (preserve from URL)
      const clientPath = clientPathRef.current || '';
      const loginPath = clientPath || '/';
      
      console.log('[ActivateAccount] Preparing redirect:', {
        clientPathRef: clientPathRef.current,
        clientPath,
        loginPath,
        currentPathname: window.location.pathname
      });
      
      // Activate user account
      console.log('📞 [ActivateAccount] Calling activateUser');
      await activateUser(email, password, confirmPassword);
      setSuccess('Account activated successfully! Redirecting to login...');
      
      // Sign out the user after activation (don't auto-login)
      await signOut();
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        console.log('[ActivateAccount] Redirecting to:', loginPath);
        navigate(loginPath, { replace: true });
      }, 2000);

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
