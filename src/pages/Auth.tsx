import { Auth as SupabaseAuth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Brain } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <Brain className="w-10 h-10 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">
              AI Assistant Designer
            </h1>
          </div>
          <p className="text-muted-foreground">
            Sign in to create powerful AI assistants
          </p>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
          <SupabaseAuth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: "hsl(var(--primary))",
                    brandAccent: "hsl(var(--primary))",
                  },
                },
              },
              className: {
                container: "w-full",
                button: "w-full",
                input: "w-full",
              },
            }}
            providers={["google"]}
            redirectTo={`${window.location.origin}/`}
          />
        </div>
      </div>
    </div>
  );
}
