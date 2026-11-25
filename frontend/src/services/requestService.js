import { supabase } from './supabase';

// ─── Create Blood Request ─────────────────────────────────────────────────────
// Note: Initial status history ('pending') is recorded automatically by the
// database trigger `trg_log_blood_request_status` with actor_id = auth.uid().

export async function createBloodRequest(requestData) {
  const requestId = `LL-${Date.now().toString(36).toUpperCase()}`;
  const { data, error } = await supabase
    .from('blood_requests')
    .insert([{
      ...requestData,
      request_id: requestId,
      status: 'pending',
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Get Requests ─────────────────────────────────────────────────────────────

export async function getMyBloodRequests(userId) {
  const { data, error } = await supabase
    .from('blood_requests')
    .select('*, request_status_history(status, notes, actor_id, created_at)')
    .eq('requester_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getAllBloodRequests() {
  // Admin only – RLS enforces access
  const { data, error } = await supabase
    .from('blood_requests')
    .select('*, profiles(full_name, email)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getActiveEmergencyRequests() {
  // Authorized users (approved facilities, admins, requester) – enforced by RLS
  const { data, error } = await supabase
    .from('blood_requests')
    .select('id, request_id, blood_group, units_required, hospital_name, city, pin_code, urgency, status, required_date, created_at')
    .in('status', ['pending', 'searching', 'contacted'])
    .order('urgency', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data || [];
}

// ─── Update Request Status ────────────────────────────────────────────────────
// Status transition history is logged automatically by `trg_log_blood_request_status`.
// Facilities/admins may also attach custom notes when needed.

export async function updateRequestStatus(requestId, status, notes = '') {
  const { data, error } = await supabase
    .from('blood_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .select()
    .single();
  if (error) throw error;

  if (notes && notes.trim()) {
    await supabase.from('request_status_history').insert([{
      blood_request_id: requestId,
      status,
      notes: notes.trim(),
    }]);
  }

  return data;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function getNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(notificationId) {
  const { data, error } = await supabase.rpc('mark_notification_read', {
    p_notification_id: notificationId,
  });
  if (error) throw error;
  return data;
}
