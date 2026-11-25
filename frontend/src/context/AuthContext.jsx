import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { getProfile, completePendingRegistration } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // Supabase auth user
  const [profile, setProfile] = useState(null); // profiles table row
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    try {
      let profileData = await getProfile(userId);

      // Finish donor/facility registration saved at signup (email-confirmation flow)
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      if (freshUser?.user_metadata?.pending_registration && profileData.role === 'patient') {
        try {
          await completePendingRegistration(freshUser);
          profileData = await getProfile(userId);
        } catch (e) {
          console.error('Could not complete registration:', e.message);
        }
      }
      setProfile(profileData);
    } catch (err) {
      console.error('Failed to fetch profile:', err.message);
    } finally {
      setLoading(false);
    }
  }

  // Convenience getters — role is sourced from the database profile row
  const isLoggedIn = !!user;
  const role = profile?.role ?? null;
  const isAdmin = role === 'admin';
  const isDonor = role === 'donor';
  const isFacility = role === 'facility';
  const isPatient = role === 'patient';

  const value = {
    user,
    profile,
    loading,
    isLoggedIn,
    role,
    isAdmin,
    isDonor,
    isFacility,
    isPatient,
    refreshProfile: (uid) => (uid || user?.id) ? fetchProfile(uid || user.id) : Promise.resolve(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
