import { supabase } from './supabase';

// ─── Donor Registration ───────────────────────────────────────────────────────

export async function registerDonor(donorData) {
  const { data, error } = await supabase
    .from('donors')
    .insert([donorData])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getDonorProfile(userId) {
  const { data, error } = await supabase
    .from('donors')
    .select('*, profiles(*)')
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateDonorProfile(donorId, updates) {
  const { data, error } = await supabase
    .from('donors')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', donorId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleDonorAvailability(donorId, status) {
  // status: 'available' | 'unavailable' | 'inactive'
  const { data, error } = await supabase
    .from('donors')
    .update({ availability_status: status, updated_at: new Date().toISOString() })
    .eq('id', donorId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Search Donors (via privacy-safe RPC) ─────────────────────────────────────
// Returns only minimum matching fields (no phone, no email, no exact coordinates)

export async function searchDonors({ bloodGroup, city, pinCode }) {
  const { data, error } = await supabase.rpc('search_available_donors', {
    p_blood_group: bloodGroup || null,
    p_city: city || null,
    p_pin_code: pinCode || null,
  });
  if (error) throw error;
  return data || [];
}

// ─── Contact Requests ─────────────────────────────────────────────────────────

export async function createContactRequest({ donorId, requesterId, bloodRequestId, message }) {
  const { data, error } = await supabase
    .from('donor_contact_requests')
    .insert([{
      donor_id: donorId,
      requester_id: requesterId,
      blood_request_id: bloodRequestId,
      message,
      status: 'pending',
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getDonorContactRequests(donorId) {
  const { data, error } = await supabase.rpc('get_donor_incoming_requests', {
    p_donor_id: donorId,
  });
  if (error) throw error;
  return data || [];
}

export async function getMyContactRequests(requesterId) {
  const { data, error } = await supabase
    .from('donor_contact_requests')
    .select(`
      *,
      donor:donors(blood_group, city, availability_status)
    `)
    .eq('requester_id', requesterId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function respondToContactRequest(requestId, status) {
  // status: 'accepted' | 'declined' — validated server-side by RPC + trigger + RLS
  const { data, error } = await supabase.rpc('respond_to_contact_request', {
    p_request_id: requestId,
    p_status: status,
  });
  if (error) throw error;
  return data;
}
