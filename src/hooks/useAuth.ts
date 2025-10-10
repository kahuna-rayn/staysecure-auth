import { useState, useEffect, useCallback } from "react";
import type { User, AuthState } from "../types";

export const createUseAuth = (dependencies: {
  supabaseClient: any; // SupabaseClient type
}) => {
  return () => {
    const { supabaseClient } = dependencies;
    const [authState, setAuthState] = useState<AuthState>({
      user: null,
      loading: true,
      error: null,
    });

    const signIn = useCallback(async (email: string, password: string) => {
      try {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));
        
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        setAuthState(prev => ({ ...prev, loading: false }));
      } catch (error: any) {
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: error.message 
        }));
      }
    }, [supabaseClient]);

    const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
      try {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));
        
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) {
          throw error;
        }

        setAuthState(prev => ({ ...prev, loading: false }));
      } catch (error: any) {
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: error.message 
        }));
      }
    }, [supabaseClient]);

    const signOut = useCallback(async () => {
      try {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));
        
        const { error } = await supabaseClient.auth.signOut();

        if (error) {
          throw error;
        }

        setAuthState(prev => ({ ...prev, loading: false }));
      } catch (error: any) {
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: error.message 
        }));
      }
    }, [supabaseClient]);

    const resetPassword = useCallback(async (email: string) => {
      try {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));
        
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email);

        if (error) {
          throw error;
        }

        setAuthState(prev => ({ ...prev, loading: false }));
      } catch (error: any) {
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: error.message 
        }));
      }
    }, [supabaseClient]);

    const activateUser = useCallback(async (password: string) => {
      try {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));
        
        const { error } = await supabaseClient.auth.updateUser({
          password: password
        });

        if (error) {
          throw error;
        }

        setAuthState(prev => ({ ...prev, loading: false }));
      } catch (error: any) {
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          error: error.message 
        }));
      }
    }, [supabaseClient]);

    useEffect(() => {
      // Get initial session
      const getInitialSession = async () => {
        try {
          const { data: { session }, error } = await supabaseClient.auth.getSession();
          
          if (error) {
            throw error;
          }

          setAuthState(prev => ({
            ...prev,
            user: session?.user || null,
            loading: false,
          }));
        } catch (error: any) {
          setAuthState(prev => ({
            ...prev,
            loading: false,
            error: error.message,
          }));
        }
      };

      getInitialSession();

      // Listen for auth changes
      const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
        async (event, session) => {
          setAuthState(prev => ({
            ...prev,
            user: session?.user || null,
            loading: false,
          }));
        }
      );

      return () => subscription.unsubscribe();
    }, [supabaseClient]);

    return {
      ...authState,
      signIn,
      signUp,
      signOut,
      resetPassword,
      activateUser,
    };
  };
};
