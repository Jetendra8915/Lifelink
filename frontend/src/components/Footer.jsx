import { Link } from 'react-router-dom';
import { Heart, Phone, Mail, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-grey-900 text-grey-300">
      {/* Main footer */}
      <div className="container-lg py-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="space-y-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-white">
            <div className="w-8 h-8 bg-blood-600 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            LifeLink
          </Link>
          <p className="text-sm leading-relaxed text-grey-400">
            Connecting blood donors, hospitals, and people in need through one reliable platform.
            Saving lives, one drop at a time.
          </p>
          {/* Social icons using text/emoji as lucide brand icons are removed in v0.x */}
          <div className="flex items-center gap-3">
            {['f', 'tw', 'ig'].map(s => (
              <a key={s} href="#" aria-label={s}
                className="w-9 h-9 rounded-full bg-grey-800 flex items-center justify-center hover:bg-blood-600 transition-colors text-xs font-bold text-grey-300 hover:text-white">
                {s === 'f' ? 'fb' : s === 'tw' ? 'tw' : 'ig'}
              </a>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-white font-semibold mb-4">Quick Links</h3>
          <ul className="space-y-2 text-sm">
            {[
              { to: '/find-blood', label: 'Find Blood' },
              { to: '/become-donor', label: 'Become a Donor' },
              { to: '/blood-banks', label: 'Blood Banks' },
              { to: '/map', label: 'Resource Map' },
              { to: '/emergency', label: 'Emergency Request' },
              { to: '/about', label: 'About Us' },
            ].map(({ to, label }) => (
              <li key={to}>
                <Link to={to} className="hover:text-blood-400 transition-colors">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Blood Groups */}
        <div>
          <h3 className="text-white font-semibold mb-4">Blood Groups</h3>
          <div className="grid grid-cols-4 gap-2">
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
              <span key={bg} className="text-center px-2 py-1.5 rounded-lg bg-grey-800 text-xs font-bold text-blood-300 hover:bg-blood-800 transition-colors cursor-default">
                {bg}
              </span>
            ))}
          </div>
          <p className="text-xs text-grey-500 mt-4 leading-relaxed">
            Blood compatibility must be verified by qualified medical professionals and blood banks.
          </p>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-white font-semibold mb-4">Contact</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-blood-400 mt-0.5 flex-shrink-0" />
              <span>LifeLink HQ, Bangalore, Karnataka 560001, India</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-blood-400 flex-shrink-0" />
              <span>1800-LifeLink (Demo)</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-blood-400 flex-shrink-0" />
              <span>support@lifelink.in (Demo)</span>
            </li>
          </ul>
          <div className="mt-4 p-3 rounded-xl bg-blood-900 border border-blood-800">
            <p className="text-xs text-blood-200 font-semibold">🚨 Blood Emergency?</p>
            <p className="text-xs text-grey-400 mt-1">Call <strong className="text-white">104</strong> (National Blood Bank Helpline) for immediate assistance.</p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-grey-800">
        <div className="container-lg py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-grey-500">
          <p>&copy; 2024 LifeLink. Academic Project — B.Tech CSE (Data Science).</p>
          <p className="text-center">
            LifeLink is an information and coordination platform, not a replacement for medical professionals or licensed blood banks.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-grey-300 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-grey-300 transition-colors">Terms of Use</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
