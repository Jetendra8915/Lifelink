import { useState, useEffect } from 'react';
import { Droplets, Bell, CheckCircle2, XCircle, Clock, ToggleLeft, ToggleRight, AlertTriangle, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDonorProfile, toggleDonorAvailability, getDonorContactRequests, respondToContactRequest } from '../services/donorService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DonorDashboard() {
  const { user, profile } = useAuth();
  const [donor, setDonor] = useState(null);
  const [contactRequests, setContactRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingAvailability, setTogglingAvailability] = useState(false);
  const [respondingId, setRespondingId] = useState(null);
  const [activeTab, setActiveTab] = useState('requests');

  const displayName = profile?.full_name ?? user?.user_metadata?.full_name ?? 'Donor';

  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);
      try {
        const donorData = await getDonorProfile(user.id);
        const requests = await getDonorContactRequests(donorData.id);
        setDonor(donorData);
        setContactRequests(requests);
      } catch {
        // Demo mode
        setDonor({
          id: 'demo-donor', blood_group: 'O+', city: 'Bangalore', age: 25,
          availability_status: 'available', consent_to_contact: true,
          last_donation_date: '2024-08-15', is_active: true, _demo: true,
        });
        setContactRequests([{
          id: 'cr1', status: 'pending',
          requester: { full_name: 'Rahul Sharma', city: 'Bangalore' },
          blood_request: { patient_name: 'Priya Singh', blood_group: 'O+', urgency: 'high', hospital_name: 'Apollo Hospital' },
          created_at: new Date().toISOString(), message: 'I urgently need blood.', _demo: true,
        }]);
      } finally { setLoading(false); }
    }
    load();
  }, [user]);

  async function handleToggleAvailability() {
    if (!donor) return;
    setTogglingAvailability(true);
    const newStatus = donor.availability_status === 'available' ? 'unavailable' : 'available';
    try {
      const updated = await toggleDonorAvailability(donor.id, newStatus);
      setDonor(d => ({ ...d, availability_status: newStatus }));
      toast.success(`Availability set to ${newStatus}`);
    } catch {
      setDonor(d => ({ ...d, availability_status: newStatus }));
      toast.success(`Demo: Availability toggled to ${newStatus}`);
    } finally { setTogglingAvailability(false); }
  }

  async function handleRespond(requestId, status) {
    setRespondingId(requestId);
    try {
      await respondToContactRequest(requestId, status);
      setContactRequests(prev => prev.map(cr => cr.id === requestId ? { ...cr, status } : cr));
      toast.success(status === 'accepted' ? 'You accepted the request!' : 'You declined the request.');
    } catch {
      setContactRequests(prev => prev.map(cr => cr.id === requestId ? { ...cr, status } : cr));
      toast.success(`Demo: Request ${status}`);
    } finally { setRespondingId(null); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  const isAvailable = donor?.availability_status === 'available';
  const pendingRequests = contactRequests.filter(cr => cr.status === 'pending');

  return (
    <div className="min-h-screen bg-grey-50">
      {/* Header */}
      <div className="hero-gradient text-white py-12">
        <div className="container-lg flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-white/60 text-sm">Donor Dashboard</p>
              <h1 className="text-2xl font-bold">{displayName}</h1>
              {donor && <div className="blood-badge-sm mt-1 bg-white/20 text-white border-white/40">{donor.blood_group}</div>}
            </div>
          </div>
          {donor && (
            <button id="availability-toggle-btn"
              onClick={handleToggleAvailability}
              disabled={togglingAvailability}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                isAvailable ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-grey-600 text-white hover:bg-grey-700'
              }`}>
              {togglingAvailability ? <LoadingSpinner size="sm" /> : isAvailable ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              {isAvailable ? 'Available to Donate' : 'Currently Unavailable'}
            </button>
          )}
        </div>
      </div>

      <div className="container-lg py-8">
        {donor?._demo && (
          <div className="alert-info mb-6 text-sm">★ Demo Mode — Connect Supabase for real donor profile data.</div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="card text-center">
            <div className="text-3xl font-bold text-blood-600">{donor?.blood_group ?? '—'}</div>
            <div className="text-xs text-grey-500 mt-1">Blood Group</div>
          </div>
          <div className="card text-center">
            <div className={`text-lg font-bold ${isAvailable ? 'text-green-600' : 'text-grey-400'}`}>
              {isAvailable ? '● Available' : '○ Unavailable'}
            </div>
            <div className="text-xs text-grey-500 mt-1">Status</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-blue-600">{pendingRequests.length}</div>
            <div className="text-xs text-grey-500 mt-1">Pending Requests</div>
          </div>
          <div className="card text-center">
            <div className="text-sm font-bold text-grey-700">{formatDate(donor?.last_donation_date)}</div>
            <div className="text-xs text-grey-500 mt-1">Last Donated</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-grey-100 rounded-xl mb-6 w-fit">
          <button id="tab-contact-requests" onClick={() => setActiveTab('requests')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'requests' ? 'bg-white text-blood-600 shadow-sm' : 'text-grey-600'}`}>
            Contact Requests {pendingRequests.length > 0 && <span className="ml-1 badge-critical text-xs">{pendingRequests.length}</span>}
          </button>
          <button id="tab-donor-profile" onClick={() => setActiveTab('profile')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'profile' ? 'bg-white text-blood-600 shadow-sm' : 'text-grey-600'}`}>
            My Profile
          </button>
        </div>

        {activeTab === 'requests' ? (
          <div className="space-y-4">
            {contactRequests.length === 0 ? (
              <div className="card text-center py-12">
                <Bell className="w-10 h-10 text-grey-300 mx-auto mb-3" />
                <p className="text-grey-500">No contact requests yet. Keep your availability active.</p>
              </div>
            ) : contactRequests.map(cr => (
              <div key={cr.id} className="card">
                {cr._demo && <div className="badge-normal text-xs mb-3 w-fit">Demo Record</div>}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cr.blood_request?.urgency === 'critical' ? 'badge-critical' : cr.blood_request?.urgency === 'high' ? 'badge-high' : 'badge-normal'}>
                        {cr.blood_request?.urgency ?? 'unknown'} urgency
                      </span>
                      <span className={cr.status === 'pending' ? 'badge-pending' : cr.status === 'accepted' ? 'badge-active' : 'badge-rejected'}>
                        {cr.status}
                      </span>
                    </div>
                    <h3 className="font-bold text-grey-900">{cr.blood_request?.hospital_name ?? 'Unknown Hospital'}</h3>
                    <p className="text-sm text-grey-500">Patient: {cr.blood_request?.patient_name} • Blood: {cr.blood_request?.blood_group}</p>
                    <p className="text-sm text-grey-500">Requester: {cr.requester?.full_name}, {cr.requester?.city}</p>
                  </div>
                  <div className="text-xs text-grey-400">{formatDate(cr.created_at)}</div>
                </div>

                {cr.message && (
                  <div className="p-3 rounded-lg bg-grey-50 text-sm text-grey-600 mb-3">"{cr.message}"</div>
                )}

                {cr.status === 'pending' && (
                  <div className="flex gap-3">
                    <button id={`accept-btn-${cr.id}`}
                      onClick={() => handleRespond(cr.id, 'accepted')}
                      disabled={respondingId === cr.id}
                      className="btn-success flex-1 justify-center disabled:opacity-60">
                      {respondingId === cr.id ? <LoadingSpinner size="sm" /> : <><CheckCircle2 className="w-4 h-4" /> Accept</>}
                    </button>
                    <button id={`decline-btn-${cr.id}`}
                      onClick={() => handleRespond(cr.id, 'declined')}
                      disabled={respondingId === cr.id}
                      className="btn-outline flex-1 justify-center text-grey-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200">
                      <XCircle className="w-4 h-4" /> Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card max-w-lg">
            <h3 className="font-bold text-grey-800 mb-4 flex items-center gap-2"><User className="w-4 h-4 text-blood-600" /> Donor Profile</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Name', value: displayName },
                { label: 'Blood Group', value: donor?.blood_group },
                { label: 'Age', value: donor?.age },
                { label: 'City', value: donor?.city },
                { label: 'Consent to Contact', value: donor?.consent_to_contact ? 'Yes' : 'No' },
                { label: 'Last Donation', value: formatDate(donor?.last_donation_date) },
                { label: 'Status', value: donor?.availability_status },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-2 border-b border-grey-100">
                  <span className="text-grey-500">{label}</span>
                  <span className="font-semibold text-grey-900 capitalize">{value ?? '—'}</span>
                </div>
              ))}
            </div>
            <div className="alert-info text-xs mt-4">
              Profile editing coming soon. Contact support if you need to update your information.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
