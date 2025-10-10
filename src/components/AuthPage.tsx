import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Loader2, Eye, EyeOff } from 'lucide-react';

interface AuthPageProps {
  authError?: string;
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
}

const AuthPage: React.FC<AuthPageProps> = ({ 
  authError,
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
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [activationMessage, setActivationMessage] = useState('');
  const { signIn, signOut, user, loading, error, resetPassword } = useAuth();
  const location = useLocation();

  console.log('[AuthPage] src/components rendered', { href: window.location.href, ts: new Date().toISOString(), state: location.state });

  // Check for activation success message
  useEffect(() => {
    if (location.state?.message) {
      setActivationMessage(location.state.message);
      // Clear the message from location state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setResetMessage('Please enter your email address first');
      return;
    }
    
    try {
      setResetMessage('');
      await resetPassword(email);
      setResetMessage('Password reset email sent! Check your inbox.');
    } catch (error: any) {
      setResetMessage(`Error: ${error.message}`);
    }
  };

  if (user) {
    return (
      <div className="min-h-screen bg-learning-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome!</CardTitle>
            <CardDescription>You are logged in as {user.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={signOut} variant="outline" className="w-full">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-learning-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* RAYN Secure Branding */}
        <div className="text-center">
          <img 
            src={logoUrl || '/rayn-logo.png'} 
            alt="RAYN Secure Logo" 
            className="mx-auto h-20 w-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-learning-primary">RAYN Secure</h1>
          <p className="text-muted-foreground mt-2">Behavioural Science Based Cybersecurity Learning</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {activationMessage && (
                <Alert>
                  <AlertDescription>{activationMessage}</AlertDescription>
                </Alert>
              )}

              {(error || authError) && (
                <Alert variant="destructive">
                  <AlertDescription>{authError || error}</AlertDescription>
                </Alert>
              )}

              {resetMessage && (
                <Alert variant={resetMessage.includes('Error') ? "destructive" : "default"}>
                  <AlertDescription>{resetMessage}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Button
                variant="link"
                className="p-0 h-auto text-teal-600"
                onClick={handleForgotPassword}
              >
                Forgot Password?
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;