import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "./supabaseClient";

export function useSupabaseSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // 未配置时，authLoading 初始为 false，无需额外更新
      return;
    }
    const client = getSupabase()!;
    let mounted = true;
    const t = setTimeout(() => {
      client.auth.getSession().then(({ data }) => {
        if (!mounted) return;
        setSession(data.session ?? null);
        setAuthLoading(false);
      });
    }, 0);
    const { data: sub } = client.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s ?? null);
    });
    return () => {
      mounted = false;
      clearTimeout(t);
      sub.subscription?.unsubscribe();
    };
  }, []);

  return { session, authLoading, isSupabaseConfigured };
}