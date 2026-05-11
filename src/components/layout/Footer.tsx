import { Link } from "react-router-dom";
import { useState } from "react";
import {
  Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin, ChevronDown,
} from "lucide-react";

const quickLinks = [
  { name: "About Us", path: "/about" },
  { name: "Contact Us", path: "/contact" },
  { name: "FAQs", path: "/faqs" },
  { name: "Shipping Policy", path: "/shipping-policy" },
  { name: "Return Policy", path: "/return-policy" },
  { name: "Privacy Policy", path: "/privacy-policy" },
];

const categories = [
  { name: "Power Tools", slug: "power-hand-tools" },
  { name: "Hand Tools", slug: "power-hand-tools" },
  { name: "Safety Equipment", slug: "safety-ware-ppe" },
  { name: "Measuring Tools", slug: "tools-machinery" },
  { name: "Garden Tools", slug: "farm-equipment" },
  { name: "Electrical", slug: "electrical-supplies" },
];

const Section = ({
  title, children, openByDefault = false,
}: { title: string; children: React.ReactNode; openByDefault?: boolean }) => {
  const [open, setOpen] = useState(openByDefault);
  return (
    <div className="border-b border-border md:border-0 py-3 md:py-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between md:cursor-default"
      >
        <h4 className="text-sm font-bold text-foreground">{title}</h4>
        <ChevronDown
          className={`h-4 w-4 md:hidden transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div className={`${open ? "block" : "hidden"} md:block mt-3`}>{children}</div>
    </div>
  );
};

const Footer = () => {
  return (
    <footer className="bg-background pt-8 pb-4 md:pt-10">
      <div className="container">
        <div className="bg-background rounded-2xl shadow-md border border-border p-5 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {/* About */}
            <div>
              <Link to="/" className="inline-block mb-3">
                <h3 className="text-lg font-extrabold text-primary">
                  TOOLS<span className="text-foreground">MAN</span>
                </h3>
              </Link>
              <p className="text-muted-foreground text-xs md:text-sm leading-relaxed mb-3">
                Quality tools and equipment for professionals and DIYers.
              </p>
              <div className="flex gap-2">
                {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                  <a key={i} href="#"
                    className="h-8 w-8 flex items-center justify-center rounded-full border border-border text-foreground hover:text-primary hover:-translate-y-0.5 transition-all"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </a>
                ))}
              </div>
            </div>

            <Section title="Quick Links">
              <ul className="space-y-2">
                {quickLinks.map((l) => (
                  <li key={l.name}>
                    <Link to={l.path} className="text-muted-foreground hover:text-primary text-sm transition-colors">
                      {l.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Categories">
              <ul className="space-y-2">
                {categories.map((c) => (
                  <li key={c.slug}>
                    <Link to={`/category/${c.slug}`} className="text-muted-foreground hover:text-primary text-sm transition-colors">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Contact Us">
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Simara Mall, 6th Floor Shop 03, Nairobi</span>
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>+254 701 043041</span>
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="truncate">toolsmanstore@gmail.com</span>
                </li>
              </ul>
            </Section>
          </div>

          <div className="mt-5 md:mt-8 pt-4 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-2">
            <p className="text-muted-foreground text-xs">© 2026 Toolsman. All rights reserved.</p>
            <div className="flex gap-4">
              <Link to="#" className="text-muted-foreground hover:text-primary text-xs">Terms</Link>
              <Link to="#" className="text-muted-foreground hover:text-primary text-xs">Privacy</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
