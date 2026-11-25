import { supabase } from './supabase';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function signUp({ email, password, fullName, phone, city, pendingRegistration }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin + '/login',
      // Role is never trusted from client metadata; database assigns 'patient'
      // by default and promotes to 'donor'/'facility' via server triggers.
      // pending_registration only holds the form details used to create the user's
      // OWN donor/facility row after email confirmation + first login.
      data: { full_name: fullName, phone, city, pending_registration: pendingRegistration ?? null },
    },
  });
  if (error) throw error;
  return data;
}

// Creates the donor/facility row for the logged-in user from saved signup details.
export async function completePendingRegistration(user) {
  const pending = user?.user_metadata?.pending_registration;
  if (!pending) return false;

  const { registerDonor } = await import('./donorService');
  const { registerFacility } = await import('./facilityService');

  if (pending.type === 'donor') {
    await registerDonor({ ...pending.data, user_id: user.id });
  } else if (pending.type === 'facility') {
    await registerFacility({ ...pending.data, user_id: user.id, status: 'pending' });
  }

  await supabase.auth.updateUser({ data: { pending_registration: null } });
  return true;
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
