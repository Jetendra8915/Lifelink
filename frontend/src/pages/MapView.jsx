import { useState, useEffect, useRef } from 'react';
import { MapPin, Info, AlertTriangle, Locate } from 'lucide-react';
import { fuzzCoordinates } from '../utils/distanceCalc';

// Demo map markers
const DEMO_FACILITIES = [
  { id: 'f1', name: 'Apollo Hospitals', facility_type: 'hospital', city: 'Bangalore', lat: 12.8456, lon: 77.6603, address: 'Bannerghatta Rd, Bangalore' },
  { id: 'f2', name: 'Rotary Blood Bank', facility_type: 'blood_bank', city: 'Delhi', lat: 28.6139, lon: 77.2090, address: 'Tughlak Road, New Delhi' },
  { id: 'f3', name: 'KEM Hospital', facility_type: 'hospital', city: 'Mumbai', lat: 19.0038, lon: 72.8420, address: 'Parel, Mumbai' },
  { id: 'f4', name: 'AIIMS Blood Centre', facility_type: 'blood_bank', city: 'Delhi', lat: 28.5672, lon: 77.2100, address: 'Ansari Nagar, Delhi' },
  { id: 'f5', name: 'Lilavati Hospital', facility_type: 'hospital', city: 'Mumbai', lat: 19.0607, lon: 72.8259, address: 'Bandra, Mumbai' },
  { id: 'f6', name: 'CMC Blood Bank', facility_type: 'blood_bank', city: 'Vellore', lat: 12.9242, lon: 79.1324, address: 'Vellore, TN' },
];
const DEMO_DONORS = [
  { id: 'd1', blood_group: 'O+', city: 'Bangalore', lat: 12.9716, lon: 77.5946 },
  { id: 'd2', blood_group: 'A+', city: 'Mumbai', lat: 19.0760, lon: 72.8777 },
  { id: 'd3', blood_group: 'B+', city: 'Delhi', lat: 28.7041, lon: 77.1025 },
  { id: 'd4', blood_group: 'AB-', city: 'Chennai', lat: 13.0827, lon: 80.2707 },
];
const CITY_CENTERS = {
  Bangalore: [12.9716, 77.5946], Delhi: [28.7041, 77.1025], Mumbai: [19.0760, 72.8777],
  Chennai: [13.0827, 80.2707], Hyderabad: [17.3850, 78.4867], Pune: [18.5204, 73.8567],
  Kolkata: [22.5726, 88.3639], Ahmedabad: [23.0225, 72.5714], Jaipur: [26.9124, 75.7873],
  Vellore: [12.9165, 79.1325],
};

export default function MapView() {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);
  const [selectedCity, setSelectedCity] = useState('');
  const [showFacilities, setShowFacilities] = useState(true);
  const [showDonors, setShowDonors] = useState(true);
  const [userLocated, setUserLocated] = useState(false);

  useEffect(() => {
    if (leafletMapRef.current) return;
    let map;

    async function initMap() {
      try {
        const L = (await import('leaflet')).default;
        await import('leaflet/dist/leaflet.css');

        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        if (!mapRef.current) return;

        map = L.map(mapRef.current, { center: [20.5937, 78.9629], zoom: 5 });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 18,
        }).addTo(map);

        leafletMapRef.current = map;
        setMapReady(true);
      } catch (err) {
        console.error('Map init error:', err);
      }
    }

    initMap();
    return () => { if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null; } };
  }, []);

  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return;

    async function addMarkers() {
      const L = (await import('leaflet')).default;
      const map = leafletMapRef.current;

      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      if (showFacilities) {
        DEMO_FACILITIES.forEach(f => {
          const color = f.facility_type === 'hospital' ? '#2563eb' : '#8B0000';
          const emoji = f.facility_type === 'hospital' ? '🏥' : '🩸';
          const icon = L.divIcon({
            html: `<div style="background:${color};width:30px;height:30px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1">${emoji}</div>`,
            className: '', iconSize: [30, 30], iconAnchor: [15, 15],
          });
          const marker = L.marker([f.lat, f.lon], { icon }).addTo(map).bindPopup(
            `<div style="min-width:180px"><strong>${f.name}</strong><br><span style="color:#6b7280;font-size:12px;text-transform:capitalize">${f.facility_type.replace('_', ' ')}</span><br><span style="font-size:12px">${f.address}</span><br><span style="font-size:10px;color:#9ca3af">★ Demo marker</span></div>`
          );
          markersRef.current.push(marker);
        });
      }

      if (showDonors) {
        DEMO_DONORS.forEach(d => {
          const [fLat, fLon] = fuzzCoordinates(d.lat, d.lon);
          const icon = L.divIcon({
            html: `<div style="background:#16a34a;width:24px;height:24px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;font-size:9px;color:white;font-weight:700">${d.blood_group}</div>`,
            className: '', iconSize: [24, 24], iconAnchor: [12, 12],
          });
          const marker = L.marker([fLat, fLon], { icon }).addTo(map).bindPopup(
            `<div><strong>Voluntary Donor</strong><br>Blood Group: <strong>${d.blood_group}</strong><br><span style="font-size:12px">Near ${d.city}</span><br><span style="font-size:10px;color:#9ca3af">📍 Approximate location only<br>★ Demo marker</span></div>`
          );
          markersRef.current.push(marker);
        });
      }
    }

    addMarkers();
  }, [mapReady, showFacilities, showDonors]);

  function handleCitySearch() {
    if (!selectedCity || !leafletMapRef.current) return;
    const coords = CITY_CENTERS[selectedCity];
    if (coords) leafletMapRef.current.flyTo(coords, 11, { duration: 1.5 });
  }

  function handleLocateMe() {
    if (!navigator.geolocation) { alert('Geolocation not supported by your browser.'); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      const L = (await import('leaflet')).default;
      const map = leafletMapRef.current;
      if (!map) return;
      const icon = L.divIcon({
        html: `<div style="background:#7c3aed;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
        className: '', iconSize: [24, 24], iconAnchor: [12, 12],
      });
      const marker = L.marker([lat, lon], { icon }).addTo(map).bindPopup('<strong>Your Location</strong>').openPopup();
      markersRef.current.push(marker);
      map.flyTo([lat, lon], 12, { duration: 1.5 });
      setUserLocated(true);
    }, () => alert('Could not get your location. Please allow location access or search manually.'));
  }

  return (
    <div className="min-h-screen bg-grey-50">
      <div className="hero-gradient text-white py-14">
        <div className="container-lg">
          <h1 className="text-4xl font-bold mb-2">Blood Resource Map</h1>
          <p className="text-white/80">View blood banks, hospitals, and approximate donor locations across India</p>
        </div>
      </div>

      <div className="container-lg py-8">
        <div className="alert-info mb-6 flex items-center gap-2 text-sm">
          <Info className="w-4 h-4 flex-shrink-0" />
          <strong>Demo Map</strong> — Showing sample markers. Connect Supabase to load real registered facilities and donors.
        </div>
        <div className="alert-warning mb-6 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Donor locations are approximate (±2 km) for privacy. Exact residential coordinates are never displayed.
        </div>

        <div className="card mb-4 shadow-sm">
          <div className="grid sm:grid-cols-4 gap-3 items-end flex-wrap">
            <div>
              <label className="form-label">Jump to City</label>
              <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} className="form-select">
                <option value="">Select city</option>
                {Object.keys(CITY_CENTERS).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <button id="map-go-city" onClick={handleCitySearch} className="btn-primary w-full justify-center">
                <MapPin className="w-4 h-4" /> Go
              </button>
            </div>
            <div>
              <button id="map-locate-me" onClick={handleLocateMe}
                className={`btn-outline w-full justify-center ${userLocated ? 'border-purple-400 text-purple-700' : ''}`}>
                <Locate className="w-4 h-4" /> {userLocated ? 'Located!' : 'Locate Me'}
              </button>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-grey-700">
                <input type="checkbox" checked={showFacilities} onChange={e => setShowFacilities(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                Facilities
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-grey-700">
                <input type="checkbox" checked={showDonors} onChange={e => setShowDonors(e.target.checked)} className="w-4 h-4 accent-green-600" />
                Donors
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden shadow-lg border border-grey-200">
          <div ref={mapRef} style={{ height: '520px', width: '100%', background: '#e8f0fe' }} />
        </div>

        <div className="card mt-4 shadow-sm">
          <p className="text-sm font-bold text-grey-700 mb-3">Map Legend</p>
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2"><span className="text-xl">🏥</span><span className="text-grey-600">Hospital (Blue)</span></div>
            <div className="flex items-center gap-2"><span className="text-xl">🩸</span><span className="text-grey-600">Blood Bank (Dark Red)</span></div>
            <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-green-600 border-2 border-white shadow-sm"></div><span className="text-grey-600">Donor (approximate)</span></div>
            <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-purple-600 border-2 border-white shadow-sm"></div><span className="text-grey-600">Your Location</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
