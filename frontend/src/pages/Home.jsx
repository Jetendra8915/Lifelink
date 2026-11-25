import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart, Search, MapPin, Clock, Shield, Users, Building2,
  Droplets, ChevronRight, ArrowRight, Phone, AlertTriangle,
  CheckCircle2, Star, Activity
} from 'lucide-react';
import { BLOOD_GROUPS } from '../utils/bloodGroups';

// ─── Demo Stats (labelled as demo) ───────────────────────────────────────────
const DEMO_STATS = [
  { label: 'Registered Donors', value: '12,400+', icon: Users, color: 'text-blood-600' },
  { label: 'Blood Banks', value: '340+', icon: Building2, color: 'text-blue-600' },
  { label: 'Lives Helped', value: '8,200+', icon: Heart, color: 'text-green-600' },
  { label: 'Cities Covered', value: '120+', icon: MapPin, color: 'text-purple-600' },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: Search,
    title: 'Search',
    description: 'Enter your required blood group and location to instantly find nearby donors and blood banks.',
    color: 'bg-blood-50 text-blood-600',
  },
  {
    step: '02',
    icon: Phone,
    title: 'Connect',
    description: 'Send a contact request to donors or directly reach out to verified healthcare facilities.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    step: '03',
    icon: Heart,
    title: 'Save a Life',
    description: 'Coordinate with donors and hospitals to get the blood needed as quickly as possible.',
    color: 'bg-green-50 text-green-600',
  },
];

const BLOOD_GROUP_FACTS = [
  { group: 'O-', fact: 'Universal Donor', color: 'bg-green-600', text: 'Can donate to all blood types' },
  { group: 'AB+', fact: 'Universal Recipient', color: 'bg-purple-600', text: 'Can receive from all blood types' },
  { group: 'O+', fact: 'Most Common', color: 'bg-blue-600', text: 'Found in ~37% of the population' },
  { group: 'AB-', fact: 'Rarest Type', color: 'bg-orange-600', text: 'Found in less than 1% of people' },
];

// Demo facilities – clearly labelled
const DEMO_FACILITIES = [
  { name: 'Apollo Hospitals', city: 'Bangalore', type: 'Hospital', verified: true },
  { name: 'Rotary Blood Bank', city: 'Delhi', type: 'Blood Bank', verified: true },
  { name: 'AIIMS Blood Centre', city: 'Delhi', type: 'Blood Bank', verified: true },
  { name: 'Lilavati Hospital', city: 'Mumbai', type: 'Hospital', verified: true },
  { name: 'CMC Blood Bank', city: 'Vellore', type: 'Blood Bank', verified: true },
  { name: 'KEM Hospital', city: 'Mumbai', type: 'Hospital', verified: true },
];

export default function Home() {
  const [searchBloodGroup, setSearchBloodGroup] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const navigate = useNavigate();

  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchBloodGroup) params.set('blood_group', searchBloodGroup);
    if (searchCity) params.set('city', searchCity);
    navigate(`/find-blood?${params.toString()}`);
  }

  return (
    <div className="overflow-hidden">
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="hero-gradient text-white relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-white"
              style={{
                width: `${(i + 2) * 150}px`,
                height: `${(i + 2) * 150}px`,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
        </div>

        <div className="container-lg relative z-10 py-24 md:py-32">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              India's Blood Coordination Platform
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
              Every Drop Counts.
              <br />
              <span className="text-blood-200">Every Life Matters.</span>
            </h1>

            <p className="text-xl md:text-2xl text-white/80 mb-10 max-w-2xl leading-relaxed">
              Connecting blood donors, hospitals, and people in need through one reliable platform across India.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                id="hero-find-blood-btn"
                to="/find-blood"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blood-700 font-bold rounded-xl hover:bg-blood-50 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-lg"
              >
                <Search className="w-5 h-5" />
                Find Blood Now
              </Link>
              <Link
                id="hero-donor-btn"
                to="/become-donor"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-transparent text-white font-bold rounded-xl border-2 border-white/40 hover:bg-white/10 transition-all duration-200 hover:-translate-y-0.5 text-lg"
              >
                <Heart className="w-5 h-5 fill-white" />
                Become a Donor
              </Link>
            </div>

            {/* Emergency strip */}
            <div className="mt-10 inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <AlertTriangle className="w-5 h-5 text-yellow-300 flex-shrink-0" />
              <span className="text-sm text-white/90">
                <strong className="text-yellow-300">Emergency?</strong>{' '}
                <Link to="/emergency" className="underline hover:text-yellow-200">Submit an urgent blood request</Link>
                {' '}or call <strong>104</strong> (National Blood Bank Helpline)
              </span>
            </div>
          </div>
        </div>

        {/* Wave bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 80L60 66.7C120 53.3 240 26.7 360 20C480 13.3 600 26.7 720 33.3C840 40 960 40 1080 36.7C1200 33.3 1320 26.7 1380 23.3L1440 20V80H1380C1320 80 1200 80 1080 80C960 80 840 80 720 80C600 80 480 80 360 80C240 80 120 80 60 80H0Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── QUICK SEARCH ─────────────────────────────────────────────────── */}
      <section className="bg-white py-10">
        <div className="container-lg">
          <div className="bg-white rounded-2xl shadow-xl border border-grey-200 p-6 md:p-8 -mt-6 relative z-10">
            <h2 className="text-xl font-bold text-grey-900 mb-5 flex items-center gap-2">
              <Search className="w-5 h-5 text-blood-600" />
              Search Blood Availability
            </h2>
            <form id="quick-search-form" onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="form-label">Blood Group Required</label>
                <select
                  id="search-blood-group"
                  value={searchBloodGroup}
                  onChange={e => setSearchBloodGroup(e.target.value)}
                  className="form-select"
                >
                  <option value="">All Blood Groups</option>
                  {BLOOD_GROUPS.map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="form-label">City</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                  <input
                    id="search-city"
                    type="text"
                    value={searchCity}
                    onChange={e => setSearchCity(e.target.value)}
                    placeholder="e.g. Mumbai, Delhi, Bangalore…"
                    className="form-input pl-9"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <button id="search-submit-btn" type="submit" className="btn-primary w-full md:w-auto">
                  <Search className="w-4 h-4" />
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section className="bg-grey-50 py-14">
        <div className="container-lg">
          <p className="text-center text-xs text-grey-400 mb-6 uppercase tracking-wider font-semibold">
            ★ Demo Statistics – Representative data for academic demonstration purposes ★
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {DEMO_STATS.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card text-center">
                <Icon className={`w-8 h-8 mx-auto mb-3 ${color}`} />
                <div className="text-3xl font-bold text-grey-900 mb-1">{value}</div>
                <div className="text-sm text-grey-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="section bg-white">
        <div className="container-lg">
          <h2 className="section-title">How LifeLink Works</h2>
          <p className="section-subtitle">
            Three simple steps to connect donors, hospitals, and patients in need.
          </p>
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line (desktop) */}
            <div className="hidden md:block absolute top-14 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-blood-200 via-blue-200 to-green-200" />

            {HOW_IT_WORKS.map(({ step, icon: Icon, title, description, color }, i) => (
              <div key={step} className="relative text-center group">
                <div className={`w-16 h-16 rounded-2xl ${color} flex items-center justify-center mx-auto mb-5 shadow-md group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className="w-8 h-8" />
                </div>
                <div className="text-xs font-bold text-grey-400 uppercase tracking-widest mb-2">Step {step}</div>
                <h3 className="text-xl font-bold text-grey-900 mb-3">{title}</h3>
                <p className="text-grey-500 leading-relaxed text-sm">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BLOOD GROUP INFO ──────────────────────────────────────────────── */}
      <section className="section bg-grey-50">
        <div className="container-lg">
          <h2 className="section-title">Blood Group Information</h2>
          <p className="section-subtitle">
            Key facts about blood groups to help you understand compatibility.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {BLOOD_GROUP_FACTS.map(({ group, fact, color, text }) => (
              <div key={group} className="card text-center group hover:scale-105 transition-transform duration-200">
                <div className={`w-16 h-16 rounded-full ${color} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                  <span className="text-2xl font-bold text-white">{group}</span>
                </div>
                <div className="text-sm font-bold text-grey-800 mb-1">{fact}</div>
                <div className="text-xs text-grey-500">{text}</div>
              </div>
            ))}
          </div>

          {/* All blood groups grid */}
          <div className="card-flat">
            <h3 className="text-lg font-bold text-grey-800 mb-4 text-center">All Blood Groups</h3>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
              {BLOOD_GROUPS.map(bg => (
                <Link
                  key={bg}
                  to={`/find-blood?blood_group=${bg}`}
                  className="blood-badge hover:scale-110 transition-transform duration-150 cursor-pointer"
                  title={`Find ${bg} blood`}
                >
                  {bg}
                </Link>
              ))}
            </div>
            <p className="text-xs text-grey-400 text-center mt-4">
              Click any blood group to search for availability
            </p>
          </div>

          {/* Disclaimer */}
          <div className="alert-warning mt-6 flex items-start gap-2">
            <Shield className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs">
              <strong>Medical Disclaimer:</strong> Blood compatibility information shown here is for general awareness only.
              Actual transfusion compatibility must always be determined by qualified medical professionals and licensed blood banks through proper crossmatching procedures.
            </p>
          </div>
        </div>
      </section>

      {/* ── BECOME A DONOR ───────────────────────────────────────────────── */}
      <section className="section">
        <div className="container-lg">
          <div className="rounded-3xl hero-gradient text-white p-10 md:p-16 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-80 h-80 opacity-10">
              <Heart className="w-full h-full fill-white" />
            </div>
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm mb-6">
                <Droplets className="w-4 h-4 text-blood-200" />
                One donation can save up to 3 lives
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">Be Someone's Hero Today</h2>
              <p className="text-xl text-white/80 mb-8 leading-relaxed">
                Register as a voluntary blood donor and help patients in your city find the blood they urgently need.
                Your single act of generosity can save up to three lives.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  id="become-donor-cta-btn"
                  to="/become-donor"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blood-700 font-bold rounded-xl hover:bg-blood-50 transition-all duration-200 shadow-lg hover:-translate-y-0.5 text-lg"
                >
                  <Heart className="w-5 h-5 fill-blood-700" />
                  Register as Donor
                </Link>
                <Link
                  to="/about"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-transparent text-white font-bold rounded-xl border-2 border-white/40 hover:bg-white/10 transition-all duration-200 hover:-translate-y-0.5 text-lg"
                >
                  Learn More <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── REGISTERED FACILITIES (DEMO) ─────────────────────────────────── */}
      <section className="section bg-grey-50">
        <div className="container-lg">
          <h2 className="section-title">Registered Healthcare Facilities</h2>
          <p className="section-subtitle">
            Verified hospitals and blood banks partnered with LifeLink across India.
          </p>
          <p className="text-center text-xs text-grey-400 mb-8 uppercase tracking-wider font-semibold">
            ★ Demo Data – For academic demonstration purposes only ★
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {DEMO_FACILITIES.map(({ name, city, type, verified }) => (
              <div key={name} className="card flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${type === 'Hospital' ? 'bg-blue-50' : 'bg-blood-50'}`}>
                  {type === 'Hospital'
                    ? <Building2 className="w-6 h-6 text-blue-600" />
                    : <Droplets className="w-6 h-6 text-blood-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-grey-900 truncate">{name}</h3>
                    {verified && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                  </div>
                  <p className="text-sm text-grey-500">{city} • {type}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link to="/blood-banks" className="btn-secondary">
              View All Facilities <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── EMERGENCY CTA ─────────────────────────────────────────────────── */}
      <section className="section bg-blood-700">
        <div className="container-lg text-center text-white">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 mb-6 emergency-pulse">
            <Activity className="w-10 h-10" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Need Blood Urgently?</h2>
          <p className="text-xl text-white/80 mb-8 max-w-xl mx-auto">
            Submit an emergency blood request and we'll help connect you with donors and blood banks as quickly as possible.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              id="emergency-cta-btn"
              to="/emergency"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blood-700 font-bold rounded-xl hover:bg-blood-50 transition-all duration-200 shadow-lg hover:-translate-y-0.5 text-lg"
            >
              <AlertTriangle className="w-5 h-5" />
              Submit Emergency Request
            </Link>
            <a
              href="tel:104"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-transparent text-white font-bold rounded-xl border-2 border-white/40 hover:bg-white/10 transition-all duration-200 hover:-translate-y-0.5 text-lg"
            >
              <Phone className="w-5 h-5" />
              Call 104 Helpline
            </a>
          </div>
          <p className="text-sm text-white/50 mt-6">
            104 is the National Blood Bank Helpline in India — available 24/7
          </p>
        </div>
      </section>

      {/* ── ABOUT ─────────────────────────────────────────────────────────── */}
      <section className="section bg-white">
        <div className="container-lg">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blood-50 text-blood-700 text-sm font-semibold mb-6">
                <Star className="w-4 h-4 fill-blood-700" />
                About LifeLink
              </div>
              <h2 className="text-4xl font-bold text-grey-900 mb-5">
                Building a Smarter Blood Ecosystem in India
              </h2>
              <p className="text-grey-600 leading-relaxed mb-5">
                LifeLink is a centralized information and coordination platform developed as an academic project
                for B.Tech CSE (Data Science). It aims to bridge the gap between blood donors, healthcare
                facilities, and patients who urgently need blood.
              </p>
              <p className="text-grey-600 leading-relaxed mb-8">
                By bringing all stakeholders onto a single platform with smart search, real-time availability
                reporting, and privacy-safe donor matching, LifeLink makes it easier to find blood when every
                second counts.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/about" className="btn-primary">
                  Learn More <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/register" className="btn-secondary">
                  Join LifeLink
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Shield, label: 'Privacy Protected', desc: 'Donor details shared only with consent', color: 'text-blue-600 bg-blue-50' },
                { icon: Clock, label: 'Real-Time Updates', desc: 'Blood availability updated by facilities', color: 'text-green-600 bg-green-50' },
                { icon: MapPin, label: 'Location-Based', desc: 'Find nearby donors and hospitals', color: 'text-purple-600 bg-purple-50' },
                { icon: Users, label: 'Community Driven', desc: 'Thousands of voluntary donors', color: 'text-blood-600 bg-blood-50' },
              ].map(({ icon: Icon, label, desc, color }) => (
                <div key={label} className="card">
                  <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-grey-900 text-sm mb-1">{label}</h4>
                  <p className="text-xs text-grey-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
