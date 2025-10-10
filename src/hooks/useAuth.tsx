import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, AuthError } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData?: any) => Promise<void>;
  signOut: () => Promise<void>;
  sendActivationEmail: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  activateUser: (email: string, password: string, confirmPassword: string, userId?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) throw signInError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData?: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const redirectUrl = `${window.location.origin}/activate-account`;
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: userData || {}
        }
      });
      
      if (signUpError) throw signUpError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const sendActivationEmail = async (email: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const redirectUrl = `${window.location.origin}/activate-account`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
      if (resetError) throw resetError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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
      const { error } = await supabase.functions.invoke('send-email', {
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

  const activateUser = async (email: string, password: string, confirmPassword: string, userId?: string) => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Use the update-user-password edge function to set the password
      const { data, error: updateError } = await supabase.functions.invoke('update-user-password', {
        body: {
          email,
          password,
          user_id: userId
        }
      });
      
      if (updateError) {
        throw updateError;
      }
      
      // Now try to sign in with the new password
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (signInError) {
        throw signInError;
      }
      
      // Update user status to Active in profiles table
      if (signInData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ status: 'Active' })
          .eq('id', signInData.user.id);
          
        if (profileError) {
          console.error('Profile update error:', profileError);
          // Don't throw - activation was successful
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    sendActivationEmail,
    resetPassword,
    activateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};