import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload, Image as ImageIcon, Wand2 } from "lucide-react";

const WatermarkSettings = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [watermarkUrl, setWatermarkUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<string>("");

  useEffect(() => { fetchWatermark(); }, []);

  const fetchWatermark = async () => {
    const { data } = supabase.storage.from("system-assets").getPublicUrl("watermark.png");
    try {
      const res = await fetch(data.publicUrl, { method: "HEAD" });
      if (res.ok) setWatermarkUrl(data.publicUrl + "?t=" + Date.now());
    } catch { /* ignore */ }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "image/png") return toast.error("Watermark must be a PNG with transparency");
    if (file.size > 5 * 1024 * 1024) return toast.error("File size must be less than 5MB");

    setIsUploading(true);
    try {
      const { error } = await supabase.storage
        .from("system-assets")
        .upload("watermark.png", file, { cacheControl: "3600", upsert: true });
      if (error) throw error;
      toast.success("Watermark uploaded");
      fetchWatermark();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const runBulkWatermark = async (force: boolean) => {
    setIsProcessing(true);
    setProgress("Starting bulk watermark...");
    let totalProcessed = 0, totalSkipped = 0, totalFailed = 0;
    let round = 0;
    try {
      while (true) {
        round++;
        setProgress(`Batch ${round}: processing up to 50 products...`);
        const { data, error } = await supabase.functions.invoke("bulk-watermark-products", {
          body: { limit: 50, force },
        });
        if (error) throw new Error(error.message);
        if (!data) throw new Error("No response from server");
        totalProcessed += data.processed || 0;
        totalSkipped += data.skipped || 0;
        totalFailed += data.failed || 0;
        // Stop when nothing more changed
        if ((data.processed || 0) === 0) break;
        if (round >= 50) break; // safety: max 2500 products per click
      }
      toast.success(`Done — watermarked ${totalProcessed}, skipped ${totalSkipped}, failed ${totalFailed}`);
      setProgress("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk watermark failed");
      setProgress("");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Watermark Settings</h2>
        <p className="text-muted-foreground">
          Automatically apply your logo to every product image. New uploads are watermarked instantly.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Watermark Image</CardTitle>
          <CardDescription>
            PNG with transparent background works best. Applied at ~10% width, 25% opacity in the bottom-right corner.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Current Watermark</Label>
            <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center bg-muted/30 relative overflow-hidden h-64">
              {watermarkUrl ? (
                <img src={watermarkUrl} alt="Watermark preview" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                  <p className="mt-2 text-sm text-muted-foreground">No watermark uploaded yet</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Button disabled={isUploading}>
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload PNG Watermark
              </Button>
              <input
                type="file"
                accept="image/png"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            <p className="text-xs text-muted-foreground">PNG only · Max 5MB · Transparent background recommended</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Apply to Existing Products</CardTitle>
          <CardDescription>
            Re-process all products in your catalogue to add the watermark to images uploaded before this feature was enabled.
            New uploads are watermarked automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => runBulkWatermark(false)} disabled={isProcessing || !watermarkUrl}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Watermark Un-processed Images
            </Button>
            <Button variant="outline" onClick={() => runBulkWatermark(true)} disabled={isProcessing || !watermarkUrl}>
              Re-process All (Force)
            </Button>
          </div>
          {progress && <p className="text-sm text-muted-foreground">{progress}</p>}
          {!watermarkUrl && (
            <p className="text-xs text-amber-600">Upload a watermark PNG above before running bulk processing.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WatermarkSettings;
