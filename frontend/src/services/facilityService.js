import { supabase } from './supabase';

// ─── Facility Registration ────────────────────────────────────────────────────

export async function registerFacility(facilityData) {
  const { data, error } = await supabase
    .from('healthcare_facilities')
    .insert([{ ...facilityData, status: 'pending' }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getFacilityByUserId(userId) {
  const { data, error } = await supabase
    .from('healthcare_facilities')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateFacility(facilityId, updates) {
  const { data, error } = await supabase
    .from('healthcare_facilities')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', facilityId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Public Facility Search ───────────────────────────────────────────────────
// Only approved facilities appear in public search

export async function searchFacilities({ city, bloodGroup }) {
  let query = supabase
    .from('healthcare_facilities')
    .select(`
      id,
      name,
      facility_type,
      address,
      city,
      pin_code,
      phone,
      location_lat,
      location_lon,
      blood_inventory(blood_group, units_available, updated_at)
    `)
    .eq('status', 'approved');

  if (city) query = query.ilike('city', `%${city}%`);

  const { data, error } = await query.limit(50);
  if (error) throw error;

  // Client-side filter by blood group if specified
  if (bloodGroup && data) {
    return data.filter(f =>
      f.blood_inventory?.some(inv => inv.blood_group === bloodGroup && inv.units_available > 0)
    );
  }
  return data || [];
}

export async function getAllApprovedFacilities() {
  const { data, error } = await supabase
    .from('healthcare_facilities')
    .select(`
      id, name, facility_type, address, city, pin_code, phone,
      location_lat, location_lon,
      blood_inventory(blood_group, units_available, updated_at)
    `)
    .eq('status', 'approved');
  if (error) throw error;
  return data || [];
}

// ─── Blood Inventory ──────────────────────────────────────────────────────────

export async function getFacilityInventory(facilityId) {
  const { data, error } = await supabase
    .from('blood_inventory')
    .select('*')
    .eq('facility_id', facilityId)
    .order('blood_group');
  if (error) throw error;
  return data || [];
}

export async function upsertInventoryItem({ facilityId, bloodGroup, unitsAvailable }) {
  const { data, error } = await supabase
    .from('blood_inventory')
    .upsert(
      {
        facility_id: facilityId,
        blood_group: bloodGroup,
        units_available: unitsAvailable,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'facility_id,blood_group' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteInventoryItem(itemId) {
  const { error } = await supabase
    .from('blood_inventory')
    .delete()
    .eq('id', itemId);
  if (error) throw error;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function getPendingFacilities() {
  const { data, error } = await supabase
    .from('healthcare_facilities')
    .select('*, profiles(full_name, email)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function approveFacility(facilityId) {
  const { data, error } = await supabase
    .from('healthcare_facilities')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', facilityId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function rejectFacility(facilityId) {
  const { data, error } = await supabase
    .from('healthcare_facilities')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', facilityId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
