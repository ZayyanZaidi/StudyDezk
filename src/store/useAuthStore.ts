import { create } from 'zustand';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { AuthUser, Profile, PlanType, DailyUsageStats, PLAN_LIMITS, UserCustomSettings, DEFAULT_USER_SETTINGS } from '../types/auth';

interface AuthState {
  user: AuthUser | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  isAccountModalOpen: boolean;
  isPricingModalOpen: boolean;
  isSettingsModalOpen: boolean;
  authView: 'login' | 'register' | 'forgot_password';
  error: string | null;
  successMessage: string | null;
  todayUsage: DailyUsageStats;
  settings: UserCustomSettings;

  // Actions
  initializeAuth: () => Promise<void>;
  setAuthModalOpen: (open: boolean, view?: 'login' | 'register' | 'forgot_password') => void;
  setAccountModalOpen: (open: boolean) => void;
  setPricingModalOpen: (open: boolean) => void;
  setSettingsModalOpen: (open: boolean) => void;
  updateSettings: (newSettings: Partial<UserCustomSettings>) => void;
  setAuthView: (view: 'login' | 'register' | 'forgot_password') => void;
  clearMessages: () => void;

  signUp: (email: string, password: string, fullName: string, university?: string, program?: string, semester?: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  updateProfile: (updates: Partial<Profile>) => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;
  upgradePlan: (plan: PlanType) => Promise<void>;
  recordChunkUsage: (count?: number) => void;
  refreshUsageStats: (coursesCount: number, docsCount: number) => void;
}

const LOCAL_STORAGE_PROFILE_KEY = 'studydezk_local_profile';
const LOCAL_STORAGE_USAGE_KEY = 'studydezk_local_usage';
const LOCAL_STORAGE_SETTINGS_KEY = 'studydezk_user_settings';

function loadLocalSettings(): UserCustomSettings {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    if (raw) return { ...DEFAULT_USER_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_USER_SETTINGS;
}

function saveLocalSettings(settings: UserCustomSettings) {
  try {
    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

function applySettingsToDOM(settings: UserCustomSettings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-font', settings.fontPreference);
  root.setAttribute('data-line-height', settings.readingLineHeight);
  if (settings.highReadabilityContrast) {
    root.classList.add('high-contrast');
  } else {
    root.classList.remove('high-contrast');
  }
}

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function loadLocalProfile(): Profile {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    id: 'local-student-user',
    email: 'student@studydezk.edu',
    full_name: 'University Scholar',
    university: 'State University',
    program: 'Computer Science',
    semester: 'Fall Semester',
    plan: 'free',
    created_at: new Date().toISOString(),
  };
}

function saveLocalProfile(profile: Profile) {
  try {
    localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(profile));
  } catch {}
}

function loadLocalUsage(): { date: string; chunksProcessed: number } {
  const today = getTodayDateString();
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === today) {
        return parsed;
      }
    }
  } catch {}
  return { date: today, chunksProcessed: 0 };
}

function saveLocalUsage(data: { date: string; chunksProcessed: number }) {
  try {
    localStorage.setItem(LOCAL_STORAGE_USAGE_KEY, JSON.stringify(data));
  } catch {}
}

const initialSettings = loadLocalSettings();
applySettingsToDOM(initialSettings);

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isAuthModalOpen: false,
  isAccountModalOpen: false,
  isPricingModalOpen: false,
  isSettingsModalOpen: false,
  authView: 'login',
  error: null,
  successMessage: null,
  settings: initialSettings,
  todayUsage: {
    date: getTodayDateString(),
    chunksProcessed: 0,
    maxChunksDaily: PLAN_LIMITS.free.maxChunksDaily,
    coursesCount: 1,
    maxCourses: PLAN_LIMITS.free.maxCourses,
    documentsCount: 0,
    maxDocuments: PLAN_LIMITS.free.maxDocumentsTotal,
  },

  setAuthModalOpen: (open, view) => {
    set({
      isAuthModalOpen: open,
      authView: view || get().authView,
      error: null,
      successMessage: null,
    });
  },

  setAccountModalOpen: (open) => {
    set({ isAccountModalOpen: open, error: null, successMessage: null });
  },

  setPricingModalOpen: (open) => {
    set({ isPricingModalOpen: open });
  },

  setSettingsModalOpen: (open) => {
    set({ isSettingsModalOpen: open });
  },

  updateSettings: (newSettings) => {
    const updated = { ...get().settings, ...newSettings };
    saveLocalSettings(updated);
    applySettingsToDOM(updated);
    set({ settings: updated, successMessage: 'Preferences saved.' });
  },

  setAuthView: (view) => {
    set({ authView: view, error: null, successMessage: null });
  },

  clearMessages: () => {
    set({ error: null, successMessage: null });
  },

  initializeAuth: async () => {
    const supabase = getSupabaseClient();
    const localUsage = loadLocalUsage();

    if (!supabase) {
      // Offline / Local-first mode
      const localProf = loadLocalProfile();
      const planLimits = PLAN_LIMITS[localProf.plan];

      set({
        user: {
          id: localProf.id,
          email: localProf.email || 'student@studydezk.edu',
          full_name: localProf.full_name,
        },
        profile: localProf,
        isLoading: false,
        todayUsage: {
          date: localUsage.date,
          chunksProcessed: localUsage.chunksProcessed,
          maxChunksDaily: planLimits.maxChunksDaily,
          coursesCount: 1,
          maxCourses: planLimits.maxCourses,
          documentsCount: 0,
          maxDocuments: planLimits.maxDocumentsTotal,
        },
      });
      return;
    }

    try {
      set({ isLoading: true });
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const u = session.user;
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', u.id)
          .single();

        const profile: Profile = profileData || {
          id: u.id,
          email: u.email,
          full_name: u.user_metadata?.full_name || 'Student',
          university: u.user_metadata?.university || '',
          program: u.user_metadata?.program || '',
          semester: u.user_metadata?.semester || '',
          plan: 'free',
          created_at: u.created_at,
        };

        const planLimits = PLAN_LIMITS[profile.plan];

        set({
          user: { id: u.id, email: u.email || '', full_name: profile.full_name },
          profile,
          isLoading: false,
          todayUsage: {
            date: localUsage.date,
            chunksProcessed: localUsage.chunksProcessed,
            maxChunksDaily: planLimits.maxChunksDaily,
            coursesCount: 1,
            maxCourses: planLimits.maxCourses,
            documentsCount: 0,
            maxDocuments: planLimits.maxDocumentsTotal,
          },
        });
      } else {
        // Guest mode with local defaults
        const localProf = loadLocalProfile();
        set({
          user: null,
          profile: localProf,
          isLoading: false,
        });
      }
    } catch (err: any) {
      console.warn('Supabase auth initialization fallback:', err?.message);
      const localProf = loadLocalProfile();
      set({
        user: null,
        profile: localProf,
        isLoading: false,
      });
    }
  },

  signUp: async (email, password, fullName, university, program, semester) => {
    set({ isLoading: true, error: null, successMessage: null });
    const supabase = getSupabaseClient();

    if (!supabase) {
      // Local simulation
      const newProf: Profile = {
        id: `user-${Date.now()}`,
        email,
        full_name: fullName,
        university,
        program,
        semester,
        plan: 'free',
        created_at: new Date().toISOString(),
      };
      saveLocalProfile(newProf);
      set({
        user: { id: newProf.id, email, full_name: fullName },
        profile: newProf,
        isLoading: false,
        isAuthModalOpen: false,
        successMessage: 'Welcome to StudyDezk! Profile created.',
      });
      return true;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            university,
            program,
            semester,
          },
        },
      });

      if (error) {
        set({ isLoading: false, error: error.message });
        return false;
      }

      if (data.user) {
        // Try creating profile record if trigger didn't handle
        const prof: Profile = {
          id: data.user.id,
          email,
          full_name: fullName,
          university,
          program,
          semester,
          plan: 'free',
          created_at: new Date().toISOString(),
        };

        await supabase.from('profiles').upsert([prof]);

        set({
          user: { id: data.user.id, email, full_name: fullName },
          profile: prof,
          isLoading: false,
          isAuthModalOpen: false,
          successMessage: 'Account created successfully! Check your email if verification is required.',
        });
        return true;
      }
      set({ isLoading: false });
      return true;
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Registration failed' });
      return false;
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null, successMessage: null });
    const supabase = getSupabaseClient();

    if (!supabase) {
      // Local fallback
      const prof = loadLocalProfile();
      prof.email = email;
      saveLocalProfile(prof);
      set({
        user: { id: prof.id, email, full_name: prof.full_name },
        profile: prof,
        isLoading: false,
        isAuthModalOpen: false,
        successMessage: 'Signed in successfully.',
      });
      return true;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        set({ isLoading: false, error: error.message });
        return false;
      }

      if (data.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        const profile: Profile = profileData || {
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || 'Student',
          plan: 'free',
          created_at: data.user.created_at,
        };

        const planLimits = PLAN_LIMITS[profile.plan];

        set({
          user: { id: data.user.id, email: data.user.email || '', full_name: profile.full_name },
          profile,
          isLoading: false,
          isAuthModalOpen: false,
          todayUsage: {
            ...get().todayUsage,
            maxChunksDaily: planLimits.maxChunksDaily,
            maxCourses: planLimits.maxCourses,
            maxDocuments: planLimits.maxDocumentsTotal,
          },
        });
        return true;
      }
      set({ isLoading: false });
      return true;
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Login failed' });
      return false;
    }
  },

  signOut: async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    set({
      user: null,
      isAccountModalOpen: false,
      successMessage: 'Signed out.',
    });
  },

  resetPassword: async (email) => {
    set({ isLoading: true, error: null, successMessage: null });
    const supabase = getSupabaseClient();

    if (!supabase) {
      set({
        isLoading: false,
        successMessage: `Password reset email simulated for ${email}. (Connect Supabase for production delivery)`,
      });
      return true;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });

      if (error) {
        set({ isLoading: false, error: error.message });
        return false;
      }

      set({
        isLoading: false,
        successMessage: `Password reset link sent to ${email}.`,
      });
      return true;
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Reset password failed' });
      return false;
    }
  },

  updateProfile: async (updates) => {
    const { profile, user } = get();
    if (!profile) return false;

    set({ isLoading: true, error: null, successMessage: null });
    const updated: Profile = {
      ...profile,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const supabase = getSupabaseClient();
    if (supabase && user) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id);

        if (error) {
          set({ isLoading: false, error: error.message });
          return false;
        }
      } catch (err: any) {
        set({ isLoading: false, error: err?.message || 'Profile update failed' });
        return false;
      }
    }

    saveLocalProfile(updated);
    set({
      profile: updated,
      isLoading: false,
      successMessage: 'Profile updated successfully!',
    });
    return true;
  },

  deleteAccount: async () => {
    const { user } = get();
    const supabase = getSupabaseClient();

    if (supabase && user) {
      try {
        // Delete profile and cascade (RLS ensures user can only affect self)
        await supabase.from('profiles').delete().eq('id', user.id);
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Account delete error:', err);
      }
    }

    localStorage.removeItem(LOCAL_STORAGE_PROFILE_KEY);
    localStorage.removeItem(LOCAL_STORAGE_USAGE_KEY);

    set({
      user: null,
      profile: null,
      isAccountModalOpen: false,
      successMessage: 'Account deleted.',
    });
    return true;
  },

  upgradePlan: async (plan) => {
    const { profile, user, todayUsage } = get();
    if (!profile) return;

    const updated: Profile = {
      ...profile,
      plan,
      updated_at: new Date().toISOString(),
    };

    const supabase = getSupabaseClient();
    if (supabase && user) {
      try {
        await supabase.from('profiles').update({ plan }).eq('id', user.id);
      } catch (err) {
        console.warn('Plan upgrade update in Supabase warning:', err);
      }
    }

    saveLocalProfile(updated);
    const planLimits = PLAN_LIMITS[plan];

    set({
      profile: updated,
      isPricingModalOpen: false,
      todayUsage: {
        ...todayUsage,
        maxChunksDaily: planLimits.maxChunksDaily,
        maxCourses: planLimits.maxCourses,
        maxDocuments: planLimits.maxDocumentsTotal,
      },
      successMessage: plan === 'pro' ? 'Upgraded to StudyDezk Pro!' : 'Switched to Free plan.',
    });
  },

  recordChunkUsage: (count = 1) => {
    const { todayUsage } = get();
    const today = getTodayDateString();
    const newCount = (todayUsage.date === today ? todayUsage.chunksProcessed : 0) + count;

    saveLocalUsage({ date: today, chunksProcessed: newCount });

    set({
      todayUsage: {
        ...todayUsage,
        date: today,
        chunksProcessed: newCount,
      },
    });
  },

  refreshUsageStats: (coursesCount, docsCount) => {
    const { todayUsage, profile } = get();
    const currentPlan = profile?.plan || 'free';
    const limits = PLAN_LIMITS[currentPlan];

    set({
      todayUsage: {
        ...todayUsage,
        coursesCount,
        maxCourses: limits.maxCourses,
        documentsCount: docsCount,
        maxDocuments: limits.maxDocumentsTotal,
        maxChunksDaily: limits.maxChunksDaily,
      },
    });
  },
}));
