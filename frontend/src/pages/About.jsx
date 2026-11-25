import { Link } from 'react-router-dom';
import { Heart, Shield, Clock, Users, MapPin, Target, BookOpen, Mail } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="hero-gradient text-white py-20">
        <div className="container-lg max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm mb-6">
            <BookOpen className="w-4 h-4" /> Academic Project
          </div>
          <h1 className="text-5xl font-bold mb-4">About LifeLink</h1>
          <p className="text-xl text-white/80 leading-relaxed">
            A centralized blood donor and emergency blood availability portal developed as a B.Tech CSE (Data Science) academic project,
            aiming to bridge the gap between blood donors and those in need.
          </p>
        </div>
      </div>

      {/* Mission */}
      <section className="section bg-white">
        <div className="container-lg max-w-4xl">
          <h2 className="section-title">Our Mission</h2>
          <p className="text-grey-600 text-lg leading-relaxed text-center max-w-2xl mx-auto mb-12">
            To build a reliable, privacy-safe information and coordination platform that makes it easier for patients,
            families, donors, hospitals, and blood banks to connect during emergencies.
          </p>

          <div className="grid sm:grid-cols-2 gap-6">
            {[
              { icon: Target, title: 'Centralized Platform', desc: 'No more calling multiple hospitals separately. One search to find all nearby donors and blood banks.', color: 'text-blood-600 bg-blood-50' },
              { icon: Shield, title: 'Privacy First', desc: 'Donor personal details are never publicly exposed. Contact is made only after explicit consent.', color: 'text-blue-600 bg-blue-50' },
              { icon: Clock, title: 'Timely Coordination', desc: 'Emergency blood requests are visible to matched donors and facilities immediately after submission.', color: 'text-green-600 bg-green-50' },
              { icon: Users, title: 'Community Powered', desc: 'Voluntary donors, verified hospitals, and blood banks working together to save lives.', color: 'text-purple-600 bg-purple-50' },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="card flex gap-4 items-start">
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-grey-900 mb-1">{title}</h3>
                  <p className="text-sm text-grey-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="section bg-grey-50">
        <div className="container-lg max-w-3xl">
          <h2 className="section-title">Technology Stack</h2>
          <p className="section-subtitle">Built with modern, industry-standard technologies</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { name: 'React.js', role: 'Frontend UI', emoji: '⚛️' },
              { name: 'Tailwind CSS', role: 'Styling', emoji: '🎨' },
              { name: 'Supabase', role: 'Database & Auth', emoji: '🗄️' },
              { name: 'PostgreSQL', role: 'Relational DB', emoji: '🐘' },
              { name: 'Leaflet.js', role: 'Interactive Maps', emoji: '🗺️' },
              { name: 'React Router', role: 'Navigation', emoji: '🔀' },
            ].map(({ name, role, emoji }) => (
              <div key={name} className="card text-center">
                <div className="text-3xl mb-2">{emoji}</div>
                <div className="font-bold text-grey-900 text-sm">{name}</div>
                <div className="text-xs text-grey-500">{role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="section bg-white">
        <div className="container-lg max-w-3xl">
          <div className="p-8 rounded-2xl border-2 border-yellow-200 bg-yellow-50">
            <h2 className="text-xl font-bold text-yellow-800 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" /> Important Disclaimer
            </h2>
            <ul className="space-y-3 text-sm text-yellow-800">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0">•</span>
                LifeLink is an <strong>information and coordination platform only</strong>, not a replacement for medical professionals or licensed blood banks.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0">•</span>
                Blood compatibility information is for general awareness only. <strong>Actual transfusion compatibility must be verified by qualified medical professionals</strong> through proper crossmatching procedures.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0">•</span>
                Registration as a donor on LifeLink <strong>does not declare medical eligibility</strong> to donate blood. Eligibility is determined by licensed blood banks at the time of donation.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0">•</span>
                Blood availability shown by facilities is self-reported. <strong>Always confirm directly</strong> with the facility before visiting.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0">•</span>
                <strong>Buying or selling blood is strictly prohibited</strong> on this platform. LifeLink facilitates voluntary donation coordination only.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-blood-700 text-white text-center">
        <div className="container-lg">
          <Heart className="w-12 h-12 mx-auto mb-4 fill-white" />
          <h2 className="text-3xl font-bold mb-4">Join LifeLink Today</h2>
          <p className="text-white/80 mb-8 max-w-md mx-auto">
            Register as a donor, submit a blood request, or list your healthcare facility.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/register" className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-white text-blood-700 font-bold rounded-xl hover:bg-blood-50 transition-all">
              <Heart className="w-4 h-4 fill-blood-700" /> Register Now
            </Link>
            <Link to="/find-blood" className="inline-flex items-center justify-center gap-2 px-8 py-3 border-2 border-white/40 text-white font-bold rounded-xl hover:bg-white/10 transition-all">
              Find Blood
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
