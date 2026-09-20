import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useCurrentUser() {
  const [user, setUser] = React.useState<User | null>(null);
  const [role, setRole] = React.useState<"admin" | "profesor" | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;

    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setUser(data.user ?? null);
      if (data.user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id);
        if (!active) return;
        const list = (roles ?? []).map((r: any) => r.role);
        setRole(list.includes("admin") ? "admin" : list.length ? "profesor" : null);
      } else {
        setRole(null);
      }
      setLoading(false);
    };

    void load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void load();
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, role, isAdmin: role === "admin", loading };
}

export function useSignOut() {
  const navigate = useNavigate();
  return async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
}
