import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload, Image as ImageIcon } from "lucide-react";

const WatermarkSettings = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [watermarkUrl, setWatermarkUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchWatermark();
  }, []);

  const fetchWatermark = async () => {
    const { data } = supabase.storage.from("system-assets").getPublicUrl("watermark.png");
    
    // Test if image actually exists by fetching its headers
    try {
      const res = await fetch(data.publicUrl, { method: 'HEAD' });
      if (res.ok) {
        setWatermarkUrl(data.publicUrl + "?t=" + new Date().getTime());
      }
    } catch (e) {
      // Ignore if it doesn't exist
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "image/png") {
      toast.error("Watermark must be a PNG image with transparency");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setIsUploading(true);

    try {
      const { error } = await supabase.storage
        .from("system-assets")
        .upload("watermark.png", file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) throw error;

      toast.success("Watermark image uploaded successfully");
      fetchWatermark();
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to upload watermark");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Watermark Settings</h2>
        <p className="text-muted-foreground">
          Configure the watermark that will be automatically applied to uploaded product images.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Watermark Image</CardTitle>
          <CardDescription>
            Upload a transparent PNG to be used as the watermark. It will be centered on product images.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Current Watermark</Label>
            <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center bg-muted/30 relative overflow-hidden h-64">
              {watermarkUrl ? (
                <img 
                  src={watermarkUrl} 
                  alt="Watermark preview" 
                  className="max-w-full max-h-full object-contain"
                />
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
                {isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
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
            <p className="text-xs text-muted-foreground">
              PNG only. Max 5MB. Use an image with a transparent background.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WatermarkSettings;
