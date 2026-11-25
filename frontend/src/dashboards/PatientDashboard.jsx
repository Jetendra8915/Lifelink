import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Droplets, Clock, CheckCircle2, XCircle, AlertTriangle, Bell, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMyBloodRequests } from '../services/requestService';
import { getMyContactRequests } from '../services/donorService';
import { LoadingSpinner } from '../components/LoadingSpinner';

const STATUS_BADGES = {
  pending: 'badge-pending', searching: 'badge-normal', contacted: 'badge-active',
  fulfilled: 'badge-fulfilled', cancelled: 'badge-rejected',
};
const URGENCY_BADGES = { critical: 'badge-critical', high: 'badge-high', normal: 'badge-normal' };

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PatientDashboard() {
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [contactRequests, setContactRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('requests');

  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);
      try {
        const [reqs, contacts] = await Promise.all([
          getMyBloodRequests(user.id),
          getMyContactRequests(user.id),
        ]);
        setRequests(reqs);
        setContactRequests(contacts);
      } catch {
        // Demo data
        setRequests([{
          id: 'demo1', request_id: 'LL-DEMO01', blood_group: 'O+', units_required: 2,
          hospital_name: 'Apollo Hospital', city: 'Bangalore', urgency: 'high',
          status: 'searching', required_date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(), _demo: true,
        }]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const displayName = profile?.full_name ?? user?.user_metadata?.full_name ?? 'User';

  return (
    <div className="min-h-screen bg-grey-50">
      {/* Header */}
      <div className="hero-gradient text-white py-12">
        <div className="container-lg">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-white/60 text-sm">Patient / Requester Dashboard</p>
              <h1 className="text-2xl font-bold">Hello, {displayName}</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container-lg py-8">
        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Link to="/emergency" className="card bg-blood-600 text-white hover:bg-blood-700 border-none flex items-center gap-3">
            <Plus className="w-6 h-6" />
            <div><div className="font-bold">New Emergency Request</div><div className="text-xs text-white/70">Submit urgent blood request</div></div>
          </Link>
          <Link to="/find-blood" className="card flex items-center gap-3 hover:shadow-lg">
            <Droplets className="w-6 h-6 text-blood-600" />
            <div><div className="font-bold text-grey-800">Find Blood</div><div className="text-xs text-grey-500">Search donors & facilities</div></div>
          </Link>
          <div className="card flex items-center gap-3">
            <Bell className="w-6 h-6 text-blue-600" />
            <div>
              <div className="font-bold text-grey-800">Notifications</div>
              <div className="text-xs text-grey-500">{contactRequests.filter(c => c.status === 'accepted').length} responses received</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-grey-100 rounded-xl mb-6 w-fit">
          <button onClick={() => setActiveTab('requests')} id="tab-my-requests"
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'requests' ? 'bg-white text-blood-600 shadow-sm' : 'text-grey-600 hover:text-grey-800'}`}>
            My Requests ({requests.length})
          </button>
          <button onClick={() => setActiveTab('contacts')} id="tab-contact-responses"
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'contacts' ? 'bg-white text-blood-600 shadow-sm' : 'text-grey-600 hover:text-grey-800'}`}>
            Donor Responses ({contactRequests.length})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : activeTab === 'requests' ? (
          <div className="space-y-4">
            {requests.length === 0 ? (
              <div className="card text-center py-12">
                <AlertTriangle className="w-10 h-10 text-grey-300 mx-auto mb-3" />
                <p className="text-grey-500">No blood requests yet.</p>
                <Link to="/emergency" className="btn-primary btn-sm mt-4">Submit First Request</Link>
              </div>
            ) : requests.map(req => (
              <div key={req.id} className="card">
                {req._demo && <div className="badge-normal text-xs mb-3 w-fit">Demo Record</div>}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="blood-badge-sm">{req.blood_group}</span>
                      <span className={URGENCY_BADGES[req.urgency] ?? 'badge-normal'}>{req.urgency}</span>
                      <span className={STATUS_BADGES[req.status] ?? 'badge-normal'}>{req.status}</span>
                    </div>
                    <h3 className="font-bold text-grey-900">{req.hospital_name}</h3>
                    <p className="text-sm text-grey-500">{req.city} • {req.units_required} unit(s) required</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-grey-400">Request ID</div>
                    <div className="font-mono text-sm font-bold text-blood-700">{req.request_id}</div>
                    <div className="text-xs text-grey-400 mt-1">Required by: {formatDate(req.required_date)}</div>
                    <div className="text-xs text-grey-400">Submitted: {formatDate(req.created_at)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {contactRequests.length === 0 ? (
              <div className="card text-center py-12">
                <Bell className="w-10 h-10 text-grey-300 mx-auto mb-3" />
                <p className="text-grey-500">No donor responses yet.</p>
                <Link to="/find-blood" className="btn-secondary btn-sm mt-4">Search Donors</Link>
              </div>
            ) : contactRequests.map(cr => (
              <div key={cr.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="blood-badge-sm">{cr.donor?.blood_group}</span>
                      <span className={cr.status === 'accepted' ? 'badge-active' : cr.status === 'declined' ? 'badge-rejected' : 'badge-pending'}>
                        {cr.status}
                      </span>
                    </div>
                    <p className="text-sm text-grey-500">{cr.donor?.city}</p>
                  </div>
                  <div className="text-xs text-grey-400">{formatDate(cr.created_at)}</div>
                </div>
                {cr.status === 'accepted' && (
                  <div className="mt-3 p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-800">
                    <CheckCircle2 className="w-4 h-4 inline mr-1" />
                    Donor accepted your request. Please contact the LifeLink platform to get their contact details.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
