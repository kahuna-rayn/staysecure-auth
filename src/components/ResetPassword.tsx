import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import raynLogo from '@/assets/rayn-logo.png';

interface ResetPasswordProps {
  supabaseClient: any;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ supabaseClient }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const run = async () => {
      // Debug logging
      console.log('ResetPassword: URL hash:', window.location.hash);
      console.log('ResetPassword: URL search:', window.location.search);
      console.log('ResetPassword: Full URL:', window.location.href);
      
    // Debug logging
    console.log('ResetPassword: URL hash:', window.location.hash);
    console.log('ResetPassword: URL search:', window.location.search);
    console.log('ResetPassword: Full URL:', window.location.href);
    
    // Parse tokens from hash and search
    const hash = location.hash || window.location.hash;
    const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    const searchParams = new URLSearchParams(location.search);
    
    const type = hashParams.get('type') || searchParams.get('type');
    const tokenHash = searchParams.get('token_hash');

    console.log('ResetPassword: Parsed params:', { 
      type, 
      hasTokenHash: !!tokenHash,
      hashParams: Array.from(hashParams.entries()),
      searchParams: Array.from(searchParams.entries())
    });

    // Only support token_hash recovery flow
    if (tokenHash && type === 'recovery') {
      console.log('ResetPassword: Processing recovery token');
      try {
        const { data, error: verifyError } = await supabaseClient.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        });
        
        if (verifyError) {
          console.error('ResetPassword: verifyOtp error:', verifyError);
          setError('Invalid or expired password reset link. Please request a new one.');
        } else if (data.user) {
          console.log('ResetPassword: Recovery verified successfully for:', data.user.email);
          setEmail(data.user.email || '');
        }
      } catch (e) {
        console.error('ResetPassword: verifyOtp exception:', e);
        setError('Failed to verify password reset link. Please try again.');
      }
      return;
    }

    console.log('ResetPassword: No valid recovery token found');
    // Don't set error here - user might have clicked an old link but could still have a valid recovery session
    };

    void run();
  }, [location.hash, location.search, supabaseClient]);

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
      // Use Supabase client's updateUser method with the recovery session
      const { error: updateError } = await supabaseClient.auth.updateUser({
        password: password
      });
      
      if (updateError) {
        const errorMsg = updateError.message;
        
        // Provide more specific error messages
        if (errorMsg.toLowerCase().includes('weak') || (errorMsg.toLowerCase().includes('password') && errorMsg.toLowerCase().includes('strong'))) {
          throw new Error('Password is too weak. Please use a stronger password with at least 12 characters, including uppercase, lowercase, numbers, and special characters.');
        } else if (errorMsg.toLowerCase().includes('same')) {
          throw new Error('New password cannot be the same as your current password. Please choose a different password.');
        } else if (errorMsg.toLowerCase().includes('session') || errorMsg.toLowerCase().includes('expired')) {
          throw new Error('Your password reset link has expired. Please request a new one.');
        } else {
          throw new Error(errorMsg);
        }
      }
      
      setSuccess('Password reset successfully! Redirecting to login...');
      
      // Sign out to clear the recovery session
      await supabaseClient.auth.signOut();
      
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
      
    } catch (error: any) {
      setError(error.message || 'Failed to reset password. Please try again or request a new reset link.');
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
              Reset Your Password
            </CardTitle>
            <CardDescription>
              Enter your new password below
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
              
              {email && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={12}
                    className="pr-10"
                    placeholder="Enter your new password"
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
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={12}
                    className="pr-10"
                    placeholder="Confirm your new password"
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
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset Password
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

export default ResetPassword;
