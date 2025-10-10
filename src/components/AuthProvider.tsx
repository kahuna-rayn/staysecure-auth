import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthConfig {
  supabaseClient: any;
  redirectTo?: string;
}

interface AuthContextValue {
  user: any | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  activateUser: (password: string) => Promise<void>;
  sendActivationEmail: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Default context value to prevent errors during initialization
const defaultAuthContext: AuthContextValue = {
  user: null,
  loading: true,
  error: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  activateUser: async () => {},
  sendActivationEmail: async () => {},
};

export const AuthProvider: React.FC<{
  config: AuthConfig;
  children: React.ReactNode;
}> = ({ config, children }) => {
  const { supabaseClient } = config;
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
          throw error;
        }

        setUser(session?.user || null);
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabaseClient]);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const redirectUrl = `${window.location.origin}/activate-account`;
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        throw error;
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Use current origin for redirect URL
      const baseUrl = window.location.origin;
      const resetUrl = `${baseUrl}/reset-password?email=${encodeURIComponent(email)}`;
      
      console.log('Sending password reset to:', email);
      console.log('Reset URL:', resetUrl);
      
      // Use the Edge Function to send simple reset email (no auth tokens)
      const { error } = await supabaseClient.functions.invoke('send-email', {
        body: {
          to: email,
          subject: 'Reset Your Password',
          html: `
            <h2>Reset Your Password</h2>
            <p>Click the link below to reset your password:</p>
            <p><a href="${resetUrl}">Reset Password</a></p>
            <p>If the link doesn't work, copy and paste this URL into your browser:</p>
            <p>${resetUrl}</p>
          `
        }
      });
      
      if (error) {
        throw new Error('Failed to send reset email');
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const activateUser = async (password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabaseClient.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const sendActivationEmail = async (email: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the current app's base URL and redirect to activation page
      const baseUrl = window.location.origin;
      const redirectUrl = `${baseUrl}/activate-account`;
      
      console.log('Sending activation email to:', email);
      console.log('Redirect URL:', redirectUrl);
      
      // First, check if user exists in profiles table
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id, username, full_name')
        .eq('username', email)
        .maybeSingle();

      console.log('Profile check:', { profile, profileError });
      console.log('Profile error details:', profileError);

      if (profileError && profileError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is expected for new users
        console.error('Profile query failed:', profileError);
        throw profileError;
      }

      if (profile) {
        // User exists in profiles table - proceed with activation
        console.log('User found in profiles table, proceeding with activation');
        
        // Use Supabase client-side approach for deployment compatibility
        const baseUrl = window.location.origin;
        const redirectUrl = `${baseUrl}/activate-account`;
        
        console.log('Using deployment-friendly client-side approach');
        console.log('Redirect URL:', redirectUrl);
        
        // Use resetPasswordForEmail which works client-side and sends proper activation email
        const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl,
        });

        if (error) {
          throw error;
        }

        console.log('Activation email sent successfully:', data);
      } else {
        // User doesn't exist in profiles table
        console.log('User not found in profiles table');
        setError('This email address is not registered in our system. Please contact your administrator to request access.');
        return;
      }
    } catch (error: any) {
      console.error('Activation email error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextValue = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    activateUser,
    sendActivationEmail,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    console.warn("useAuth called outside AuthProvider, using default context");
    return defaultAuthContext;
  }
  return context;
};