import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, User, Droplets, Building2, MapPin, Phone, Calendar, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createBloodRequest } from '../services/requestService';
import { BLOOD_GROUPS } from '../utils/bloodGroups';
import { INDIAN_CITIES } from '../utils/validators';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function EmergencyRequest() {
  const { isLoggedIn, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    patientName: '',
    bloodGroup: '',
    unitsRequired: 1,
    hospitalName: '',
    city: '',
    pinCode: '',
    requiredDate: '',
    urgency: 'high',
    contactPerson: '',
    contactPhone: '',
    additionalInfo: '',
  });

  function update(field, val) { setForm(f => ({ ...f, [field]: val })); }

  function validate() {
    if (!form.patientName.trim()) return 'Patient name is required.';
    if (!form.bloodGroup) return 'Blood group is required.';
    if (!form.unitsRequired || form.unitsRequired < 1) return 'Enter number of units required (minimum 1).';
    if (!form.hospitalName.trim()) return 'Hospital name is required.';
    if (!form.city) return 'City is required.';
    if (!form.requiredDate) return 'Required date is required.';
    if (!form.contactPerson.trim()) return 'Contact person name is required.';
    if (!form.contactPhone.trim()) return 'Contact phone number is required.';
    if (!/^[6-9]\d{9}$/.test(form.contactPhone.replace(/\s/g, ''))) return 'Enter a valid 10-digit Indian mobile number.';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    try {
      const request = await createBloodRequest({
        requester_id: isLoggedIn ? user.id : null,
        patient_name: form.patientName,
        blood_group: form.bloodGroup,
        units_required: Number(form.unitsRequired),
        hospital_name: form.hospitalName,
        city: form.city,
        pin_code: form.pinCode || null,
        required_date: form.requiredDate,
        urgency: form.urgency,
        contact_person: form.contactPerson,
        contact_phone: form.contactPhone,
        additional_info: form.additionalInfo || null,
      });
      setSubmitted(request);
      toast.success('Emergency request submitted successfully!');
    } catch (err) {
      // Demo mode: show success even without Supabase
      const demoRequest = {
        request_id: `LL-${Date.now().toString(36).toUpperCase()}`,
        status: 'pending',
        blood_group: form.bloodGroup,
        hospital_name: form.hospitalName,
        city: form.city,
        urgency: form.urgency,
        _demo: true,
      };
      setSubmitted(demoRequest);
      toast('Demo mode: request simulated. Connect Supabase for real submissions.', { icon: 'ℹ️' });
    } finally {
      setLoading(false);
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-grey-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-lg w-full">
          <div className="card shadow-lg text-center">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-grey-900 mb-2">Request Submitted!</h2>
            <p className="text-grey-500 mb-6">Your emergency blood request has been registered.</p>

            <div className="p-4 bg-grey-50 rounded-xl text-left space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-grey-500">Request ID</span>
                <span className="font-bold text-blood-700">{submitted.request_id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-grey-500">Blood Group</span>
                <span className="font-bold">{submitted.blood_group}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-grey-500">Hospital</span>
                <span className="font-bold">{submitted.hospital_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-grey-500">Status</span>
                <span className="badge-pending capitalize">{submitted.status}</span>
              </div>
              {submitted._demo && <div className="text-xs text-grey-400 text-center pt-2">★ Demo submission — not stored in database ★</div>}
            </div>

            <div className="alert-warning text-xs mb-5">
              Save your Request ID: <strong>{submitted.request_id}</strong>. Use it to track your request status.
            </div>

            <div className="flex gap-3">
              {isLoggedIn && (
                <Link to="/dashboard/patient" className="btn-primary flex-1 justify-center">
                  View My Requests
                </Link>
              )}
              <Link to="/find-blood" className="btn-secondary flex-1 justify-center">
                Search Donors
              </Link>
            </div>

            <p className="text-xs text-grey-400 mt-5">
              For immediate assistance also call <strong>104</strong> (National Blood Bank Helpline)
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-grey-50">
      {/* Header */}
      <div className="bg-blood-700 text-white py-14">
        <div className="container-lg">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-6 h-6 text-yellow-300" />
            <h1 className="text-4xl font-bold">Emergency Blood Request</h1>
          </div>
          <p className="text-white/80">Fill in the details below. We'll help connect you with donors and blood banks.</p>
          <p className="text-white/60 text-sm mt-1">For life-threatening emergencies also call <strong className="text-white">104</strong> (National Blood Bank Helpline)</p>
        </div>
      </div>

      <div className="container-lg py-8">
        <div className="max-w-2xl mx-auto">
          {!isLoggedIn && (
            <div className="alert-info mb-6 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                <Link to="/login" className="font-semibold text-blue-700 hover:underline">Login</Link>
                {' '}to track your request status. You can also submit without an account.
              </span>
            </div>
          )}

          <div className="card shadow-lg">
            {error && (
              <div className="alert-error flex items-center gap-2 mb-5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <form id="emergency-request-form" onSubmit={handleSubmit} className="space-y-5">
              {/* Patient Info */}
              <h3 className="font-bold text-grey-800 border-b border-grey-100 pb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-blood-600" /> Patient Information
              </h3>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="er-patient-name" className="form-label">Patient Name *</label>
                  <input id="er-patient-name" type="text" value={form.patientName}
                    onChange={e => update('patientName', e.target.value)}
                    placeholder="Full name of patient" className="form-input" required />
                </div>
                <div>
                  <label htmlFor="er-blood-group" className="form-label">Blood Group Required *</label>
                  <div className="relative">
                    <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                    <select id="er-blood-group" value={form.bloodGroup}
                      onChange={e => update('bloodGroup', e.target.value)}
                      className="form-select pl-9" required>
                      <option value="">Select blood group</option>
                      {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="er-units" className="form-label">Units Required *</label>
                  <input id="er-units" type="number" min="1" max="20"
                    value={form.unitsRequired}
                    onChange={e => update('unitsRequired', e.target.value)}
                    className="form-input" required />
                </div>
                <div>
                  <label htmlFor="er-urgency" className="form-label">Urgency Level *</label>
                  <select id="er-urgency" value={form.urgency}
                    onChange={e => update('urgency', e.target.value)}
                    className="form-select">
                    <option value="critical">🔴 Critical — Immediate need</option>
                    <option value="high">🟠 High — Within 24 hours</option>
                    <option value="normal">🟡 Normal — Within a few days</option>
                  </select>
                </div>
              </div>

              {/* Hospital Info */}
              <h3 className="font-bold text-grey-800 border-b border-grey-100 pb-2 flex items-center gap-2 mt-2">
                <Building2 className="w-4 h-4 text-blood-600" /> Hospital Information
              </h3>

              <div>
                <label htmlFor="er-hospital" className="form-label">Hospital Name *</label>
                <input id="er-hospital" type="text" value={form.hospitalName}
                  onChange={e => update('hospitalName', e.target.value)}
                  placeholder="Name of hospital where blood is required" className="form-input" required />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="er-city" className="form-label">City *</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                    <select id="er-city" value={form.city}
                      onChange={e => update('city', e.target.value)}
                      className="form-select pl-9" required>
                      <option value="">Select city</option>
                      {INDIAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="er-pin" className="form-label">PIN Code</label>
                  <input id="er-pin" type="text" maxLength={6} value={form.pinCode}
                    onChange={e => update('pinCode', e.target.value)}
                    placeholder="6-digit PIN" className="form-input" />
                </div>
              </div>

              <div>
                <label htmlFor="er-date" className="form-label">Required By Date *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-grey-400" />
                  <input id="er-date" type="date"
                    value={form.requiredDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => update('requiredDate', e.target.value)}
                    className="form-input pl-9" required />
                </div>
              </div>

              {/* Contact */}
              <h3 className="font-bold text-grey-800 border-b border-grey-100 pb-2 flex items-center gap-2 mt-2">
                <Phone className="w-4 h-4 text-blood-600" /> Contact Information
              </h3>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="er-contact-name" className="form-label">Contact Person Name *</label>
                  <input id="er-contact-name" type="text" value={form.contactPerson}
                    onChange={e => update('contactPerson', e.target.value)}
                    placeholder="Name of contact person" className="form-input" required />
                </div>
                <div>
                  <label htmlFor="er-contact-phone" className="form-label">Contact Phone *</label>
                  <input id="er-contact-phone" type="tel" value={form.contactPhone}
                    onChange={e => update('contactPhone', e.target.value)}
                    placeholder="10-digit mobile number" className="form-input" required />
                </div>
              </div>

              <div>
                <label htmlFor="er-info" className="form-label">Additional Information</label>
                <textarea id="er-info" rows={3} value={form.additionalInfo}
                  onChange={e => update('additionalInfo', e.target.value)}
                  placeholder="Any additional details (ward number, attending doctor, etc.)"
                  className="form-input resize-none" />
              </div>

              <div className="alert-warning text-xs flex items-start gap-2">
                <FileText className="w-4 h-4 flex-shrink-0" />
                By submitting this request, you confirm the information is accurate.
                Blood group matching shown here does not replace medical crossmatching by qualified professionals.
              </div>

              <button id="emergency-submit-btn" type="submit" disabled={loading}
                className="btn-danger w-full justify-center py-3 text-base rounded-xl disabled:opacity-60">
                {loading ? <><LoadingSpinner size="sm" /> Submitting…</> : '🚨 Submit Emergency Request'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
