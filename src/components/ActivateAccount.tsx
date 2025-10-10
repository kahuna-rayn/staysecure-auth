import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import raynLogo from '@/assets/rayn-logo.png';

interface ActivateAccountProps {
  supabaseClient: any;
}

const ActivateAccount: React.FC<ActivateAccountProps> = ({ supabaseClient }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activateUser, error: authError, loading: authLoading, signOut } = useAuth();
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
  
  // Parse URL parameters at component level
  const searchParams = new URLSearchParams(location.search);

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
      if ((type === 'signup' || type === 'invite') && access && refresh) {
        console.log('ActivateAccount: Setting session for', type, 'flow');
        setAccessToken(access);
        setRefreshToken(refresh);
        try {
          const { data, error } = await supabaseClient.auth.setSession({
            access_token: access,
            refresh_token: refresh,
          });
          if (error) {
            console.error('ActivateAccount: setSession error:', error);
            setError('Invalid activation link. Please try again.');
          } else if (data.user) {
            console.log('ActivateAccount: Session set successfully for:', data.user.email);
            setEmail(data.user.email || '');
          }
        } catch (e) {
          console.error('ActivateAccount: setSession exception:', e);
          setError('Failed to activate session. Please try again.');
        }
        return;
      }

      // Fallback: if a session already exists (Supabase may have handled invite), allow activation without tokens
      console.log('ActivateAccount: Checking for existing session');
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session) {
        console.log('ActivateAccount: Found existing session for:', session.user?.email);
        // Set the email from the session user
        setEmail(session.user?.email || '');
        return; // authenticated; proceed to allow password setup
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
      
      if (userIdParam) {
        // Simple activation flow - use activateUser with userId
        await activateUser(email, password, confirmPassword, userIdParam);
        setSuccess('Account activated successfully! Redirecting to login...');
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        // Legacy flow - use activateUser function
        await activateUser(email, password, confirmPassword);
        setSuccess('Account activated successfully! Redirecting to login...');
        
        // Sign out the user after activation
        await signOut();
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }

    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center mb-8">
          <img 
            src={raynLogo} 
            alt="RAYN Secure Logo" 
            className="mx-auto h-20 w-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-primary">RAYN Secure</h1>
          <p className="text-muted-foreground mt-2">Cybersecurity Training Platform</p>
        </div>
        
        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary">
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
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" 
                disabled={loading || authLoading}
              >
                {(loading || authLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Activate Account
              </Button>
              
              <div className="text-center">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/')}
                  className="w-full border-primary/20 text-primary hover:bg-primary/10"
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
