import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AuthEventRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        const hash = window.location.hash || "";
        navigate("/reset-password" + hash, { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return null;
};

export default AuthEventRedirect;
