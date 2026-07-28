import { useState, useRef, useEffect } from "react";
import WhatsAppOrderButton from "@/components/product/WhatsAppOrderButton";
import ProductTags from "@/components/product/ProductTags";
import RelatedProducts from "@/components/product/RelatedProducts";
import ProductShareButton from "@/components/product/ProductShareButton";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Minus, Plus, ShoppingCart, Loader2, Heart, Truck,
  ChevronRight, ChevronLeft, Check, ZoomIn,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Product as ProductType } from "@/types/database";
import { getProxiedImageUrl, getProductAlt } from "@/lib/imageUtils";
import { parseKeyFeatures } from "@/lib/featureParser";
import DOMPurify from "dompurify";
import OptimizedImage from "@/components/OptimizedImage";




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
  const [descExpanded, setDescExpanded] = useState(false);

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
      return data as unknown as ProductType & { category: { name: string; slug: string } | null };
    },
    enabled: !!slug,
    staleTime: 60 * 1000,
    retry: 1,
  });

  // OG / Twitter meta tags — MUST be before any early returns to preserve hook order
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

  // Combine primary image + additional images, deduplicate
  const allRawImages = [
    product?.image_url,
    ...(product?.images || []),
  ].filter((url): url is string => !!url);
  // Deduplicate (primary might also be in images array)
  const uniqueImages = [...new Set(allRawImages)];
  const images = uniqueImages.length > 0
    ? uniqueImages.map(getProxiedImageUrl)
    : ["/placeholder.svg"];

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



  // (duplicate useEffect removed — meta tags are set in the first useEffect above)

  const cleanDescription = product?.description
    ? DOMPurify.sanitize(product.description)
    : "";


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


  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <AntiCopyProtection />
      <main className="flex-1 container py-4 md:py-5" data-protected>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4 flex-wrap">
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

        <div className="grid lg:grid-cols-12 gap-4 lg:gap-6">
          {/* Images Column */}
          <div className="lg:col-span-5 flex flex-col-reverse md:flex-row gap-3 md:gap-4">
            {images.length > 1 && (
              <div className="flex md:flex-col gap-2 md:gap-3 md:w-20 flex-shrink-0 overflow-x-auto md:overflow-y-auto md:overflow-x-hidden md:max-h-[420px] scrollbar-hide pb-1 md:pb-0 md:pr-1">
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
                      draggable={false}
                      onContextMenu={(e) => e.preventDefault()}
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
                className="aspect-square w-full bg-white border border-gray-200 rounded-lg overflow-hidden relative p-2 md:p-5 flex items-center justify-center cursor-zoom-in select-none"
                onMouseMove={onMouseMove}
                onMouseLeave={() => setHoverZoom((p) => ({ ...p, active: false }))}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                onClick={() => setZoomOpen(true)}
                onContextMenu={(e) => e.preventDefault()}
                style={{ touchAction: "pan-y pinch-zoom" }}
              >
                <OptimizedImage
                  src={uniqueImages[selectedImage]}
                  alt={getProductAlt(product.name, product.brand)}
                  width={600}
                  height={600}
                  priority={true} // Priority loading for the main above-the-fold product image
                  className="max-w-full max-h-full object-contain transition-transform duration-200"
                  style={{
                    WebkitTouchCallout: "none",
                    userSelect: "none",
                    ...(hoverZoom.active
                      ? { transform: "scale(2)", transformOrigin: `${hoverZoom.x}% ${hoverZoom.y}%` }
                      : {}),
                  }}
                />
                {/* Protection overlay — pointer-events-none so buttons below still work */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 z-[1] pointer-events-none"
                  style={{ WebkitTouchCallout: "none", userSelect: "none", cursor: "zoom-in" }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomOpen(true);
                  }}
                  className="absolute top-3 right-3 z-[2] bg-white/90 backdrop-blur rounded-full p-2 shadow-sm border border-gray-200 hover:bg-white"
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
                <div
                  className="relative w-full aspect-square overflow-hidden bg-white"
                  onContextMenu={(e) => e.preventDefault()}
                  style={{ touchAction: "pinch-zoom", WebkitTouchCallout: "none", userSelect: "none" }}
                >
                  <OptimizedImage
                    src={uniqueImages[selectedImage]}
                    alt={getProductAlt(product.name, product.brand, "zoomed view")}
                    width={1000}
                    height={1000}
                    className="w-full h-full object-contain"
                  />
                  {/* Pointer-events-none overlay — blocks mobile long-press save */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 z-10 pointer-events-none"
                    style={{ WebkitTouchCallout: "none" }}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Info Column */}
          <div className="lg:col-span-4 space-y-4">
            <h1 className="text-xl md:text-2xl font-bold leading-tight text-gray-900">{product.name}</h1>

            <div className="text-xs text-muted-foreground">
              SKU: {product.sku || `TM-${product.id.slice(0, 5).toUpperCase()}`}
            </div>

            <div className="flex items-end gap-2.5 flex-wrap">
              <span className="text-2xl md:text-3xl font-extrabold text-gray-900">{formatPrice(product.price)}</span>
              {product.original_price && (
                <>
                  <span className="text-base text-muted-foreground line-through mb-0.5">
                    {formatPrice(product.original_price)}
                  </span>
                  <Badge className="bg-[#FF5722] hover:bg-[#e64a19] text-white rounded px-1.5 py-0.5 mb-1 text-[9px] uppercase font-bold">
                    {discount}% OFF
                  </Badge>
                </>
              )}
            </div>

            {cleanDescription && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Description</h3>
                <div className="relative">
                  <div
                    className={`prose prose-sm max-w-none text-sm text-gray-600 leading-relaxed overflow-hidden transition-all duration-300 ${
                      descExpanded ? "" : "line-clamp-3"
                    }`}
                    dangerouslySetInnerHTML={{ __html: cleanDescription }}
                  />
                  <button
                    type="button"
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="text-[#FF5722] hover:text-[#e64a19] text-sm font-semibold mt-1 transition-colors"
                  >
                    {descExpanded ? "Show less" : "See more"}
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-6 py-1 flex-wrap">
              <div className="flex items-center gap-1.5 text-green-600 text-sm font-semibold">
                <Check className="h-4 w-4" /> In Stock
              </div>
              <div className="flex items-center gap-1.5 text-gray-700 text-sm font-medium">
                <Truck className="h-4 w-4" /> Nationwide Delivery
              </div>
            </div>

             <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center border border-gray-300 rounded-md bg-white">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-none border-r border-gray-300 hover:bg-gray-50 text-gray-600"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-10 text-center font-medium text-xs">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-none border-l border-gray-300 hover:bg-gray-50 text-gray-600"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-1.5">
              {/* Primary CTA — WhatsApp (top, most prominent) */}
              <WhatsAppOrderButton
                productName={product.name}
                price={formatPrice(product.price)}
                url={`${SITE.url}/product/${product.slug}`}
              />

              {/* Secondary CTAs — Add to Cart + Buy Now (same size, side-by-side on sm+) */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <Button
                  className="flex-1 bg-[#FF5722] hover:bg-[#e64a19] active:bg-[#c73d14] text-white h-10 font-bold shadow-none text-xs rounded-md"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="h-4 w-4 mr-2 flex-shrink-0" />
                  ADD TO CART
                </Button>
                <Button
                  className="flex-1 bg-[#0f172a] hover:bg-[#1e293b] active:bg-[#0a1020] text-white h-10 font-bold shadow-none text-xs rounded-md"
                  onClick={async () => { await handleAddToCart(); navigate("/cart"); }}
                >
                  BUY NOW
                </Button>
              </div>
            </div>


            <div className="flex items-center gap-4 pt-1 flex-wrap">
              <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#FF5722] font-medium transition-colors">
                <Heart className="h-4 w-4" /> Add to Wishlist
              </button>
              <ProductShareButton
                productName={product.name}
                productSlug={product.slug}
                price={formatPrice(product.price)}
                description={product.description || ""}
              />
            </div>

            {/* Product Tags */}
            {((product.tags && product.tags.length > 0) || (product.generated_tags && product.generated_tags.length > 0)) && (
              <ProductTags
                tags={product.tags}
                generatedTags={product.generated_tags}
                className="pt-1"
              />
            )}



          </div>

          {/* Right Column — Key Features */}
          <div className="lg:col-span-3">
            {(() => {
              const features = parseKeyFeatures(product.key_features);
              return features.length > 0 ? (
              <Card className="bg-gray-50/50 border-gray-200 shadow-sm rounded-xl overflow-hidden lg:sticky lg:top-24">
                <CardContent className="p-5">
                  <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#FF5722] flex-shrink-0">
                      <Check className="h-3 w-3 text-white" />
                    </span>
                    Key Features
                  </h3>
                  <ul className="space-y-3 list-none">
                    {features.map((feature, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed"
                      >
                        <Check className="h-4 w-4 text-[#FF5722] mt-0.5 flex-shrink-0" />
                        <span className="break-words min-w-0">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : (

              <Card className="bg-gray-50/50 border-gray-200 shadow-sm rounded-xl overflow-hidden lg:sticky lg:top-24">
                <CardContent className="p-5">
                  <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-3">Why Buy From Us</h3>
                  <ul className="space-y-3 list-none">
                    {[
                      "Genuine products, verified quality",
                      "Fast nationwide delivery across Kenya",
                      "Secure & flexible payment options",
                      "Dedicated after-sales support",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed">
                        <Check className="h-4 w-4 text-[#FF5722] mt-0.5 flex-shrink-0" />
                        <span className="break-words min-w-0">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
            })()}
          </div>

        </div>



        {/* Related Products */}
        <RelatedProducts
          currentProductId={product.id}
          tags={product.tags}
          generatedTags={product.generated_tags}
          categoryId={product.category_id}
          productName={product.name}
        />
      </main>
      <Footer />
    </div>
  );
};

export default Product;
