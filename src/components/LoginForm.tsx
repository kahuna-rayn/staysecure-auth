import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [success, setSuccess] = useState('');
  
  const { signIn, resetPassword, error, loading: authLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');

    try {
      await signIn(email, password);
    } catch (error: any) {
      console.log('Login error caught:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');

    try {
      await resetPassword(email);
      setSuccess('Password reset instructions have been sent to your email.');
      setShowForgotPassword(false);
    } catch (error: any) {
      console.log('Reset password error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>
          {showForgotPassword ? 'Reset Password' : 'Sign In'}
        </CardTitle>
        <CardDescription>
          {showForgotPassword 
            ? 'Enter your email address to receive password reset instructions'
            : 'Enter your email and password to access your learning dashboard'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={showForgotPassword ? handleForgotPassword : handleSubmit} className="space-y-4">
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
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          {!showForgotPassword && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
          )}
          
          <Button type="submit" className="w-full" disabled={loading || authLoading}>
            {(loading || authLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {showForgotPassword ? 'Send Reset Instructions' : 'Sign In'}
          </Button>
          
          <div className="text-center">
            {showForgotPassword ? (
              <Button 
                variant="link" 
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setSuccess('');
                }}
              >
                Back to Sign In
              </Button>
            ) : (
              <Button 
                variant="link" 
                type="button"
                onClick={() => {
                  setShowForgotPassword(true);
                  setSuccess('');
                }}
              >
                Forgot Password?
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default LoginForm;