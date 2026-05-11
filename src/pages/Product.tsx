import { useState, useRef, useEffect } from "react";
import WhatsAppOrderButton from "@/components/product/WhatsAppOrderButton";
import { SITE } from "@/lib/config";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCartContext } from "@/contexts/CartContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AntiCopyProtection from "@/components/AntiCopyProtection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Minus, Plus, ShoppingCart, Loader2, Heart, Truck,
  Award, Calendar, MapPin, ShieldCheck, Lock, Headset, ChevronRight,
  ChevronLeft, Check, ZoomIn,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Product as ProductType } from "@/types/database";
import { getProxiedImageUrl } from "@/lib/imageUtils";
import { KENYA_COUNTIES, getDeliveryFee } from "@/lib/checkoutConstants";
import DOMPurify from "dompurify";

const DELIVERY_LOCATION_KEY = "toolsman_delivery_location";

const Product = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCartContext();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [hoverZoom, setHoverZoom] = useState({ active: false, x: 50, y: 50 });
  const touchStartX = useRef<number | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState<string>(
    () => localStorage.getItem(DELIVERY_LOCATION_KEY) || "Nairobi"
  );
  const [locationOpen, setLocationOpen] = useState(false);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      if (!slug) throw new Error("No slug provided");
      const { data, error } = await supabase
        .from("products")
        .select("*, category:categories(name, slug)")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Product not found");
      return data as ProductType & { category: { name: string; slug: string } | null };
    },
    enabled: !!slug,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const formatPrice = (amount: number) =>
    `KSh ${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;

  const handleAddToCart = async () => {
    if (!product) return;
    for (let i = 0; i < quantity; i++) await addToCart(product.id);
    toast({
      title: "Added to cart",
      description: `${quantity}x ${product.name} added to your cart`,
    });
  };

  const discount = product?.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  const rawImages = product?.images?.length
    ? product.images
    : [product?.image_url || "/placeholder.svg"];
  const images = rawImages.map(getProxiedImageUrl);

  const nextImage = () => setSelectedImage((i) => (i + 1) % images.length);
  const prevImage = () => setSelectedImage((i) => (i - 1 + images.length) % images.length);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) (dx < 0 ? nextImage : prevImage)();
    touchStartX.current = null;
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHoverZoom({
      active: true,
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    });
  };

  const handleLocationChange = (loc: string) => {
    setDeliveryLocation(loc);
    localStorage.setItem(DELIVERY_LOCATION_KEY, loc);
    setLocationOpen(false);
    toast({ title: "Delivery location updated", description: loc });
  };

  const deliveryFee = getDeliveryFee(deliveryLocation, "standard");
  const estimatedDelivery =
    deliveryLocation.toLowerCase() === "nairobi" ? "1–2 business days" : "2–5 business days";

  // Inject OG / Twitter meta tags for social sharing & WhatsApp previews
  // MUST be before any early returns to respect Rules of Hooks
  useEffect(() => {
    if (!product) return;
    const plainDesc = (product.description || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160);
    const url = `${SITE.url}/product/${product.slug}`;
    const image = product.image_url || (product.images && product.images[0]) || "";
    const title = `${product.name} | ${SITE.name}`;

    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        const [k, v] = selector.replace(/^meta\[/, "").replace(/\]$/, "").split("=");
        el.setAttribute(k, v.replace(/['"]/g, ""));
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    document.title = title;
    setMeta('meta[name="description"]', "content", plainDesc);
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", plainDesc);
    setMeta('meta[property="og:image"]', "content", image);
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[property="og:type"]', "content", "product");
    setMeta('meta[property="og:site_name"]', "content", SITE.name);
    setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "content", title);
    setMeta('meta[name="twitter:description"]', "content", plainDesc);
    setMeta('meta[name="twitter:image"]', "content", image);
  }, [product]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-gray-500">Loading product...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-12">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold mb-2">Product not found</h1>
            <p className="text-gray-500 mb-6">This product may have been removed or the link is incorrect.</p>
            <Button asChild>
              <Link to="/">Back to Shop</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const cleanDescription = product?.description
    ? DOMPurify.sanitize(product.description)
    : "";

  // Inject OG / Twitter meta tags for social sharing & WhatsApp previews
  useEffect(() => {
    if (!product) return;
    const plainDesc = (product.description || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160);
    const url = `${SITE.url}/product/${product.slug}`;
    const image = product.image_url || (product.images && product.images[0]) || "";
    const title = `${product.name} | ${SITE.name}`;

    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        const [k, v] = selector.replace(/^meta\[/, "").replace(/\]$/, "").split("=");
        el.setAttribute(k, v.replace(/['"]/g, ""));
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    document.title = title;
    setMeta('meta[name="description"]', "content", plainDesc);
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", plainDesc);
    setMeta('meta[property="og:image"]', "content", image);
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[property="og:type"]', "content", "product");
    setMeta('meta[property="og:site_name"]', "content", SITE.name);
    setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "content", title);
    setMeta('meta[name="twitter:description"]', "content", plainDesc);
    setMeta('meta[name="twitter:image"]', "content", image);
  }, [product]);


  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <AntiCopyProtection />
      <main className="flex-1 container py-6 md:py-8" data-protected>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
          <Link to="/" className="hover:text-gray-900 transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          {product.category && (
            <>
              <Link to={`/category/${product.category.slug}`} className="hover:text-gray-900 transition-colors">
                {product.category.name}
              </Link>
              <ChevronRight className="h-3 w-3" />
            </>
          )}
          <span className="text-gray-900 font-medium truncate max-w-[60vw]">{product.name}</span>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Images Column */}
          <div className="lg:col-span-5 flex flex-col-reverse md:flex-row gap-3 md:gap-4">
            {images.length > 1 && (
              <div className="flex md:flex-col gap-2 md:gap-3 md:w-20 flex-shrink-0 overflow-x-auto md:overflow-visible">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-all p-1 bg-white flex-shrink-0 ${
                      selectedImage === index
                        ? "border-[#FF5722]"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <img
                      src={img || "/placeholder.svg"}
                      alt=""
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const t = e.target as HTMLImageElement;
                        t.onerror = null;
                        t.src = "/placeholder.svg";
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
            <div className="flex-1 relative">
              <div
                className="aspect-square w-full bg-white border border-gray-200 rounded-lg overflow-hidden relative p-4 md:p-8 flex items-center justify-center cursor-zoom-in select-none"
                onMouseMove={onMouseMove}
                onMouseLeave={() => setHoverZoom((p) => ({ ...p, active: false }))}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                onClick={() => setZoomOpen(true)}
                style={{ touchAction: "pan-y pinch-zoom" }}
              >
                <img
                  src={images[selectedImage] || "/placeholder.svg"}
                  alt={product.name}
                  className="max-w-full max-h-full object-contain transition-transform duration-200"
                  style={
                    hoverZoom.active
                      ? {
                          transform: `scale(2)`,
                          transformOrigin: `${hoverZoom.x}% ${hoverZoom.y}%`,
                        }
                      : undefined
                  }
                  onError={(e) => {
                    const t = e.target as HTMLImageElement;
                    t.onerror = null;
                    t.src = "/placeholder.svg";
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomOpen(true);
                  }}
                  className="absolute top-3 right-3 bg-white/90 backdrop-blur rounded-full p-2 shadow-sm border border-gray-200 hover:bg-white"
                  aria-label="Zoom image"
                >
                  <ZoomIn className="h-4 w-4 text-gray-700" />
                </button>
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); prevImage(); }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-sm border border-gray-200 md:hidden"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); nextImage(); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-sm border border-gray-200 md:hidden"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Zoom dialog */}
            <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
              <DialogContent className="max-w-4xl p-0 bg-white">
                <div className="relative w-full aspect-square overflow-auto bg-white" style={{ touchAction: "pinch-zoom" }}>
                  <img
                    src={images[selectedImage]}
                    alt={product.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Info Column */}
          <div className="lg:col-span-4 space-y-5">
            <h1 className="text-2xl font-bold leading-tight text-gray-900">{product.name}</h1>

            <div className="text-sm text-muted-foreground">
              SKU: {product.sku || `TM-${product.id.slice(0, 5).toUpperCase()}`}
            </div>

            <div className="flex items-end gap-3 flex-wrap">
              <span className="text-3xl font-extrabold text-gray-900">{formatPrice(product.price)}</span>
              {product.original_price && (
                <>
                  <span className="text-lg text-muted-foreground line-through mb-1">
                    {formatPrice(product.original_price)}
                  </span>
                  <Badge className="bg-[#FF5722] hover:bg-[#e64a19] text-white rounded px-2 py-0.5 mb-1.5 text-[10px] uppercase font-bold">
                    {discount}% OFF
                  </Badge>
                </>
              )}
            </div>

            {cleanDescription && (
              <div
                className="prose prose-sm max-w-none text-sm text-gray-600 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: cleanDescription }}
              />
            )}

            <div className="flex items-center gap-6 py-1 flex-wrap">
              {product.stock_quantity !== null && product.stock_quantity > 0 ? (
                <div className="flex items-center gap-1.5 text-green-600 text-sm font-semibold">
                  <Check className="h-4 w-4" /> In Stock
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-red-600 text-sm font-semibold">
                  Out of Stock
                </div>
              )}
              <div className="flex items-center gap-1.5 text-gray-700 text-sm font-medium">
                <Truck className="h-4 w-4" /> Nationwide Delivery
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center border border-gray-300 rounded-md bg-white">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-none border-r border-gray-300 hover:bg-gray-50 text-gray-600"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-medium text-sm">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-none border-l border-gray-300 hover:bg-gray-50 text-gray-600"
                  onClick={() => setQuantity(quantity + 1)}
                  disabled={product.stock_quantity !== null && quantity >= product.stock_quantity}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                className="flex-1 bg-[#FF5722] hover:bg-[#e64a19] text-white h-12 font-bold shadow-none"
                onClick={handleAddToCart}
                disabled={product.stock_quantity === 0}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                ADD TO CART
              </Button>
              <Button
                className="flex-1 bg-[#0f172a] hover:bg-[#1e293b] text-white h-12 font-bold shadow-none"
                onClick={async () => { await handleAddToCart(); navigate("/cart"); }}
                disabled={product.stock_quantity === 0}
              >
                BUY NOW
              </Button>
            </div>

            <WhatsAppOrderButton
              productName={product.name}
              price={formatPrice(product.price)}
              url={`${SITE.url}/product/${product.slug}`}
            />

            <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#FF5722] font-medium transition-colors pt-1">
              <Heart className="h-4 w-4" /> Add to Wishlist
            </button>


            <div className="grid grid-cols-3 gap-2 pt-5 mt-5 border-t border-gray-100">
              {[
                { Icon: Award, t: "Quality Guarantee", s: "Pro-grade tools" },
                { Icon: ShieldCheck, t: "Secure Payment", s: "100% protected" },
                { Icon: Headset, t: "Expert Support", s: "We're here to help" },
              ].map(({ Icon, t, s }) => (
                <div key={t} className="flex items-center justify-center gap-2 px-2 py-3 bg-gray-50 rounded-lg">
                  <Icon className="h-5 w-5 text-gray-600 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-900 leading-tight">{t}</span>
                    <span className="text-[9px] text-gray-500">{s}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-3">
            <Card className="bg-gray-50/50 border-gray-200 shadow-sm rounded-xl overflow-hidden lg:sticky lg:top-24">
              <CardContent className="p-5 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-2xl font-extrabold text-gray-900">{formatPrice(product.price)}</span>
                    {discount > 0 && (
                      <Badge className="bg-[#FF5722] text-white px-1.5 py-0 text-[10px] uppercase font-bold">
                        {discount}% OFF
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Shipping: {formatPrice(deliveryFee)} to {deliveryLocation}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Calendar className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Estimated Delivery</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{estimatedDelivery}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Deliver to</p>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 truncate">
                      <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <span className="truncate">{deliveryLocation}, Kenya</span>
                    </div>
                    <Dialog open={locationOpen} onOpenChange={setLocationOpen}>
                      <DialogTrigger asChild>
                        <button className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors flex-shrink-0">
                          Change
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm">
                        <DialogHeader>
                          <DialogTitle>Choose delivery location</DialogTitle>
                        </DialogHeader>
                        <Select value={deliveryLocation} onValueChange={handleLocationChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a county" />
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {KENYA_COUNTIES.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <Separator className="bg-gray-200" />

                <div className="space-y-4">
                  <div className="flex gap-3">
                    <ShieldCheck className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 leading-tight">1 Year Warranty</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Manufacturer warranty</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Lock className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 leading-tight">Secure Checkout</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">100% secure payment</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Tabs */}
        <div id="description" className="mt-12 md:mt-16 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm scroll-mt-24">
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="w-full justify-start border-b border-gray-200 rounded-none h-[60px] bg-gray-50/50 p-0 gap-4 md:gap-8 px-4 md:px-8 overflow-x-auto">
              <TabsTrigger
                value="description"
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#FF5722] data-[state=active]:text-[#FF5722] data-[state=active]:shadow-none rounded-none bg-transparent font-semibold text-xs md:text-sm text-gray-500 py-5 px-1 h-full uppercase tracking-wider whitespace-nowrap"
              >
                Description
              </TabsTrigger>
              <TabsTrigger
                value="features"
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#FF5722] data-[state=active]:text-[#FF5722] data-[state=active]:shadow-none rounded-none bg-transparent font-semibold text-xs md:text-sm text-gray-500 py-5 px-1 h-full uppercase tracking-wider whitespace-nowrap"
              >
                Key Features
              </TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="p-6 md:p-8 m-0">
              {cleanDescription ? (
                <div
                  className="prose prose-sm md:prose-base max-w-none text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: cleanDescription }}
                />
              ) : (
                <p className="text-gray-500 text-sm">No description available for this product.</p>
              )}
            </TabsContent>
            <TabsContent value="features" className="p-6 md:p-8 m-0">
              {(() => {
                const html = product.description || "";
                let features: string[] = [];
                const liMatches = Array.from(html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
                  .map((m) => m[1].replace(/<[^>]+>/g, "").trim())
                  .filter(Boolean);
                if (liMatches.length) features = liMatches.slice(0, 6);
                else {
                  const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
                  features = plain
                    .split(/(?<=[.!?])\s+/)
                    .map((s) => s.trim())
                    .filter((s) => s.length > 12 && s.length < 220)
                    .slice(0, 5);
                }
                const meta = [
                  product.category?.name && `Category: ${product.category.name}`,
                  product.sku && `SKU: ${product.sku}`,
                  product.stock_quantity !== null && product.stock_quantity > 0 && "In stock and ready to ship",
                ].filter(Boolean) as string[];
                const all = [...features, ...meta];
                if (!all.length) {
                  return <p className="text-gray-500 text-sm">No features listed for this product.</p>;
                }
                return (
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                    {all.map((line, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-[#FF5722] mt-0.5 flex-shrink-0" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </TabsContent>

          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Product;
