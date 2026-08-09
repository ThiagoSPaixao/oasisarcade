import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/types/arcade";

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  initialized: boolean;
  loading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  loadProfile: () => Promise<void>;
  updateAvatar: (url: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  initialized: false,
  loading: false,
  setSession: (session) =>
    set({ session, user: session?.user ?? null, initialized: true, profile: session ? get().profile : null }),
  setProfile: (profile) => set({ profile }),
  loadProfile: async () => {
    const user = get().user;
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, level, xp, plano_status")
      .eq("id", user.id)
      .maybeSingle();
    if (data) {
      const profile = data as Profile;
      const stored = readStoredAvatar();
      set({ profile: { ...profile, avatar_url: profile.avatar_url ?? stored } });
    }
  },
  updateAvatar: async (url) => {
    const state = get();
    const user = state.user;
    if (!user) return;
    storeAvatar(url);
    if (state.profile) set({ profile: { ...state.profile, avatar_url: url } });
    const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    if (error) throw error;
  },

  signIn: async (email, password) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } finally {
      set({ loading: false });
    }
  },
  signUp: async (email, password, username) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } finally {
      set({ loading: false });
    }
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  },
}));
