import { Link } from "react-router-dom";
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";

const company = [
  { name: "About Us", path: "/about" },
  { name: "Contact Us", path: "/contact" },
  { name: "FAQs", path: "/faqs" },
];

const service = [
  { name: "Shipping Policy", path: "/shipping-policy" },
  { name: "Returns & Refunds", path: "/return-policy" },
  { name: "Track Order", path: "/account?tab=orders" },
  { name: "Privacy Policy", path: "/privacy-policy" },
];

const categories = [
  { name: "Power Tools", slug: "power-hand-tools" },
  { name: "Hand Tools", slug: "power-hand-tools" },
  { name: "Electrical", slug: "electrical-supplies" },
  { name: "Safety Equipment", slug: "safety-ware-ppe" },
];

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V7.83a8.16 8.16 0 0 0 4.77 1.52V5.9a4.85 4.85 0 0 1-1.84-.21z" /></svg>
);

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 pt-10 md:pt-14 pb-4">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 md:gap-10">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <Link to="/" className="inline-block mb-3">
              <h3 className="text-xl font-extrabold tracking-tight text-[#0f172a]">
                TOOLS<span className="text-[#FF5722]">MAN</span>
              </h3>
            </Link>
            <p className="text-xs md:text-sm text-gray-500 leading-relaxed mb-4 max-w-xs">
              Quality tools and equipment for professionals and businesses.
            </p>
            <div className="flex gap-2">
              {[Facebook, Instagram, TikTokIcon, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Social link"
                  className="h-8 w-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-[#FF5722] hover:text-[#FF5722] transition-colors"
                >
                  <Icon className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Shop / Categories */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3">Shop</h4>
            <ul className="space-y-2">
              <li><Link to="/products" className="text-sm text-gray-600 hover:text-[#FF5722]">All Products</Link></li>
              {categories.map((c) => (
                <li key={c.name}>
                  <Link to={`/category/${c.slug}`} className="text-sm text-gray-600 hover:text-[#FF5722] transition-colors">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3">Customer Service</h4>
            <ul className="space-y-2">
              {company.concat(service).slice(0, 6).map((l) => (
                <li key={l.name}>
                  <Link to={l.path} className="text-sm text-gray-600 hover:text-[#FF5722] transition-colors">
                    {l.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3">Contact Us</h4>
            <ul className="space-y-2.5 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#FF5722] flex-shrink-0" />
                <a href="tel:+254701043041" className="hover:text-[#FF5722]">0701 043 041</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#FF5722] flex-shrink-0" />
                <a href="mailto:toolsmanstore@gmail.com" className="hover:text-[#FF5722] truncate">toolsmanstore@gmail.com</a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-[#FF5722] flex-shrink-0 mt-0.5" />
                <span>Simara Mall, 6th Floor Shop 03, Nairobi, Kenya</span>
              </li>
            </ul>
          </div>

          {/* Payments */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3">Payment Methods</h4>
            <div className="flex flex-wrap gap-2">
              {["M-Pesa", "Visa", "Mastercard", "Airtel Money"].map((p) => (
                <span
                  key={p}
                  className="text-[11px] font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 md:mt-12 pt-4 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-500">© {new Date().getFullYear()} Toolsman. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/privacy-policy" className="text-xs text-gray-500 hover:text-[#FF5722]">Privacy Policy</Link>
            <Link to="/return-policy" className="text-xs text-gray-500 hover:text-[#FF5722]">Terms & Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
