import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Droplets, MapPin, Phone, CheckCircle2, Search, AlertTriangle, Info } from 'lucide-react';
import { getAllApprovedFacilities } from '../services/facilityService';
import { INDIAN_CITIES } from '../utils/validators';
import { BLOOD_GROUPS } from '../utils/bloodGroups';
import { SkeletonCard } from '../components/LoadingSpinner';

const DEMO_FACILITIES = [
  { id: 'f1', name: 'Apollo Hospitals', facility_type: 'hospital', address: 'Bannerghatta Road, Bangalore', city: 'Bangalore', pin_code: '560076', phone: '080-26304050', blood_inventory: [{ blood_group: 'O+', units_available: 8 }, { blood_group: 'A+', units_available: 5 }, { blood_group: 'B+', units_available: 3 }], _demo: true },
  { id: 'f2', name: 'Rotary Blood Bank', facility_type: 'blood_bank', address: 'Tughlak Road, New Delhi', city: 'Delhi', pin_code: '110011', phone: '011-23711271', blood_inventory: [{ blood_group: 'B+', units_available: 12 }, { blood_group: 'O-', units_available: 3 }, { blood_group: 'AB+', units_available: 2 }], _demo: true },
  { id: 'f3', name: 'KEM Hospital Blood Bank', facility_type: 'blood_bank', address: 'Acharya Donde Marg, Parel', city: 'Mumbai', pin_code: '400012', phone: '022-24107000', blood_inventory: [{ blood_group: 'AB+', units_available: 4 }, { blood_group: 'A-', units_available: 2 }], _demo: true },
  { id: 'f4', name: 'AIIMS Blood Centre', facility_type: 'blood_bank', address: 'Ansari Nagar, New Delhi', city: 'Delhi', pin_code: '110029', phone: '011-26593308', blood_inventory: [{ blood_group: 'O-', units_available: 6 }, { blood_group: 'B-', units_available: 2 }], _demo: true },
  { id: 'f5', name: 'Lilavati Hospital', facility_type: 'hospital', address: 'A-791, Bandra Reclamation', city: 'Mumbai', pin_code: '400050', phone: '022-26751000', blood_inventory: [{ blood_group: 'A+', units_available: 10 }, { blood_group: 'O+', units_available: 7 }], _demo: true },
  { id: 'f6', name: 'CMC Blood Bank', facility_type: 'blood_bank', address: 'Ida Scudder Road, Vellore', city: 'Vellore', pin_code: '632004', phone: '0416-2281000', blood_inventory: [{ blood_group: 'B+', units_available: 9 }, { blood_group: 'AB-', units_available: 1 }], _demo: true },
];

export default function BloodBanks() {
  const [facilities, setFacilities] = useState(DEMO_FACILITIES);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [isDemo, setIsDemo] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getAllApprovedFacilities();
        if (data.length > 0) { setFacilities(data); setIsDemo(false); }
      } catch { /* use demo data */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const filtered = facilities.filter(f =>
    (!city || f.city.toLowerCase().includes(city.toLowerCase())) &&
    (!bloodGroup || f.blood_inventory?.some(inv => inv.blood_group === bloodGroup && inv.units_available > 0))
  );

  return (
    <div className="min-h-screen bg-grey-50">
      <div className="hero-gradient text-white py-14">
        <div className="container-lg">
          <h1 className="text-4xl font-bold mb-2">Blood Banks & Hospitals</h1>
          <p className="text-white/80">Verified healthcare facilities registered with LifeLink across India</p>
        </div>
      </div>

      <div className="container-lg py-8">
        {/* Filters */}
        <div className="card mb-8 shadow-sm">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Filter by City</label>
              <select value={city} onChange={e => setCity(e.target.value)} className="form-select">
                <option value="">All Cities</option>
                {INDIAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Blood Group Available</label>
              <select value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} className="form-select">
                <option value="">Any Blood Group</option>
                {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={() => { setCity(''); setBloodGroup(''); }} className="btn-outline btn-sm w-full justify-center">
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {isDemo && (
          <div className="alert-info mb-6 flex items-center gap-2 text-sm">
            <Info className="w-4 h-4 flex-shrink-0" />
            <strong>Demo Data</strong> — Connect Supabase to show real registered facilities.
          </div>
        )}

        <div className="alert-warning mb-6 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Blood stock information is self-reported by facilities. Always confirm availability directly by phone before visiting.
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
            <h3 className="font-bold text-grey-700">No facilities found for these filters</h3>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(facility => (
              <div key={facility.id} className="card hover:shadow-xl transition-shadow">
                {facility._demo && <div className="badge-normal text-xs mb-3 w-fit">Demo Record</div>}
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${facility.facility_type === 'hospital' ? 'bg-blue-50' : 'bg-blood-50'}`}>
                    {facility.facility_type === 'hospital'
                      ? <Building2 className="w-6 h-6 text-blue-600" />
                      : <Droplets className="w-6 h-6 text-blood-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-grey-900 truncate">{facility.name}</h3>
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" title="Verified" />
                    </div>
                    <span className="badge-normal capitalize text-xs">{facility.facility_type?.replace('_', ' ')}</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm text-grey-600 mb-4">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-grey-400 mt-0.5 flex-shrink-0" />
                    <span>{facility.address}, {facility.city} – {facility.pin_code}</span>
                  </div>
                  {facility.phone && (
                    <a href={`tel:${facility.phone}`} className="flex items-center gap-1.5 text-blood-600 hover:underline">
                      <Phone className="w-3.5 h-3.5" />{facility.phone}
                    </a>
                  )}
                </div>

                {facility.blood_inventory?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-grey-500 uppercase tracking-wide mb-2">Reported Stock</p>
                    <div className="flex flex-wrap gap-1.5">
                      {facility.blood_inventory.map(inv => (
                        <span key={inv.blood_group} className="blood-badge-sm text-xs">
                          {inv.blood_group}: {inv.units_available}u
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <Link to={`/find-blood?city=${facility.city}`}
                  className="btn-secondary btn-sm mt-4 w-full justify-center">
                  Search in {facility.city}
                </Link>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <div className="inline-flex flex-col items-center gap-3 p-6 rounded-2xl bg-blood-50 border border-blood-200">
            <Building2 className="w-8 h-8 text-blood-600" />
            <div>
              <p className="font-bold text-grey-800">Are you a hospital or blood bank?</p>
              <p className="text-sm text-grey-500 mt-1">Register your facility to appear in search results.</p>
            </div>
            <Link to="/register" className="btn-primary btn-sm">Register Your Facility</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
