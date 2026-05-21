import { useState } from "react";
import { Share2, Copy, Check, MessageCircle, Facebook, Mail, Link as LinkIcon } from "lucide-react";
import { SITE } from "@/lib/config";

interface ProductShareButtonProps {
  productName: string;
  productSlug: string;
  price?: string;
  description?: string;
}

/**
 * ProductShareButton — multi-platform share sheet.
 * Uses Web Share API on mobile, clipboard fallback on desktop.
 */
const ProductShareButton = ({
  productName,
  productSlug,
  price,
  description,
}: ProductShareButtonProps) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = `${SITE.url}/product/${productSlug}`;
  const shareTitle = `${productName}${price ? ` — ${price}` : ""}`;
  const shareText = description
    ? `${description.replace(/<[^>]+>/g, "").slice(0, 120)}…`
    : `Check out ${productName} on Toolsman Store!`;

  // Native share (mobile / browsers that support it)
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
      } catch (err) {
        // User cancelled — ignore
      }
      return;
    }
    setOpen((v) => !v);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement("textarea");
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const waText = encodeURIComponent(`${shareTitle}\n\n${shareText}\n\n${shareUrl}`);
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
  const whatsappUrl = `https://wa.me/?text=${waText}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`;

  const platforms = [
    {
      label: "Copy Link",
      icon: copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />,
      action: handleCopy,
      color: "hover:bg-gray-100 text-gray-700",
      subtitle: copied ? "Copied!" : shareUrl.slice(0, 40) + "…",
    },
    {
      label: "WhatsApp",
      icon: <MessageCircle className="h-4 w-4 text-green-500" />,
      href: whatsappUrl,
      color: "hover:bg-green-50 text-gray-700",
    },
    {
      label: "Facebook",
      icon: <Facebook className="h-4 w-4 text-blue-600" />,
      href: fbUrl,
      color: "hover:bg-blue-50 text-gray-700",
    },
    {
      label: "Telegram",
      icon: <LinkIcon className="h-4 w-4 text-sky-500" />,
      href: telegramUrl,
      color: "hover:bg-sky-50 text-gray-700",
    },
    {
      label: "Email",
      icon: <Mail className="h-4 w-4 text-gray-500" />,
      href: emailUrl,
      color: "hover:bg-gray-100 text-gray-700",
    },
  ] as const;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleNativeShare}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#FF5722] font-medium transition-colors pt-1"
        aria-label="Share this product"
      >
        <Share2 className="h-4 w-4" />
        Share
      </button>

      {/* Desktop dropdown share sheet */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 bottom-full mb-2 z-50 w-72 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900 line-clamp-1">{productName}</p>
              <p className="text-xs text-gray-400 mt-0.5">Share this product</p>
            </div>
            <div className="divide-y divide-gray-50">
              {platforms.map((p) =>
                "href" in p ? (
                  <a
                    key={p.label}
                    href={p.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${p.color}`}
                  >
                    {p.icon}
                    {p.label}
                  </a>
                ) : (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => { p.action(); }}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors w-full text-left ${p.color}`}
                  >
                    {p.icon}
                    <div>
                      <div>{p.label}</div>
                      {"subtitle" in p && (
                        <div className="text-[10px] text-gray-400 font-normal truncate max-w-[200px]">
                          {p.subtitle}
                        </div>
                      )}
                    </div>
                  </button>
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProductShareButton;
