import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import AuthBranding from './AuthBranding';
import { getDisplayName } from '../utils/getDisplayName';

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState('');
  
  const { signIn, error, loading: authLoading } = useAuth();
  
   // Get displayName for badge
   const badgeText = useMemo(() => {
    const displayName = getDisplayName();
    // Debug logging
    console.log('[ForgotPassword] getDisplayName() result:', displayName);
    console.log('[ForgotPassword] location.pathname:', location.pathname);
    console.log('[ForgotPassword] VITE_CLIENT_CONFIGS exists:', !!import.meta.env.VITE_CLIENT_CONFIGS);
    return displayName;
  }, [location.pathname]);
  
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


  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <AuthBranding size="large" />
      <Card>
        <CardHeader className="relative">
          <div className="flex items-center gap-2">
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
          
          <div className="text-center">
            <Button 
              variant="link" 
              type="button"
              onClick={() => {
                navigate('/forgot-password');
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