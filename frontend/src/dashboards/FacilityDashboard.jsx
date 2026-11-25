import { useState, useEffect } from 'react';
import { Building2, Droplets, Plus, Trash2, RefreshCw, Clock, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getFacilityByUserId, getFacilityInventory, upsertInventoryItem, deleteInventoryItem } from '../services/facilityService';
import { BLOOD_GROUPS } from '../utils/bloodGroups';
import { LoadingSpinner } from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function FacilityDashboard() {
  const { user, profile } = useAuth();
  const [facility, setFacility] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addForm, setAddForm] = useState({ bloodGroup: '', units: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const displayName = profile?.full_name ?? user?.user_metadata?.full_name ?? 'Facility';

  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);
      try {
        const fac = await getFacilityByUserId(user.id);
        setFacility(fac);
        const inv = await getFacilityInventory(fac.id);
        setInventory(inv);
      } catch {
        setFacility({
          id: 'demo-fac', name: displayName, facility_type: 'hospital',
          city: 'Bangalore', status: 'pending', _demo: true,
        });
        setInventory([
          { id: 'inv1', blood_group: 'O+', units_available: 8, updated_at: new Date().toISOString(), _demo: true },
          { id: 'inv2', blood_group: 'A+', units_available: 5, updated_at: new Date().toISOString(), _demo: true },
        ]);
      } finally { setLoading(false); }
    }
    load();
  }, [user]);

  async function handleAddInventory(e) {
    e.preventDefault();
    if (!addForm.bloodGroup || !addForm.units) { toast.error('Please fill in blood group and units.'); return; }
    setSaving(true);
    try {
      const item = await upsertInventoryItem({ facilityId: facility.id, bloodGroup: addForm.bloodGroup, unitsAvailable: Number(addForm.units) });
      setInventory(prev => {
        const existing = prev.findIndex(i => i.blood_group === addForm.bloodGroup);
        if (existing >= 0) { const updated = [...prev]; updated[existing] = item; return updated; }
        return [...prev, item];
      });
      setAddForm({ bloodGroup: '', units: '' });
      toast.success('Inventory updated!');
    } catch {
      const demoItem = { id: `demo-${Date.now()}`, blood_group: addForm.bloodGroup, units_available: Number(addForm.units), updated_at: new Date().toISOString(), _demo: true };
      setInventory(prev => { const ex = prev.findIndex(i => i.blood_group === addForm.bloodGroup); if (ex >= 0) { const u = [...prev]; u[ex] = demoItem; return u; } return [...prev, demoItem]; });
      setAddForm({ bloodGroup: '', units: '' });
      toast.success('Demo: Inventory updated locally.');
    } finally { setSaving(false); }
  }

  async function handleDelete(itemId) {
    setDeletingId(itemId);
    try {
      await deleteInventoryItem(itemId);
      setInventory(prev => prev.filter(i => i.id !== itemId));
      toast.success('Record removed.');
    } catch {
      setInventory(prev => prev.filter(i => i.id !== itemId));
      toast.success('Demo: Record removed locally.');
    } finally { setDeletingId(null); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  const statusConfig = {
    pending: { badge: 'badge-pending', icon: Clock, msg: 'Your facility is awaiting admin approval. You will appear in public search after approval.' },
    approved: { badge: 'badge-approved', icon: CheckCircle2, msg: 'Your facility is verified and visible in search results.' },
    rejected: { badge: 'badge-rejected', icon: XCircle, msg: 'Your facility registration was rejected. Contact support for details.' },
  };
  const sc = statusConfig[facility?.status] ?? statusConfig.pending;

  return (
    <div className="min-h-screen bg-grey-50">
      <div className="hero-gradient text-white py-12">
        <div className="container-lg">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Healthcare Facility Dashboard</p>
              <h1 className="text-2xl font-bold">{facility?.name ?? displayName}</h1>
              <span className={`${sc.badge} mt-1`}>{facility?.status}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container-lg py-8">
        {/* Approval Status Banner */}
        <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${facility?.status === 'approved' ? 'bg-green-50 border-green-200' : facility?.status === 'rejected' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <sc.icon className={`w-5 h-5 flex-shrink-0 ${facility?.status === 'approved' ? 'text-green-600' : facility?.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}`} />
          <p className="text-sm">{sc.msg}</p>
        </div>

        {facility?._demo && (
          <div className="alert-info mb-6 text-sm">★ Demo Mode — Connect Supabase for real facility data.</div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Inventory Management */}
          <div>
            <div className="card mb-4">
              <h2 className="font-bold text-grey-800 mb-4 flex items-center gap-2">
                <Droplets className="w-5 h-5 text-blood-600" /> Blood Inventory
              </h2>

              {/* Add/Update form */}
              <form id="inventory-form" onSubmit={handleAddInventory} className="flex gap-3 mb-4 p-4 bg-grey-50 rounded-xl">
                <select id="inv-blood-group" value={addForm.bloodGroup}
                  onChange={e => setAddForm({ ...addForm, bloodGroup: e.target.value })}
                  className="form-select flex-1" required>
                  <option value="">Blood Group</option>
                  {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
                <input id="inv-units" type="number" min="0" max="999"
                  value={addForm.units}
                  onChange={e => setAddForm({ ...addForm, units: e.target.value })}
                  placeholder="Units" className="form-input w-24" required />
                <button id="inv-save-btn" type="submit" disabled={saving}
                  className="btn-primary btn-sm px-4 disabled:opacity-60">
                  {saving ? <LoadingSpinner size="sm" /> : <Plus className="w-4 h-4" />}
                </button>
              </form>

              {/* Inventory list */}
              {inventory.length === 0 ? (
                <div className="text-center py-8 text-grey-400 text-sm">No inventory records. Add blood group availability above.</div>
              ) : (
                <div className="space-y-2">
                  {inventory.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-grey-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="blood-badge text-sm w-10 h-10">{item.blood_group}</span>
                        <div>
                          <div className="font-semibold text-grey-900">{item.units_available} units</div>
                          <div className="text-xs text-grey-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {new Date(item.updated_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                        </div>
                      </div>
                      <button id={`delete-inv-${item.id}`}
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="p-2 rounded-lg text-grey-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        {deletingId === item.id ? <LoadingSpinner size="sm" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="alert-warning text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Update your inventory regularly. Patients rely on this information. Always display accurate, current stock levels.
            </div>
          </div>

          {/* Facility Info */}
          <div className="card">
            <h2 className="font-bold text-grey-800 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blood-600" /> Facility Details
            </h2>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Name', value: facility?.name },
                { label: 'Type', value: facility?.facility_type?.replace('_', ' ') },
                { label: 'City', value: facility?.city },
                { label: 'PIN Code', value: facility?.pin_code ?? '—' },
                { label: 'Status', value: facility?.status },
                { label: 'Contact Person', value: facility?.contact_person ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-2 border-b border-grey-100">
                  <span className="text-grey-500">{label}</span>
                  <span className="font-semibold text-grey-900 capitalize">{value ?? '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
