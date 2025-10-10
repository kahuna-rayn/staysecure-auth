import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

interface ForgotPasswordProps {
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

const ForgotPassword: React.FC<ForgotPasswordProps> = ({
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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

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
            <CardTitle>Reset Your Password</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a link to reset your password
            </CardDescription>
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

              {message && (
                <Alert variant={isError ? "destructive" : "default"}>
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}

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
