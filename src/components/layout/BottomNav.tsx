import { Link, useLocation } from "react-router-dom";
import { Home, LayoutGrid, Tag, Heart, User } from "lucide-react";
import { useWishlist } from "@/hooks/useWishlist";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  { to: "/products", label: "Categories", icon: LayoutGrid, match: (p: string) => p.startsWith("/products") || p.startsWith("/category") },
  { to: "/deals", label: "Deals", icon: Tag, match: (p: string) => p.startsWith("/deals") },
  { to: "/wishlist", label: "Wishlist", icon: Heart, match: (p: string) => p.startsWith("/wishlist") },
  { to: "/account", label: "Account", icon: User, match: (p: string) => p.startsWith("/account") || p.startsWith("/auth") },
];

const BottomNav = () => {
  const { pathname } = useLocation();
  const { count } = useWishlist();

  // Hide on admin or checkout success flows if needed
  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      {/* Spacer so content isn't hidden behind nav on mobile/tablet */}
      <div className="lg:hidden h-16" aria-hidden />
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-5">
          {tabs.map(({ to, label, icon: Icon, match }) => {
            const active = match(pathname);
            const showBadge = label === "Wishlist" && count > 0;
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 py-2 transition-colors relative",
                    active ? "text-[#FF5722]" : "text-gray-500 hover:text-gray-800"
                  )}
                >
                  <span
                    className={cn(
                      "relative flex items-center justify-center h-9 w-9 rounded-full transition-all",
                      active ? "bg-[#FF5722]/10 scale-105" : "scale-100"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", active && "fill-[#FF5722]/15")} />
                    {showBadge && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center border border-white">
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                  </span>
                  <span className={cn("text-[10px] font-semibold", active && "font-bold")}>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
};

export default BottomNav;
