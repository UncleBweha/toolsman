import { useState, useEffect, useCallback } from "react";
import {
  runFeatureMigration,
  rollbackFeatureMigration,
  quickScan,
  loadRollbackSnapshot,
  type MigrationResult,
  type MigrationProgress,
  type QuickScanResult,
} from "@/lib/featureMigration";
import { parseKeyFeatures } from "@/lib/featureParser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Play,
  RotateCcw,
  FileText,
  ChevronDown,
  ChevronRight,
  Loader2,
  Eye,
  Sparkles,
  Shield,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

const StatCard = ({
  icon: Icon,
  label,
  value,
  color = "gray",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color?: "green" | "red" | "amber" | "blue" | "gray";
}) => {
  const colors = {
    green: "bg-green-50 border-green-200 text-green-700",
    red: "bg-red-50 border-red-200 text-red-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    gray: "bg-gray-50 border-gray-200 text-gray-700",
  };

  return (
    <div className={`rounded-lg border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
};

const FeatureDiff = ({
  before,
  after,
  name,
}: {
  before: string[];
  after: string[];
  name: string;
}) => {
  const [expanded, setExpanded] = useState(false);
  const changed = JSON.stringify(before) !== JSON.stringify(after);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          {changed ? (
            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
          )}
          <span className="font-medium text-sm truncate">{name}</span>
          {changed && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px] flex-shrink-0">
              Will change
            </Badge>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="grid md:grid-cols-2 divide-x">
          {/* Before */}
          <div className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600 mb-2 flex items-center gap-1">
              <XCircle className="h-3 w-3" /> Before (Current)
            </p>
            {before.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No features</p>
            ) : (
              <ul className="space-y-1.5">
                {before.map((f, i) => {
                  const inAfter = after.includes(f);
                  return (
                    <li
                      key={i}
                      className={`text-xs flex items-start gap-1.5 ${
                        !inAfter ? "text-red-700 bg-red-50 rounded px-1.5 py-0.5" : "text-gray-600"
                      }`}
                    >
                      <span className="mt-0.5 flex-shrink-0">•</span>
                      <span>{f}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* After */}
          <div className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-green-600 mb-2 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> After (Fixed)
            </p>
            {after.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No features</p>
            ) : (
              <ul className="space-y-1.5">
                {after.map((f, i) => {
                  const inBefore = before.includes(f);
                  return (
                    <li
                      key={i}
                      className={`text-xs flex items-start gap-1.5 ${
                        !inBefore ? "text-green-700 bg-green-50 rounded px-1.5 py-0.5" : "text-gray-600"
                      }`}
                    >
                      <span className="mt-0.5 flex-shrink-0">✓</span>
                      <span>{f}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Live Parser Playground
// ─────────────────────────────────────────────────────────────

const ParserPlayground = () => {
  const [input, setInput] = useState(
    `Includes a vast array of metric sockets, hex bits, and extension bars for versatile access
Features high-torque ratchets with ergonomic soft-grip handles for comfortable, efficient operation
Complete set covers 1/4", 3/8", and 1/2" drive requirements for diverse bolt sizes`
  );
  const output = parseKeyFeatures(input);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          Live Parser Playground
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Paste any raw feature text to preview how the parser will clean it.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              Raw Input
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={8}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono text-gray-700 resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Paste raw feature text here…"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              Parsed Output ({output.length} features)
            </label>
            <div className="rounded-md border bg-gray-50 px-3 py-2 min-h-[180px]">
              {output.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No features parsed yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {output.map((f, i) => (
                    <li key={i} className="text-sm text-gray-800 flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────
// Main Feature Cleanup Tool Component
// ─────────────────────────────────────────────────────────────

const FeatureCleanupTool = () => {
  // State
  const [scanResult, setScanResult] = useState<QuickScanResult | null>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<null | "run" | "dryrun" | "rollback">(null);
  const [activeTab, setActiveTab] = useState<"overview" | "preview" | "results" | "logs" | "playground">("overview");
  const [hasRollbackSnapshot, setHasRollbackSnapshot] = useState(false);
  const [showAllChanges, setShowAllChanges] = useState(false);

  // Check for rollback snapshot on mount
  useEffect(() => {
    setHasRollbackSnapshot(loadRollbackSnapshot() !== null);
  }, []);

  // ── Scan ──────────────────────────────────────────────────────────────────
  const handleScan = useCallback(async () => {
    setIsScanning(true);
    setScanResult(null);
    try {
      const result = await quickScan();
      setScanResult(result);
      if (result.affectedProducts === 0) {
        toast.success("All products have clean, well-formatted key features! ✓");
      } else {
        toast.warning(`Found ${result.affectedProducts} products with potentially malformed features.`);
      }
    } catch (err) {
      toast.error("Scan failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setIsScanning(false);
    }
  }, []);

  // ── Dry Run ───────────────────────────────────────────────────────────────
  const handleDryRun = useCallback(async () => {
    setIsRunning(true);
    setMigrationResult(null);
    setProgress(null);
    try {
      const result = await runFeatureMigration(true, setProgress);
      setMigrationResult(result);
      setActiveTab("results");
      toast.info(`Dry run complete: ${result.updated} products would be updated.`);
    } catch (err) {
      toast.error("Dry run failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setIsRunning(false);
      setProgress(null);
    }
  }, []);

  // ── Run Migration ─────────────────────────────────────────────────────────
  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setMigrationResult(null);
    setProgress(null);
    try {
      const result = await runFeatureMigration(false, setProgress);
      setMigrationResult(result);
      setHasRollbackSnapshot(true);
      setActiveTab("results");
      toast.success(
        `Migration complete: ${result.updated} products updated, ${result.unchanged} unchanged.`
      );
    } catch (err) {
      toast.error("Migration failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setIsRunning(false);
      setProgress(null);
    }
  }, []);

  // ── Rollback ──────────────────────────────────────────────────────────────
  const handleRollback = useCallback(async () => {
    setIsRollingBack(true);
    try {
      const result = await rollbackFeatureMigration(setProgress);
      if (result.errors === 0) {
        setHasRollbackSnapshot(false);
        setMigrationResult(null);
        toast.success(result.message);
      } else {
        toast.warning(result.message);
      }
    } catch (err) {
      toast.error("Rollback failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setIsRollingBack(false);
      setProgress(null);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────

  const changedProducts = migrationResult?.products.filter((p) => p.changed) ?? [];
  const errorProducts = migrationResult?.products.filter((p) => !!p.error) ?? [];

  const displayedChanges = showAllChanges ? changedProducts : changedProducts.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#FF5722]" />
            Key Features Cleanup Tool
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Detect, preview, and permanently fix malformed key features across all products.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleScan}
            disabled={isScanning || isRunning}
          >
            {isScanning ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            {isScanning ? "Scanning…" : "Scan Products"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmDialog("dryrun")}
            disabled={isScanning || isRunning}
          >
            <Eye className="h-4 w-4 mr-2" />
            Dry Run
          </Button>
          <Button
            size="sm"
            onClick={() => setConfirmDialog("run")}
            disabled={isScanning || isRunning}
            className="bg-[#FF5722] hover:bg-[#e64a19] text-white"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isRunning ? "Running…" : "Run Cleanup"}
          </Button>
          {hasRollbackSnapshot && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmDialog("rollback")}
              disabled={isRollingBack || isRunning}
            >
              {isRollingBack ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Rollback
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {(isRunning || isRollingBack) && progress && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-blue-800">
                {isRollingBack ? "Rolling back…" : "Processing…"}
              </span>
              <span className="text-blue-600 text-xs">
                {progress.processed} / {progress.total} ({progress.percentComplete}%)
              </span>
            </div>
            <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                style={{ width: `${progress.percentComplete}%` }}
              />
            </div>
            <p className="text-xs text-blue-600 truncate">
              Current: {progress.currentProduct}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="border-b flex gap-0 overflow-x-auto">
        {(
          [
            { id: "overview", label: "Overview" },
            { id: "preview", label: `Preview (${scanResult?.sampleProblems.length ?? 0})` },
            { id: "results", label: migrationResult ? `Results (${migrationResult.total})` : "Results" },
            { id: "logs", label: "Audit Logs" },
            { id: "playground", label: "Playground" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "border-[#FF5722] text-[#FF5722]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ──────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {scanResult ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  icon={FileText}
                  label="Total Scanned"
                  value={scanResult.totalProducts}
                  color="gray"
                />
                <StatCard
                  icon={AlertTriangle}
                  label="Affected Products"
                  value={scanResult.affectedProducts}
                  color={scanResult.affectedProducts > 0 ? "amber" : "green"}
                />
                <StatCard
                  icon={CheckCircle2}
                  label="Clean Products"
                  value={scanResult.totalProducts - scanResult.affectedProducts}
                  color="green"
                />
                <StatCard
                  icon={Shield}
                  label="Clean Rate"
                  value={
                    scanResult.totalProducts > 0
                      ? `${Math.round(
                          ((scanResult.totalProducts - scanResult.affectedProducts) /
                            scanResult.totalProducts) *
                            100
                        )}%`
                      : "—"
                  }
                  color={
                    scanResult.affectedProducts === 0 ? "green" : "amber"
                  }
                />
              </div>

              {scanResult.affectedProducts === 0 ? (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="py-6 text-center">
                    <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
                    <p className="font-semibold text-green-800">All key features look clean!</p>
                    <p className="text-sm text-green-600 mt-1">
                      No malformed or fragmented features detected in the scanned products.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-amber-200">
                  <CardContent className="py-4">
                    <p className="text-sm font-medium text-amber-800 mb-2">
                      ⚠ {scanResult.affectedProducts} products have potentially malformed key features.
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      These products contain features that appear to be fragmented — split
                      incorrectly at commas or line breaks. Run the cleanup to fix them.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveTab("preview")}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview Affected Products
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setConfirmDialog("run")}
                        className="bg-[#FF5722] hover:bg-[#e64a19] text-white"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Fix Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="font-medium text-muted-foreground">No scan results yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Click <strong>Scan Products</strong> to analyse your database.
                </p>
                <Button
                  className="mt-4"
                  onClick={handleScan}
                  disabled={isScanning}
                  variant="outline"
                >
                  {isScanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                  {isScanning ? "Scanning…" : "Run Scan"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Tab: Preview ───────────────────────────────────────────────────── */}
      {activeTab === "preview" && (
        <div className="space-y-3">
          {scanResult && scanResult.sampleProblems.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                Showing {scanResult.sampleProblems.length} affected product(s). Highlighted rows
                show what will change after the cleanup.
              </p>
              {scanResult.sampleProblems.map((p) => (
                <FeatureDiff
                  key={p.id}
                  name={p.name}
                  before={p.before}
                  after={p.after}
                />
              ))}
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>Run a scan first to see affected products.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Tab: Results ───────────────────────────────────────────────────── */}
      {activeTab === "results" && (
        <div className="space-y-4">
          {migrationResult ? (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={FileText} label="Total Scanned" value={migrationResult.total} color="gray" />
                <StatCard
                  icon={CheckCircle2}
                  label={migrationResult.dryRun ? "Would Update" : "Updated"}
                  value={migrationResult.updated}
                  color={migrationResult.updated > 0 ? "green" : "gray"}
                />
                <StatCard icon={Shield} label="Unchanged" value={migrationResult.unchanged} color="blue" />
                <StatCard
                  icon={XCircle}
                  label="Errors"
                  value={migrationResult.errors}
                  color={migrationResult.errors > 0 ? "red" : "gray"}
                />
              </div>

              {migrationResult.dryRun && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <strong>Dry Run Mode</strong> — No changes were saved to the database. This is a preview only.
                  Click <strong>Run Cleanup</strong> to apply the fixes.
                </div>
              )}

              {/* Changed products list */}
              {changedProducts.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-800">
                    {migrationResult.dryRun ? "Products That Would Change" : "Products Updated"}
                    <span className="ml-2 text-muted-foreground font-normal">({changedProducts.length})</span>
                  </h3>
                  {displayedChanges.map((p) => (
                    <FeatureDiff
                      key={p.id}
                      name={p.name}
                      before={p.before}
                      after={p.after}
                    />
                  ))}
                  {changedProducts.length > 10 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowAllChanges(!showAllChanges)}
                    >
                      {showAllChanges
                        ? "Show less"
                        : `Show all ${changedProducts.length} changed products`}
                    </Button>
                  )}
                </div>
              )}

              {/* Errors */}
              {errorProducts.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-red-700">
                    Errors ({errorProducts.length})
                  </h3>
                  {errorProducts.map((p) => (
                    <div
                      key={p.id}
                      className="border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700 flex items-start gap-2"
                    >
                      <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">{p.name}</span>
                        {" — "}
                        {p.error}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>Run a <strong>Dry Run</strong> or <strong>Cleanup</strong> to see results here.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Tab: Audit Logs ────────────────────────────────────────────────── */}
      {activeTab === "logs" && (
        <div className="space-y-3">
          {migrationResult ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b">
                <p className="text-xs font-mono text-gray-500">
                  Migration Log — {migrationResult.dryRun ? "DRY RUN" : "LIVE"} — Started{" "}
                  {new Date(migrationResult.startedAt).toLocaleString()}
                </p>
              </div>
              <div className="p-4 max-h-[500px] overflow-y-auto">
                <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {[
                    `[${migrationResult.startedAt}] Migration started (dry_run=${migrationResult.dryRun})`,
                    `[INFO] Total products scanned: ${migrationResult.total}`,
                    `[INFO] Products with changes: ${migrationResult.updated}`,
                    `[INFO] Products unchanged: ${migrationResult.unchanged}`,
                    `[INFO] Errors: ${migrationResult.errors}`,
                    "",
                    ...migrationResult.products
                      .filter((p) => p.changed || p.error)
                      .map(
                        (p) =>
                          `[${p.error ? "ERROR" : "CHANGED"}] ${p.name} (${p.id.slice(0, 8)})\n` +
                          `  Before: [${p.before.map((f) => `"${f}"`).join(", ")}]\n` +
                          `  After:  [${p.after.map((f) => `"${f}"`).join(", ")}]` +
                          (p.error ? `\n  Error:  ${p.error}` : "")
                      ),
                    "",
                    `[${migrationResult.completedAt}] Migration completed`,
                  ].join("\n")}
                </pre>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No migration logs yet. Run a cleanup to generate logs.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Tab: Playground ────────────────────────────────────────────────── */}
      {activeTab === "playground" && <ParserPlayground />}

      {/* ── Confirmation dialogs ─────────────────────────────────────────── */}
      <AlertDialog open={confirmDialog === "run"} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run Feature Cleanup?</AlertDialogTitle>
            <AlertDialogDescription>
              This will scan ALL products and repair any malformed key features. A rollback
              snapshot will be saved automatically. You can undo this operation immediately after.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#FF5722] hover:bg-[#e64a19] text-white"
              onClick={() => { setConfirmDialog(null); handleRun(); }}
            >
              Run Cleanup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDialog === "dryrun"} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run Dry Run?</AlertDialogTitle>
            <AlertDialogDescription>
              This will analyse all products and show you exactly what would change —
              without modifying any data. Safe to run at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmDialog(null); handleDryRun(); }}>
              Run Dry Run
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDialog === "rollback"} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rollback Migration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore all products to their state <strong>before</strong> the last
              cleanup run. This action cannot be undone after the rollback snapshot is cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { setConfirmDialog(null); handleRollback(); }}
            >
              Rollback
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FeatureCleanupTool;
