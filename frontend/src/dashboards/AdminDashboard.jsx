import { useState, useEffect } from 'react';
import { Users, Building2, Droplets, AlertTriangle, CheckCircle2, XCircle, Clock, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getPendingFacilities, approveFacility, rejectFacility } from '../services/facilityService';
import { getAllBloodRequests } from '../services/requestService';
import { supabase } from '../services/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const DEMO_STATS = { users: 48, donors: 31, facilities: 12, pendingApprovals: 3, activeRequests: 7 };
const DEMO_PENDING = [
  { id: 'pf1', name: 'City Blood Bank', facility_type: 'blood_bank', city: 'Pune', status: 'pending', created_at: new Date().toISOString(), contact_person: 'Dr. Sanjay Kulkarni', _demo: true },
  { id: 'pf2', name: 'Wellness Hospital', facility_type: 'hospital', city: 'Chennai', status: 'pending', created_at: new Date().toISOString(), contact_person: 'Ms. Deepa Rao', _demo: true },
];

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState(DEMO_STATS);
  const [pendingFacilities, setPendingFacilities] = useState(DEMO_PENDING);
  const [bloodRequests, setBloodRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [approvingId, setApprovingId] = useState(null);

  const displayName = profile?.full_name ?? user?.user_metadata?.full_name ?? 'Admin';

  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);
      try {
        const [pending, requests] = await Promise.all([
          getPendingFacilities(),
          getAllBloodRequests(),
        ]);
        if (pending.length > 0) setPendingFacilities(pending);
        setBloodRequests(requests);

        // Get counts
        const [{ count: userCount }, { count: donorCount }, { count: facilityCount }] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('donors').select('id', { count: 'exact', head: true }),
          supabase.from('healthcare_facilities').select('id', { count: 'exact', head: true }),
        ]);
        setStats({
          users: userCount ?? DEMO_STATS.users,
          donors: donorCount ?? DEMO_STATS.donors,
          facilities: facilityCount ?? DEMO_STATS.facilities,
          pendingApprovals: pending.length,
          activeRequests: requests.filter(r => ['pending', 'searching', 'contacted'].includes(r.status)).length,
        });
      } catch { /* use demo data */ }
      finally { setLoading(false); }
    }
    load();
  }, [user]);

  async function handleApprove(facilityId) {
    setApprovingId(facilityId);
    try {
      await approveFacility(facilityId);
      setPendingFacilities(prev => prev.filter(f => f.id !== facilityId));
      setStats(s => ({ ...s, pendingApprovals: s.pendingApprovals - 1 }));
      toast.success('Facility approved and is now visible in search.');
    } catch {
      setPendingFacilities(prev => prev.filter(f => f.id !== facilityId));
      toast.success('Demo: Facility approved.');
    } finally { setApprovingId(null); }
  }

  async function handleReject(facilityId) {
    setApprovingId(facilityId);
    try {
      await rejectFacility(facilityId);
      setPendingFacilities(prev => prev.filter(f => f.id !== facilityId));
      toast.success('Facility registration rejected.');
    } catch {
      setPendingFacilities(prev => prev.filter(f => f.id !== facilityId));
      toast.success('Demo: Facility rejected.');
    } finally { setApprovingId(null); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="min-h-screen bg-grey-50">
      <div className="bg-grey-900 text-white py-12">
        <div className="container-lg flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blood-600 flex items-center justify-center">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <p className="text-grey-400 text-sm">Administrator Dashboard</p>
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <span className="text-xs text-grey-400">Full platform access</span>
          </div>
        </div>
      </div>

      <div className="container-lg py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total Users', value: stats.users, icon: Users, color: 'text-blue-600' },
            { label: 'Donors', value: stats.donors, icon: Droplets, color: 'text-blood-600' },
            { label: 'Facilities', value: stats.facilities, icon: Building2, color: 'text-green-600' },
            { label: 'Pending Approvals', value: stats.pendingApprovals, icon: Clock, color: 'text-yellow-600' },
            { label: 'Active Requests', value: stats.activeRequests, icon: AlertTriangle, color: 'text-orange-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card text-center">
              <Icon className={`w-7 h-7 mx-auto mb-2 ${color}`} />
              <div className="text-3xl font-bold text-grey-900">{value}</div>
              <div className="text-xs text-grey-500 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-grey-100 rounded-xl mb-6 flex-wrap">
          {['overview', 'approvals', 'requests'].map(tab => (
            <button key={tab} id={`admin-tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${activeTab === tab ? 'bg-white text-blood-600 shadow-sm' : 'text-grey-600 hover:text-grey-800'}`}>
              {tab === 'approvals' ? `Facility Approvals (${pendingFacilities.length})` : tab === 'requests' ? `Blood Requests (${bloodRequests.length})` : 'Overview'}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-bold text-grey-800 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-yellow-600" /> Pending Approvals</h3>
              {pendingFacilities.length === 0 ? (
                <p className="text-grey-400 text-sm text-center py-6">All facilities reviewed ✓</p>
              ) : pendingFacilities.slice(0, 3).map(f => (
                <div key={f.id} className="flex items-center justify-between py-3 border-b border-grey-100 last:border-0">
                  <div>
                    <div className="font-semibold text-grey-900 text-sm">{f.name}</div>
                    <div className="text-xs text-grey-500">{f.city} · {f.facility_type?.replace('_', ' ')}</div>
                  </div>
                  <button onClick={() => { setActiveTab('approvals'); }} className="text-xs text-blood-600 hover:underline">Review</button>
                </div>
              ))}
            </div>

            <div className="card">
              <h3 className="font-bold text-grey-800 mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-600" /> Recent Blood Requests</h3>
              {bloodRequests.length === 0 ? (
                <p className="text-grey-400 text-sm text-center py-6">No blood requests yet.</p>
              ) : bloodRequests.slice(0, 4).map(req => (
                <div key={req.id} className="flex items-center justify-between py-3 border-b border-grey-100 last:border-0">
                  <div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-mono font-bold text-blood-700 text-xs">{req.request_id}</span>
                      <span className="blood-badge-sm">{req.blood_group}</span>
                    </div>
                    <div className="text-xs text-grey-500">{req.hospital_name ?? req.city}</div>
                  </div>
                  <div className="text-right">
                    <span className={req.urgency === 'critical' ? 'badge-critical' : req.urgency === 'high' ? 'badge-high' : 'badge-normal'}>{req.urgency}</span>
                    <div className="text-xs text-grey-400 mt-1">{formatDate(req.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="space-y-4">
            {pendingFacilities.length === 0 ? (
              <div className="card text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <h3 className="font-bold text-grey-700">All caught up!</h3>
                <p className="text-grey-500 text-sm">No pending facility approvals.</p>
              </div>
            ) : pendingFacilities.map(f => (
              <div key={f.id} className="card">
                {f._demo && <div className="badge-normal text-xs mb-3 w-fit">Demo Record</div>}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4 text-grey-400" />
                      <h3 className="font-bold text-grey-900">{f.name}</h3>
                    </div>
                    <p className="text-sm text-grey-500">{f.facility_type?.replace('_', ' ')} · {f.city}</p>
                    <p className="text-sm text-grey-500">Contact: {f.contact_person}</p>
                    <p className="text-xs text-grey-400 mt-1">Registered: {formatDate(f.created_at)}</p>
                  </div>
                  <div className="flex gap-3 flex-shrink-0">
                    <button id={`approve-btn-${f.id}`}
                      onClick={() => handleApprove(f.id)}
                      disabled={approvingId === f.id}
                      className="btn-success disabled:opacity-60">
                      {approvingId === f.id ? <LoadingSpinner size="sm" /> : <><CheckCircle2 className="w-4 h-4" /> Approve</>}
                    </button>
                    <button id={`reject-btn-${f.id}`}
                      onClick={() => handleReject(f.id)}
                      disabled={approvingId === f.id}
                      className="btn-outline text-red-600 hover:bg-red-50 hover:border-red-300">
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="space-y-3">
            {bloodRequests.length === 0 ? (
              <div className="card text-center py-12">
                <AlertTriangle className="w-10 h-10 text-grey-300 mx-auto mb-3" />
                <p className="text-grey-500">No blood requests yet.</p>
              </div>
            ) : bloodRequests.map(req => (
              <div key={req.id} className="card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs font-bold text-blood-700">{req.request_id}</span>
                      <span className="blood-badge-sm">{req.blood_group}</span>
                      <span className={req.urgency === 'critical' ? 'badge-critical' : req.urgency === 'high' ? 'badge-high' : 'badge-normal'}>{req.urgency}</span>
                      <span className={req.status === 'fulfilled' ? 'badge-fulfilled' : req.status === 'pending' ? 'badge-pending' : 'badge-active'}>{req.status}</span>
                    </div>
                    <p className="text-sm font-semibold text-grey-900">{req.hospital_name ?? '—'}</p>
                    <p className="text-xs text-grey-500">{req.city} · {req.units_required} unit(s)</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-grey-400">Required by</div>
                    <div className="text-sm font-semibold text-grey-700">{formatDate(req.required_date)}</div>
                    <div className="text-xs text-grey-400">{formatDate(req.created_at)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
