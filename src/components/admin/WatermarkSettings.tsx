import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload, Image as ImageIcon, Wand2, Type, AlertTriangle } from "lucide-react";
import { watermarkUrl, uploadWatermarkedBlob, isAlreadyWatermarked, resetWatermarkCache } from "@/lib/watermark";

const WatermarkSettings = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [isFontUploading, setIsFontUploading] = useState(false);
  const [watermarkUrl, setWatermarkUrl] = useState<string | null>(null);
  const [fontExists, setFontExists] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<string>("");

  useEffect(() => {
    fetchWatermark();
    checkFont();
  }, []);

  const fetchWatermark = async () => {
    const { data } = supabase.storage.from("system-assets").getPublicUrl("watermark.png");
    try {
      const res = await fetch(data.publicUrl, { method: "HEAD" });
      if (res.ok) setWatermarkUrl(data.publicUrl + "?t=" + Date.now());
      else setWatermarkUrl(null);
    } catch {
      setWatermarkUrl(null);
    }
  };

  const checkFont = async () => {
    const { data } = supabase.storage.from("system-assets").getPublicUrl("cinzel-font.ttf");
    try {
      const res = await fetch(data.publicUrl, { method: "HEAD" });
      setFontExists(res.ok);
    } catch {
      setFontExists(false);
    }
  };

  const handleWatermarkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "image/png") return void toast.error("Watermark must be a PNG file");
    if (file.size > 5 * 1024 * 1024) return void toast.error("File must be under 5 MB");

    setIsUploading(true);
    try {
      const { error } = await supabase.storage
        .from("system-assets")
        .upload("watermark.png", file, { cacheControl: "3600", upsert: true });
      if (error) throw error;
      toast.success("Watermark logo uploaded successfully");
      fetchWatermark();
      resetWatermarkCache();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".ttf") && !file.name.endsWith(".otf"))
      return void toast.error("Please upload a TTF or OTF font file");
    if (file.size > 10 * 1024 * 1024) return void toast.error("Font must be under 10 MB");

    setIsFontUploading(true);
    try {
      const { error } = await supabase.storage
        .from("system-assets")
        .upload("cinzel-font.ttf", file, { cacheControl: "3600", upsert: true });
      if (error) throw error;
      toast.success("Font uploaded — text watermark fallback is now active");
      checkFont();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Font upload failed");
    } finally {
      setIsFontUploading(false);
    }
  };

  const runBulkWatermark = async (force: boolean) => {
    if (!watermarkUrl && !fontExists) {
      toast.error("Upload a watermark logo or font first.");
      return;
    }
    setIsProcessing(true);
    setProgress("Starting bulk watermark...");
    let totalProcessed = 0, totalSkipped = 0, totalFailed = 0;
    let round = 0;
    let lastId = "";
    try {
      while (true) {
        round++;
        setProgress(`Batch ${round}: fetching products...`);
        let query = supabase
          .from("products")
          .select("id, image_url")
          .not("image_url", "is", null)
          .order("id", { ascending: true })
          .limit(50);

        if (lastId) {
          query = query.gt("id", lastId);
        }

        const { data: products, error } = await query;
        if (error) throw error;
        if (!products || products.length === 0) break;

        for (const p of products) {
          lastId = p.id;
          const url = p.image_url;
          if (!url) {
            totalSkipped++;
            continue;
          }

          if (!force && isAlreadyWatermarked(url)) {
            totalSkipped++;
            continue;
          }

          try {
            setProgress(`Batch ${round}: watermarking product ${p.id}...`);
            const blob = await watermarkUrl(url);
            const pubUrl = await uploadWatermarkedBlob(blob);

            const { error: updateErr } = await supabase
              .from("products")
              .update({ image_url: pubUrl })
              .eq("id", p.id);

            if (updateErr) throw updateErr;
            totalProcessed++;
          } catch (err) {
            console.error(`Failed to watermark product ${p.id}:`, err);
            totalFailed++;
          }
        }

        if (products.length < 50) break;
        if (round >= 100) break; // safety: max 5,000 products per run
      }
      toast.success(`Done — ✅ ${totalProcessed} watermarked · ⏭ ${totalSkipped} skipped · ❌ ${totalFailed} failed`);
      setProgress("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk watermark failed");
      setProgress("");
    } finally {
      setIsProcessing(false);
    }
  };

  const hasAsset = watermarkUrl || fontExists;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Watermark Settings</h2>
        <p className="text-muted-foreground mt-1">
          Every product image is automatically watermarked when uploaded or imported.
          New uploads go through the watermark engine instantly.
        </p>
      </div>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">How the watermark is applied</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>• <strong>Position:</strong> Horizontally centered, ~60 % down the image</p>
          <p>• <strong>Opacity:</strong> 30 % — visible but not obstructive</p>
          <p>• <strong>Scale:</strong> 35 % of the product image width (auto-scales)</p>
          <p>• <strong>Priority:</strong> Logo PNG first → Cinzel font text fallback</p>
          <p>• <strong>Formats:</strong> JPG and PNG fully supported; WebP is skipped (logged)</p>
        </CardContent>
      </Card>

      {/* ── WATERMARK LOGO ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Watermark Logo (Recommended)
          </CardTitle>
          <CardDescription>
            Upload a <strong>PNG with a transparent background</strong> containing your
            brand text/logo — e.g. export the "TOOLSMAN" gold serif text as a PNG.
            This is applied at 35 % width, 30 % opacity, centered lower-middle on every product image.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Current Watermark</Label>
            <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center bg-muted/30 h-48 relative overflow-hidden">
              {watermarkUrl ? (
                <>
                  <img
                    src={watermarkUrl}
                    alt="Watermark preview"
                    className="max-w-full max-h-full object-contain"
                  />
                  <div className="absolute bottom-2 right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                    Active
                  </div>
                </>
              ) : (
                <div className="text-center space-y-2">
                  <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground opacity-30" />
                  <p className="text-sm text-muted-foreground">No watermark logo uploaded yet</p>
                  <p className="text-xs text-amber-600 flex items-center justify-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Text fallback will be used if font is uploaded
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Button disabled={isUploading} variant={watermarkUrl ? "outline" : "default"}>
                {isUploading
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Upload className="mr-2 h-4 w-4" />}
                {watermarkUrl ? "Replace Watermark PNG" : "Upload Watermark PNG"}
              </Button>
              <input
                type="file"
                accept="image/png"
                onChange={handleWatermarkUpload}
                disabled={isUploading}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            <p className="text-xs text-muted-foreground">PNG only · Max 5 MB · Transparent background</p>
          </div>
        </CardContent>
      </Card>

      {/* ── FONT FALLBACK ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Text Watermark Font (Fallback)
          </CardTitle>
          <CardDescription>
            If no logo PNG is uploaded, the system renders <strong>"TOOLSMAN"</strong> in gold/beige
            (#d4c3a3) using this font. Upload a TTF font — we recommend{" "}
            <a
              href="https://fonts.google.com/specimen/Cinzel"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-primary"
            >
              Cinzel Medium
            </a>{" "}
            to match the style in your examples.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${fontExists ? "bg-green-500" : "bg-amber-400"}`} />
            <p className="text-sm">
              {fontExists
                ? "cinzel-font.ttf is uploaded and active as fallback"
                : "No fallback font uploaded — upload one below"}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Button disabled={isFontUploading} variant="outline">
                {isFontUploading
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Upload className="mr-2 h-4 w-4" />}
                {fontExists ? "Replace Font (TTF/OTF)" : "Upload Font (TTF/OTF)"}
              </Button>
              <input
                type="file"
                accept=".ttf,.otf"
                onChange={handleFontUpload}
                disabled={isFontUploading}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            <p className="text-xs text-muted-foreground">TTF or OTF · Max 10 MB</p>
          </div>
        </CardContent>
      </Card>

      {/* ── BULK PROCESSING ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Apply to Existing Catalog
          </CardTitle>
          <CardDescription>
            Scan and watermark all products that were uploaded before this feature was enabled.
            New uploads are watermarked automatically — this tool handles the backlog.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!hasAsset && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              Upload a watermark logo PNG or font file above before running bulk processing.
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => runBulkWatermark(false)}
              disabled={isProcessing || !hasAsset}
            >
              {isProcessing
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Wand2 className="mr-2 h-4 w-4" />}
              Watermark Un-processed Images
            </Button>
            <Button
              variant="outline"
              onClick={() => runBulkWatermark(true)}
              disabled={isProcessing || !hasAsset}
            >
              Re-process All (Force)
            </Button>
          </div>
          {progress && (
            <p className="text-sm text-muted-foreground animate-pulse">{progress}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Processes up to 5 000 images per run in batches of 50. Large catalogs may take several minutes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default WatermarkSettings;
