import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { debugLog } from '../utils/debugLog';

interface AuthConfig {
  supabaseClient: any;
  redirectTo?: string;
}

interface AuthContextValue {
  user: any | null;
  loading: boolean;
  error: string | null;
  supabaseClient: any;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendActivationEmail: (email: string) => Promise<void>;
  activateUser: (email: string, password: string, confirmPassword: string, userId?: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Default context value to prevent errors during initialization
const defaultAuthContext: AuthContextValue = {
  user: null,
  loading: true,
  error: null,
  supabaseClient: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  sendActivationEmail: async () => {},
  activateUser: async () => {},
  changePassword: async () => ({ success: false, error: 'Not configured' }),
};

export const AuthProvider: React.FC<{
  config: AuthConfig;
  children: React.ReactNode;
}> = ({ config, children }) => {
  const { supabaseClient } = config;
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Service role client removed - using Supabase's built-in validation instead

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
      async (event: string, session: any) => {
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
      // Session may already be invalid (e.g. after password change). Clear local state
      // so the user is logged out in the app; otherwise they stay "stuck" logged in.
      setUser(null);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Use Supabase's built-in password reset with proper tokens
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      debugLog('[AuthProvider] resetPassword', email);
      
      const { data, error: resetError } = await supabaseClient.functions.invoke('send-password-reset', {
        body: {
          email,
          redirectTo: redirectUrl
        }
      });
      
      if (resetError) throw resetError;
      
      // Check if Edge Function returned an error
      if (data?.error) {
        console.error('Edge Function returned error:', data.error);
        throw new Error(data.error);
      }
      
      debugLog('[AuthProvider] ✅ password reset email sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };


  const sendActivationEmail = async (email: string) => {
    try {
      setLoading(true);
      setError(null);

      debugLog('[AuthProvider] sendActivationEmail', email);

      // Use Edge Function (service role) to check profiles and send activation email.
      // Client-side profiles query fails due to RLS - anon cannot read profiles.
      const { data, error } = await supabaseClient.functions.invoke('request-activation-link', {
        body: { email },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      debugLog('[AuthProvider] ✅ activation email sent');
    } catch (error: any) {
      console.error('Activation email error:', error);
      setError(error.message);
      throw error;
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
      debugLog('[AuthProvider] activateUser', email);
      
      // Use the update-user-password edge function to set the password
      const { data, error: updateError } = await supabaseClient.functions.invoke('update-user-password', {
        body: {
          email,
          password,
          user_id: userId
        }
      });
      
      if (updateError) {
        console.error('Edge Function error:', updateError);
        throw updateError;
      }
      
      // Check if Edge Function returned an error
      if (data?.error) {
        console.error('Edge Function returned error:', data.error);
        throw new Error(data.error);
      }
      
      // Now try to sign in with the new password
      const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });
      
      if (signInError) {
        throw signInError;
      }
      
      // Update user status to Active in profiles table (fallback if Edge Function didn't do it)
      if (signInData.user) {
        const { error: profileError } = await supabaseClient
          .from('profiles')
          .update({ status: 'Active' })
          .eq('id', signInData.user.id);
          
        if (profileError) {
          console.error('❌ Profile update error:', profileError);
          // Don't throw - activation was successful
        }
      }
      
      debugLog('[AuthProvider] ✅ user activated', signInData.user?.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) {
      return { success: false, error: 'You must be signed in to change your password.' };
    }
    try {
      const { data, error: fnError } = await supabaseClient.functions.invoke('change-password', {
        body: {
          currentPassword,
          newPassword,
          userId: user.id,
          timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined,
        },
      });
      if (fnError) {
        return { success: false, error: fnError.message || 'Failed to update password.' };
      }
      if (data?.success === false && data?.error) {
        return { success: false, error: data.error };
      }
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update password.';
      return { success: false, error: message };
    }
  };

  const value: AuthContextValue = {
    user,
    loading,
    error,
    supabaseClient,
    signIn,
    signUp,
    signOut,
    resetPassword,
    sendActivationEmail,
    activateUser,
    changePassword,
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