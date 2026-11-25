import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search, MapPin, Droplets, Clock, CheckCircle2, AlertTriangle,
  Building2, Users, Filter, X, Phone, Info
} from 'lucide-react';
import { searchDonors, createContactRequest } from '../services/donorService';
import { searchFacilities } from '../services/facilityService';
import { BLOOD_GROUPS } from '../utils/bloodGroups';
import { INDIAN_CITIES } from '../utils/validators';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner, SkeletonCard } from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

// ── Demo data shown when Supabase isn't connected ─────────────────────────────
const DEMO_DONORS = [
  { id: 'd1', blood_group: 'O+', city: 'Mumbai', pin_code: '400001', availability_status: 'available', last_donation_date: '2024-08-15', consent_to_contact: true, _demo: true },
  { id: 'd2', blood_group: 'A+', city: 'Delhi', pin_code: '110001', availability_status: 'available', last_donation_date: '2024-07-20', consent_to_contact: true, _demo: true },
  { id: 'd3', blood_group: 'B+', city: 'Bangalore', pin_code: '560001', availability_status: 'available', last_donation_date: '2024-09-01', consent_to_contact: true, _demo: true },
  { id: 'd4', blood_group: 'AB+', city: 'Chennai', pin_code: '600001', availability_status: 'available', last_donation_date: null, consent_to_contact: true, _demo: true },
  { id: 'd5', blood_group: 'O-', city: 'Hyderabad', pin_code: '500001', availability_status: 'available', last_donation_date: '2024-06-10', consent_to_contact: true, _demo: true },
];

const DEMO_FACILITIES = [
  { id: 'f1', name: 'Apollo Hospitals', facility_type: 'hospital', address: 'Bannerghatta Road', city: 'Bangalore', pin_code: '560076', phone: '080-26304050', blood_inventory: [{ blood_group: 'O+', units_available: 8, updated_at: new Date().toISOString() }, { blood_group: 'A+', units_available: 5, updated_at: new Date().toISOString() }], _demo: true },
  { id: 'f2', name: 'Rotary Blood Bank', facility_type: 'blood_bank', address: 'Tughlak Road', city: 'Delhi', pin_code: '110011', phone: '011-23711271', blood_inventory: [{ blood_group: 'B+', units_available: 12, updated_at: new Date().toISOString() }, { blood_group: 'O-', units_available: 3, updated_at: new Date().toISOString() }], _demo: true },
  { id: 'f3', name: 'KEM Hospital Blood Bank', facility_type: 'blood_bank', address: 'Acharya Donde Marg', city: 'Mumbai', pin_code: '400012', phone: '022-24107000', blood_inventory: [{ blood_group: 'AB+', units_available: 4, updated_at: new Date().toISOString() }, { blood_group: 'A-', units_available: 2, updated_at: new Date().toISOString() }], _demo: true },
];

function formatDate(dateStr) {
  if (!dateStr) return 'Not recorded';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function FindBlood() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    bloodGroup: searchParams.get('blood_group') ?? '',
    city: searchParams.get('city') ?? '',
    pinCode: '',
    activeTab: 'donors', // 'donors' | 'facilities'
  });
  const [donors, setDonors] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [contactingId, setContactingId] = useState(null);
  const { isLoggedIn, user, role } = useAuth();

  // Auto-search if URL has params
  useEffect(() => {
    if (searchParams.get('blood_group') || searchParams.get('city')) {
      handleSearch();
    }
  }, []);

  async function handleSearch(e) {
    if (e) e.preventDefault();
    setLoading(true);
    setSearched(true);

    try {
      const [donorResults, facilityResults] = await Promise.all([
        searchDonors({ bloodGroup: filters.bloodGroup, city: filters.city, pinCode: filters.pinCode }),
        searchFacilities({ city: filters.city, bloodGroup: filters.bloodGroup }),
      ]);
      setDonors(donorResults.length > 0 ? donorResults : DEMO_DONORS.filter(d =>
        (!filters.bloodGroup || d.blood_group === filters.bloodGroup) &&
        (!filters.city || d.city.toLowerCase().includes(filters.city.toLowerCase()))
      ));
      setFacilities(facilityResults.length > 0 ? facilityResults : DEMO_FACILITIES.filter(f =>
        (!filters.city || f.city.toLowerCase().includes(filters.city.toLowerCase())) &&
        (!filters.bloodGroup || f.blood_inventory?.some(inv => inv.blood_group === filters.bloodGroup))
      ));
    } catch (err) {
      // Supabase not connected — show demo data
      setDonors(DEMO_DONORS);
      setFacilities(DEMO_FACILITIES);
      toast('Showing demo data. Connect Supabase for live results.', { icon: 'ℹ️' });
    } finally {
      setLoading(false);
    }
  }

  async function handleContactRequest(donorId) {
    if (!isLoggedIn) {
      toast.error('Please login to send a contact request.');
      return;
    }
    setContactingId(donorId);
    try {
      await createContactRequest({ donorId, requesterId: user.id, message: 'I urgently need blood. Please help.' });
      toast.success('Contact request sent! The donor will be notified.');
    } catch (err) {
      toast.error(err.message ?? 'Failed to send request.');
    } finally {
      setContactingId(null);
    }
  }

  const isDemo = donors.some(d => d._demo) || facilities.some(f => f._demo);

  return (
    <div className="min-h-screen bg-grey-50">
      {/* Header */}
      <div className="hero-gradient text-white py-14">
        <div className="container-lg">
          <h1 className="text-4xl font-bold mb-2">Find Blood</h1>
          <p className="text-white/80">Search for donors and healthcare facilities near you</p>
        </div>
      </div>

      <div className="container-lg py-8">
        {/* Search Form */}
        <div className="card mb-8 shadow-lg">
          <form id="find-blood-form" onSubmit={handleSearch} className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-blood-600" />
              <h2 className="font-bold text-grey-800">Search Filters</h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="form-label">Blood Group</label>
                <select id="filter-blood-group" value={filters.bloodGroup}
                  onChange={e => setFilters({ ...filters, bloodGroup: e.target.value })}
                  className="form-select">
                  <option value="">All Blood Groups</option>
                  {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">City</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                  <select id="filter-city" value={filters.city}
                    onChange={e => setFilters({ ...filters, city: e.target.value })}
                    className="form-select pl-9">
                    <option value="">All Cities</option>
                    {INDIAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label">PIN Code</label>
                <input id="filter-pin" type="text" maxLength={6}
                  value={filters.pinCode}
                  onChange={e => setFilters({ ...filters, pinCode: e.target.value })}
                  placeholder="6-digit PIN" className="form-input" />
              </div>
              <div className="flex items-end gap-2">
                <button id="find-blood-search-btn" type="submit" className="btn-primary flex-1 justify-center">
                  <Search className="w-4 h-4" /> Search
                </button>
                {searched && (
                  <button type="button" onClick={() => { setFilters({ bloodGroup: '', city: '', pinCode: '', activeTab: 'donors' }); setSearched(false); setDonors([]); setFacilities([]); }}
                    className="btn-outline btn-sm px-3">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        {isDemo && searched && (
          <div className="alert-info mb-6 flex items-center gap-2">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>Demo Data Shown</strong> — Connect Supabase to display real donor and facility data.
              These records are for academic demonstration only.
            </span>
          </div>
        )}

        {/* Results */}
        {searched && (
          <>
            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-grey-100 rounded-xl mb-6 w-fit">
              <button id="tab-donors"
                onClick={() => setFilters({ ...filters, activeTab: 'donors' })}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${filters.activeTab === 'donors' ? 'bg-white text-blood-600 shadow-sm' : 'text-grey-600 hover:text-grey-800'}`}>
                <Users className="w-4 h-4 inline mr-1" />
                Donors ({donors.length})
              </button>
              <button id="tab-facilities"
                onClick={() => setFilters({ ...filters, activeTab: 'facilities' })}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${filters.activeTab === 'facilities' ? 'bg-white text-blood-600 shadow-sm' : 'text-grey-600 hover:text-grey-800'}`}>
                <Building2 className="w-4 h-4 inline mr-1" />
                Healthcare Facilities ({facilities.length})
              </button>
            </div>

            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : filters.activeTab === 'donors' ? (
              <DonorResults donors={donors} onContact={handleContactRequest} contactingId={contactingId} isLoggedIn={isLoggedIn} />
            ) : (
              <FacilityResults facilities={facilities} bloodGroup={filters.bloodGroup} />
            )}
          </>
        )}

        {!searched && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-blood-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-blood-400" />
            </div>
            <h3 className="text-xl font-bold text-grey-700 mb-2">Search for Blood</h3>
            <p className="text-grey-500 text-sm">Use the filters above to find donors and healthcare facilities.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DonorResults({ donors, onContact, contactingId, isLoggedIn }) {
  if (donors.length === 0) return (
    <div className="text-center py-12">
      <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
      <h3 className="font-bold text-grey-700 mb-1">No donors found</h3>
      <p className="text-grey-500 text-sm">Try expanding your search criteria or check a different city.</p>
    </div>
  );

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {donors.map(donor => (
        <div key={donor.id} className="card">
          {donor._demo && <div className="badge-normal text-xs mb-3 w-fit">Demo Record</div>}
          <div className="flex items-start justify-between mb-3">
            <div className="blood-badge">{donor.blood_group}</div>
            <span className={`${donor.availability_status === 'available' ? 'badge-active' : 'badge-pending'}`}>
              {donor.availability_status === 'available' ? '● Available' : '○ Unavailable'}
            </span>
          </div>
          <div className="space-y-1.5 text-sm text-grey-600 mb-4">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-grey-400" />
              <span>{donor.city}{donor.pin_code ? ` – ${donor.pin_code}` : ''}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-grey-400" />
              <span>Last donated: {donor.last_donation_date ? formatDate(donor.last_donation_date) : 'Not recorded'}</span>
            </div>
          </div>
          <div className="text-xs text-grey-400 mb-3 p-2 bg-grey-50 rounded-lg">
            🔒 Contact details shared only after donor consent
          </div>
          <button
            id={`contact-donor-${donor.id}`}
            onClick={() => onContact(donor.id)}
            disabled={!donor.consent_to_contact || contactingId === donor.id}
            className="btn-primary btn-sm w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {contactingId === donor.id ? <LoadingSpinner size="sm" /> : 'Request Contact'}
          </button>
          {!isLoggedIn && (
            <p className="text-xs text-grey-400 text-center mt-2">
              <Link to="/login" className="text-blood-600 hover:underline">Login</Link> to send requests
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function FacilityResults({ facilities, bloodGroup }) {
  if (facilities.length === 0) return (
    <div className="text-center py-12">
      <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
      <h3 className="font-bold text-grey-700 mb-1">No facilities found</h3>
      <p className="text-grey-500 text-sm">Try searching a different city or blood group.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="alert-warning text-xs flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        Blood availability is self-reported by facilities. Always confirm directly before visiting. Last updated timestamps are shown.
      </div>
      {facilities.map(facility => (
        <div key={facility.id} className="card">
          {facility._demo && <div className="badge-normal text-xs mb-3 w-fit">Demo Record</div>}
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-grey-900">{facility.name}</h3>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              </div>
              <span className="badge-normal capitalize">{facility.facility_type?.replace('_', ' ')}</span>
            </div>
            {facility.phone && (
              <a href={`tel:${facility.phone}`} className="flex items-center gap-1 text-blood-600 text-sm hover:underline">
                <Phone className="w-3.5 h-3.5" />{facility.phone}
              </a>
            )}
          </div>
          <div className="text-sm text-grey-600 mb-4">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-grey-400" />
              {facility.address ? `${facility.address}, ` : ''}{facility.city}{facility.pin_code ? ` – ${facility.pin_code}` : ''}
            </div>
          </div>
          {facility.blood_inventory?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-grey-500 mb-2 uppercase tracking-wide">Blood Availability (Reported)</p>
              <div className="flex flex-wrap gap-2">
                {facility.blood_inventory.map(inv => (
                  <div key={inv.blood_group}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${bloodGroup === inv.blood_group ? 'bg-blood-100 border-2 border-blood-400' : 'bg-grey-100'}`}>
                    <span className="font-bold text-blood-700">{inv.blood_group}</span>
                    <span className="text-grey-600">{inv.units_available} units</span>
                    <span className="text-grey-400 text-xs">· {new Date(inv.updated_at).toLocaleDateString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

