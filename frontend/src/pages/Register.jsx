import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart, Mail, Lock, Eye, EyeOff, User, Phone,
  MapPin, AlertCircle, ChevronRight, Droplets
} from 'lucide-react';
import { signUp, completePendingRegistration } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { BLOOD_GROUPS } from '../utils/bloodGroups';
import { validateEmail, validatePassword, validatePhone, INDIAN_CITIES } from '../utils/validators';
import toast from 'react-hot-toast';
import { LoadingSpinner } from '../components/LoadingSpinner';

const ROLES = [
  { id: 'patient', label: 'Patient / Family Member', desc: 'Search for blood and submit requests', icon: '🏥' },
  { id: 'donor', label: 'Voluntary Donor', desc: 'Register as a blood donor', icon: '💉' },
  { id: 'facility', label: 'Healthcare Facility', desc: 'Hospital or blood bank', icon: '🏨' },
];

export default function Register() {
  const [step, setStep] = useState(1); // 1 = role select, 2 = details
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  // Common fields
  const [common, setCommon] = useState({
    fullName: '', email: '', password: '', confirmPassword: '', phone: '', city: '',
  });

  // Donor-specific
  const [donorData, setDonorData] = useState({
    bloodGroup: '', age: '', gender: '', pinCode: '', availabilityStatus: 'available',
    consentToContact: false, lastDonationDate: '',
  });

  // Facility-specific
  const [facilityData, setFacilityData] = useState({
    facilityType: 'hospital', registrationNumber: '', address: '', pinCode: '',
    contactPerson: '', websiteUrl: '',
  });

  function validateCommon() {
    if (!common.fullName.trim()) return 'Full name is required.';
    if (!validateEmail(common.email)) return 'Enter a valid email address.';
    if (!validatePhone(common.phone)) return 'Enter a valid 10-digit Indian mobile number.';
    if (!validatePassword(common.password)) return 'Password must be at least 8 characters.';
    if (common.password !== common.confirmPassword) return 'Passwords do not match.';
    if (!common.city) return 'Please select your city.';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const validationError = validateCommon();
    if (validationError) { setError(validationError); return; }

    if (role === 'donor' && !donorData.bloodGroup) { setError('Please select your blood group.'); return; }
    if (role === 'donor' && !donorData.age) { setError('Please enter your age.'); return; }
    if (role === 'donor' && (Number(donorData.age) < 18 || Number(donorData.age) > 65)) {
      setError('Donors must be between 18 and 65 years old.'); return;
    }
    if (role === 'facility' && !facilityData.facilityType) { setError('Please select facility type.'); return; }

    setLoading(true);
    try {
      // Role-specific details saved with the signup. They are used only to create the
      // user's OWN donor/facility row (DB trigger then promotes the role).
      let pendingRegistration = null;
      if (role === 'donor') {
        pendingRegistration = {
          type: 'donor',
          data: {
            blood_group: donorData.bloodGroup,
            age: Number(donorData.age),
            gender: donorData.gender || null,
            city: common.city,
            pin_code: donorData.pinCode || null,
            availability_status: 'available',
            consent_to_contact: donorData.consentToContact,
            last_donation_date: donorData.lastDonationDate || null,
            is_active: true,
          },
        };
      } else if (role === 'facility') {
        pendingRegistration = {
          type: 'facility',
          data: {
            name: common.fullName,
            facility_type: facilityData.facilityType,
            registration_number: facilityData.registrationNumber || null,
            email: common.email,
            phone: common.phone,
            address: facilityData.address,
            city: common.city,
            pin_code: facilityData.pinCode || null,
            contact_person: facilityData.contactPerson || common.fullName,
          },
        };
      }

      // 1. Create auth user (safe 'patient' default role assigned by DB trigger)
      const { user, session } = await signUp({
        email: common.email,
        password: common.password,
        fullName: common.fullName,
        phone: common.phone,
        city: common.city,
        pendingRegistration,
      });

      if (!user) throw new Error('Registration failed. Please try again.');

      // 2a. Email confirmation required: no session yet. Details are finished on first login.
      if (!session) {
        toast.success('Account created! Check your email and click the confirmation link, then log in.', { duration: 8000 });
        navigate('/login');
        return;
      }

      // 2b. Session exists (confirmation disabled): finish registration right away
      await completePendingRegistration(user);
      await refreshProfile(user.id);
      toast.success('Registration successful! Welcome to LifeLink.');
      const paths = { patient: '/dashboard/patient', donor: '/dashboard/donor', facility: '/dashboard/facility' };
      navigate(paths[role] ?? '/');
    } catch (err) {
      setError(err.message ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Step 1: Role Selection ────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="min-h-screen bg-grey-50 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 font-bold text-2xl text-blood-700">
              <div className="w-10 h-10 bg-blood-600 rounded-xl flex items-center justify-center shadow-md">
                <Heart className="w-6 h-6 text-white fill-white" />
              </div>
              LifeLink
            </Link>
            <h1 className="text-2xl font-bold text-grey-900 mt-5 mb-1">Create your account</h1>
            <p className="text-grey-500 text-sm">Choose how you want to use LifeLink</p>
          </div>

          <div className="space-y-3">
            {ROLES.map(({ id, label, desc, icon }) => (
              <button
                key={id}
                id={`role-${id}`}
                onClick={() => setRole(id)}
                className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-150 ${
                  role === id
                    ? 'border-blood-500 bg-blood-50 shadow-md'
                    : 'border-grey-200 bg-white hover:border-blood-200 hover:bg-grey-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{icon}</span>
                  <div className="flex-1">
                    <div className="font-bold text-grey-900">{label}</div>
                    <div className="text-sm text-grey-500 mt-0.5">{desc}</div>
                  </div>
                  {role === id && (
                    <div className="w-6 h-6 rounded-full bg-blood-600 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          <button
            id="role-next-btn"
            onClick={() => role && setStep(2)}
            disabled={!role}
            className="btn-primary w-full justify-center mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue <ChevronRight className="w-4 h-4" />
          </button>

          <p className="text-sm text-grey-500 text-center mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-blood-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  // ── Step 2: Registration Form ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-grey-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-bold text-2xl text-blood-700">
            <div className="w-10 h-10 bg-blood-600 rounded-xl flex items-center justify-center shadow-md">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
            LifeLink
          </Link>
          <h1 className="text-2xl font-bold text-grey-900 mt-5 mb-1">
            {role === 'patient' ? 'Patient / Family Registration' :
             role === 'donor' ? 'Donor Registration' : 'Healthcare Facility Registration'}
          </h1>
          <button onClick={() => setStep(1)} className="text-sm text-blood-600 hover:underline mt-1">
            ← Change role
          </button>
        </div>

        <div className="card shadow-lg">
          {error && (
            <div className="alert-error flex items-center gap-2 mb-5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form id="register-form" onSubmit={handleSubmit} className="space-y-5">
            {/* ── Common Fields ─────────────────────────────── */}
            <h3 className="font-bold text-grey-800 border-b border-grey-100 pb-2">Personal Information</h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-name" className="form-label">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                  <input id="reg-name" type="text" value={common.fullName}
                    onChange={e => setCommon({ ...common, fullName: e.target.value })}
                    placeholder="Your full name" className="form-input pl-9" required />
                </div>
              </div>

              <div>
                <label htmlFor="reg-phone" className="form-label">Mobile Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                  <input id="reg-phone" type="tel" value={common.phone}
                    onChange={e => setCommon({ ...common, phone: e.target.value })}
                    placeholder="10-digit mobile number" className="form-input pl-9" required />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="reg-email" className="form-label">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                <input id="reg-email" type="email" value={common.email}
                  onChange={e => setCommon({ ...common, email: e.target.value })}
                  placeholder="you@example.com" className="form-input pl-9" required />
              </div>
            </div>

            <div>
              <label htmlFor="reg-city" className="form-label">City *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                <select id="reg-city" value={common.city}
                  onChange={e => setCommon({ ...common, city: e.target.value })}
                  className="form-select pl-9" required>
                  <option value="">Select city</option>
                  {INDIAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-password" className="form-label">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                  <input id="reg-password" type={showPassword ? 'text' : 'password'}
                    value={common.password}
                    onChange={e => setCommon({ ...common, password: e.target.value })}
                    placeholder="Min. 8 characters" className="form-input pl-9 pr-10" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-400 hover:text-grey-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="reg-confirm" className="form-label">Confirm Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                  <input id="reg-confirm" type="password"
                    value={common.confirmPassword}
                    onChange={e => setCommon({ ...common, confirmPassword: e.target.value })}
                    placeholder="Repeat password" className="form-input pl-9" required />
                </div>
              </div>
            </div>

            {/* ── Donor-Specific Fields ──────────────────────── */}
            {role === 'donor' && (
              <>
                <h3 className="font-bold text-grey-800 border-b border-grey-100 pb-2 mt-6">Donor Information</h3>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="donor-blood-group" className="form-label">Blood Group *</label>
                    <div className="relative">
                      <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                      <select id="donor-blood-group" value={donorData.bloodGroup}
                        onChange={e => setDonorData({ ...donorData, bloodGroup: e.target.value })}
                        className="form-select pl-9" required>
                        <option value="">Select</option>
                        {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="donor-age" className="form-label">Age *</label>
                    <input id="donor-age" type="number" min="18" max="65"
                      value={donorData.age}
                      onChange={e => setDonorData({ ...donorData, age: e.target.value })}
                      placeholder="18–65" className="form-input" required />
                  </div>
                  <div>
                    <label htmlFor="donor-gender" className="form-label">Gender (optional)</label>
                    <select id="donor-gender" value={donorData.gender}
                      onChange={e => setDonorData({ ...donorData, gender: e.target.value })}
                      className="form-select">
                      <option value="">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="donor-pin" className="form-label">PIN Code</label>
                    <input id="donor-pin" type="text" maxLength={6}
                      value={donorData.pinCode}
                      onChange={e => setDonorData({ ...donorData, pinCode: e.target.value })}
                      placeholder="6-digit PIN" className="form-input" />
                  </div>
                  <div>
                    <label htmlFor="donor-last-donation" className="form-label">Last Donation Date</label>
                    <input id="donor-last-donation" type="date"
                      value={donorData.lastDonationDate}
                      onChange={e => setDonorData({ ...donorData, lastDonationDate: e.target.value })}
                      className="form-input" />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input id="donor-consent" type="checkbox"
                      checked={donorData.consentToContact}
                      onChange={e => setDonorData({ ...donorData, consentToContact: e.target.checked })}
                      className="mt-0.5 accent-blood-600" />
                    <span className="text-sm text-blue-800">
                      <strong>I consent to being contacted</strong> by patients or requesters through the LifeLink platform.
                      My phone number and exact address will never be shared publicly.
                      I can withdraw this consent at any time from my dashboard.
                    </span>
                  </label>
                </div>

                <div className="alert-warning text-xs">
                  <strong>Note:</strong> Registering as a donor does not declare you medically eligible to donate.
                  Actual eligibility is determined by licensed blood banks and medical professionals at the time of donation.
                </div>
              </>
            )}

            {/* ── Facility-Specific Fields ──────────────────── */}
            {role === 'facility' && (
              <>
                <h3 className="font-bold text-grey-800 border-b border-grey-100 pb-2 mt-6">Facility Information</h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="facility-type" className="form-label">Facility Type *</label>
                    <select id="facility-type" value={facilityData.facilityType}
                      onChange={e => setFacilityData({ ...facilityData, facilityType: e.target.value })}
                      className="form-select">
                      <option value="hospital">Hospital</option>
                      <option value="blood_bank">Blood Bank</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="facility-reg-no" className="form-label">Registration / Licence No.</label>
                    <input id="facility-reg-no" type="text"
                      value={facilityData.registrationNumber}
                      onChange={e => setFacilityData({ ...facilityData, registrationNumber: e.target.value })}
                      placeholder="Optional" className="form-input" />
                  </div>
                </div>

                <div>
                  <label htmlFor="facility-address" className="form-label">Full Address *</label>
                  <textarea id="facility-address" rows={2}
                    value={facilityData.address}
                    onChange={e => setFacilityData({ ...facilityData, address: e.target.value })}
                    placeholder="Building, Street, Area" className="form-input resize-none" required />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="facility-pin" className="form-label">PIN Code</label>
                    <input id="facility-pin" type="text" maxLength={6}
                      value={facilityData.pinCode}
                      onChange={e => setFacilityData({ ...facilityData, pinCode: e.target.value })}
                      placeholder="6-digit PIN" className="form-input" />
                  </div>
                  <div>
                    <label htmlFor="facility-contact-person" className="form-label">Contact Person *</label>
                    <input id="facility-contact-person" type="text"
                      value={facilityData.contactPerson}
                      onChange={e => setFacilityData({ ...facilityData, contactPerson: e.target.value })}
                      placeholder="Name of authorized contact" className="form-input" required />
                  </div>
                </div>

                <div className="alert-info text-xs">
                  <strong>Approval required:</strong> Your facility registration will be reviewed by LifeLink administrators.
                  Your facility will only appear in public search results after approval.
                </div>
              </>
            )}

            <button
              id="register-submit-btn"
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <><LoadingSpinner size="sm" /> Creating account…</> : 'Create Account'}
            </button>
          </form>

          <p className="text-sm text-grey-500 text-center mt-5 pt-4 border-t border-grey-100">
            Already have an account?{' '}
            <Link to="/login" className="text-blood-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
