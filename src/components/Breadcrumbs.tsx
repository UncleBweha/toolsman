import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { Helmet } from "react-helmet-async";

export interface Crumb {
  label: string;
  href?: string;
}

interface Props {
  items: Crumb[];
}

const SITE = "https://toolsman.lovable.app";

const Breadcrumbs = ({ items }: Props) => {
  const all: Crumb[] = [{ label: "Home", href: "/" }, ...items];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: c.href ? `${SITE}${c.href}` : undefined,
    })),
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs md:text-sm text-gray-500 mb-4 flex-wrap">
        {all.map((c, i) => (
          <div key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 text-gray-400" />}
            {c.href && i < all.length - 1 ? (
              <Link to={c.href} className="hover:text-[#FF5722] flex items-center gap-1">
                {i === 0 && <Home className="h-3 w-3" />}
                <span>{c.label}</span>
              </Link>
            ) : (
              <span className="text-gray-900 font-medium">{c.label}</span>
            )}
          </div>
        ))}
      </nav>
    </>
  );
};

export default Breadcrumbs;
