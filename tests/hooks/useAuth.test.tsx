import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { createUseAuth } from "../../src/hooks/useAuth";

type MockSession = { user: any } | null;

function makeSupabaseMock(opts?:{
    initialSession?: MockSession;
    getSessionError?: Error | null;
    signInError?: Error | null;
    signUpError?: Error | null;
    signOutError?: Error | null;
    resetPasswordError?: Error | null;
    activateUserError?: Error | null;
}) {
    const unsubscribe = jest.fn();

    let onAuthCallback: ((event: any, session: any) => void) | null = null;
    
    const supabaseClient = {
        auth: {
            getSession: jest.fn(async () => {
                if (opts?.getSessionError) {
                    return { data: { session: null }, error: opts.getSessionError };
                }
                return { data: { session: opts?.initialSession ?? null }, error: null };
            }),
            onAuthStateChange: jest.fn((cb: any) => {
                onAuthCallback = cb;
                return { data: { subscription: { unsubscribe } } };
            }),
            signInWithPassword: jest.fn(async() => {
                return { data: {}, error: opts?.signInError ?? null};
            }),
            signUp: jest.fn(async () => {
                return { data: {}, error: opts?.signUpError ?? null };
            }),
            signOut: jest.fn(async() => {
                return { error: opts?.signOutError ?? null };
            }),
            resetPasswordForEmail: jest.fn(async () => {
                return { error: opts?.resetPasswordError ?? null };
            }),
            updateUser: jest.fn(async () => {
                return { error: opts?.activateUserError ?? null };
            })
        }
    };

    return { supabaseClient, unsubscribe, emitAuth: (event: any, session: any) => onAuthCallback?.(event, session) };
}

describe("createUseAuth", () => {
    it("starts with loading = true", async () => {
        const { supabaseClient } = makeSupabaseMock();
        const useAuth = createUseAuth({ supabaseClient });
        const { result } = renderHook(() => useAuth());

        expect(result.current.loading).toBe(true);
        expect(result.current.user).toBeNull();
        expect(result.current.error).toBeNull();

        await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it("sets user from initial session on mount - getSession success" , async () => {
        const testUser = { id: "u1" };
        const { supabaseClient } = makeSupabaseMock({
            initialSession: { user: testUser }
        });

        const useAuth = createUseAuth({ supabaseClient });
        const { result } = renderHook(() => useAuth());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(supabaseClient.auth.getSession).toHaveBeenCalledTimes(1);
        expect(result.current.user).toEqual(testUser);
        expect(result.current.error).toBeNull();
    });

    it("sets error if getSession returns an error", async () => {
        const { supabaseClient }= makeSupabaseMock({
            getSessionError: new Error("session failed")
        });

        const useAuth = createUseAuth({ supabaseClient });
        const { result } = renderHook(() => useAuth());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.user).toBeNull();
        expect(result.current.error).toBe("session failed");
    });

    it("updates user when onAuthStateChange fires", async () => {
        const testUser = { id: "u2" };
        const { supabaseClient, emitAuth } = makeSupabaseMock({
            initialSession: null
        });

        const useAuth = createUseAuth({ supabaseClient });
        const { result } = renderHook(() => useAuth());

        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            emitAuth("SIGNED_IN", { user: testUser });
        })

        await waitFor(() => {
            expect(result.current.user).toEqual(testUser);
        })
    });

    it("unsubscribes from auth changes on unmount", async () => {
        const { supabaseClient, unsubscribe } = makeSupabaseMock();
        const useAuth = createUseAuth({ supabaseClient });

        const { unmount } = renderHook(() => useAuth());

        await waitFor(() => expect(supabaseClient.auth.getSession).toHaveBeenCalled());

        unmount();
        expect(unsubscribe).toHaveBeenCalledTimes(1);
    });

    it("signIn sets loading = true then false on success", async () => {
        const { supabaseClient } = makeSupabaseMock();
        const useAuth = createUseAuth({ supabaseClient });
        const { result } = renderHook(() => useAuth());

        await waitFor(() => expect(result.current.loading).toBe(false)); 

        await act(async () => {
            await result.current.signIn("e@test.com", "testpw");
        });

        expect(supabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
            email: "e@test.com",
            password: "testpw"
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it("signIn sets error on failure", async () => {
        const { supabaseClient } = makeSupabaseMock( {signInError: new Error("bad creds")});
        const useAuth = createUseAuth({ supabaseClient });
        const { result } = renderHook(() => useAuth());

        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.signIn("e@test.com", "testpw");
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe("bad creds");
    });

    it("signUp calls supabase with full_name and handles success", async () => {
        const { supabaseClient } = makeSupabaseMock();
        const useAuth = createUseAuth({ supabaseClient });
        const { result } = renderHook(() => useAuth());

        await waitFor(() => expect(result.current.loading).toBe(false));
        await act(async () => {
            await result.current.signUp("a@test.com", "testpw", "John");
        });

        expect(supabaseClient.auth.signUp).toHaveBeenCalledWith({
            email: "a@test.com",
            password: "testpw",
            options: { data: { full_name: "John" } },
        });

        expect(result.current.error).toBeNull();
    });

    it("signOut sets error on failure", async () => {
        const { supabaseClient } = makeSupabaseMock({ signOutError: new Error("sign out failed")});
        const useAuth = createUseAuth({ supabaseClient });
        const { result } = renderHook(() => useAuth());

        await waitFor(() => expect(result.current.loading).toBe(false));
        await act(async () => {
            await result.current.signOut();
        });

        expect(result.current.error).toBe("sign out failed");
    });

    it("resetPassword calls supabase and handels success", async () => {
        const { supabaseClient } = makeSupabaseMock();
        const useAuth = createUseAuth({ supabaseClient });
        const { result } = renderHook(() => useAuth());

        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.resetPassword("b@test.com");
        });

        expect(supabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith("b@test.com");
        expect(result.current.error).toBeNull();
    });

    it("activateUser calls updateUser and sets error on failure", async () => {
        const { supabaseClient } = makeSupabaseMock({ activateUserError: new Error("weak password")});
        const useAuth = createUseAuth({ supabaseClient });
        const { result } = renderHook(() => useAuth());

        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.activateUser("weakpw");
        })

        expect(supabaseClient.auth.updateUser).toHaveBeenCalledWith({ password: "weakpw"});
        expect(result.current.error).toBe("weak password");
    })
})

