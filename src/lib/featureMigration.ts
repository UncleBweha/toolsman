/**
 * ============================================================
 * TOOLSMAN KEY FEATURES — Data Migration Utility
 * ============================================================
 *
 * Scans all products in the database, detects malformed key_features,
 * repairs them using the production-grade parser, and saves corrections.
 *
 * Features:
 *  - Paginated batch processing (100 products per batch)
 *  - Dry-run mode (preview without saving)
 *  - Per-product snapshot for rollback
 *  - Structured logging (before/after for every changed product)
 *  - Progress reporting via callback
 *  - Error handling: individual product failures don't stop the batch
 */

import { supabase } from "@/integrations/supabase/client";
import { parseKeyFeatures, detectMalformedFeatures } from "@/lib/featureParser";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface MigrationProductResult {
  id: string;
  name: string;
  before: string[];
  after: string[];
  changed: boolean;
  malformedScore: number;
  malformedReasons: string[];
  error?: string;
}

export interface MigrationResult {
  total: number;
  updated: number;
  unchanged: number;
  skipped: number;
  errors: number;
  dryRun: boolean;
  startedAt: string;
  completedAt: string;
  products: MigrationProductResult[];
}

export interface MigrationProgress {
  processed: number;
  total: number;
  currentProduct: string;
  percentComplete: number;
}

export type ProgressCallback = (progress: MigrationProgress) => void;

// Storage key for rollback snapshots
const ROLLBACK_KEY = "toolsman_feature_migration_rollback";
const BATCH_SIZE = 100;

// ─────────────────────────────────────────────────────────────
// Rollback Snapshot Management
// ─────────────────────────────────────────────────────────────

interface RollbackSnapshot {
  createdAt: string;
  products: Record<string, { id: string; name: string; features: string[] }>;
}

export function saveRollbackSnapshot(
  products: { id: string; name: string; features: string[] }[]
): void {
  const snapshot: RollbackSnapshot = {
    createdAt: new Date().toISOString(),
    products: Object.fromEntries(products.map((p) => [p.id, p])),
  };
  try {
    localStorage.setItem(ROLLBACK_KEY, JSON.stringify(snapshot));
  } catch {
    // LocalStorage might be full — not critical
    console.warn("[FeatureMigration] Could not save rollback snapshot to localStorage");
  }
}

export function loadRollbackSnapshot(): RollbackSnapshot | null {
  try {
    const raw = localStorage.getItem(ROLLBACK_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RollbackSnapshot;
  } catch {
    return null;
  }
}

export function clearRollbackSnapshot(): void {
  localStorage.removeItem(ROLLBACK_KEY);
}

// ─────────────────────────────────────────────────────────────
// Core Migration Logic
// ─────────────────────────────────────────────────────────────

/**
 * runFeatureMigration
 * ====================
 * Main entry point. Scans all products and repairs malformed key_features.
 *
 * @param dryRun       - If true, analyses products but does NOT write to DB
 * @param onProgress   - Optional callback fired after each batch
 * @returns            - Full MigrationResult with per-product details
 */
export async function runFeatureMigration(
  dryRun = false,
  onProgress?: ProgressCallback
): Promise<MigrationResult> {
  const startedAt = new Date().toISOString();
  const allResults: MigrationProductResult[] = [];

  // ── Count total products ────────────────────────────────────────────────
  const { count, error: countError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true });

  if (countError) {
    throw new Error(`Failed to count products: ${countError.message}`);
  }

  const total = count ?? 0;

  if (total === 0) {
    return {
      total: 0,
      updated: 0,
      unchanged: 0,
      skipped: 0,
      errors: 0,
      dryRun,
      startedAt,
      completedAt: new Date().toISOString(),
      products: [],
    };
  }

  // ── Snapshot collection for rollback ───────────────────────────────────
  const rollbackData: { id: string; name: string; features: string[] }[] = [];

  // ── Paginated batch processing ─────────────────────────────────────────
  let processed = 0;
  let offset = 0;

  while (offset < total) {
    const { data: batch, error: batchError } = await supabase
      .from("products")
      .select("id, name, key_features")
      .order("created_at", { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (batchError) {
      throw new Error(`Failed to fetch products batch at offset ${offset}: ${batchError.message}`);
    }

    if (!batch || batch.length === 0) break;

    // Collect rollback data before any changes
    for (const product of batch) {
      const currentFeatures: string[] = Array.isArray(product.key_features)
        ? product.key_features
        : [];
      rollbackData.push({
        id: product.id,
        name: product.name,
        features: currentFeatures,
      });
    }

    // Process each product in the batch
    for (const product of batch) {
      const currentFeatures: string[] = Array.isArray(product.key_features)
        ? product.key_features
        : [];

      // Run detection
      const { isMalformed, score, reasons } = detectMalformedFeatures(currentFeatures);

      // Run parser on the raw stored array
      const repairedFeatures = parseKeyFeatures(currentFeatures);

      // Check if anything actually changed
      const changed =
        JSON.stringify(currentFeatures) !== JSON.stringify(repairedFeatures);

      const result: MigrationProductResult = {
        id: product.id,
        name: product.name,
        before: currentFeatures,
        after: repairedFeatures,
        changed,
        malformedScore: score,
        malformedReasons: reasons,
      };

      // Write to DB if not dry-run and something changed
      if (!dryRun && changed) {
        const { error: updateError } = await supabase
          .from("products")
          .update({ key_features: repairedFeatures })
          .eq("id", product.id);

        if (updateError) {
          result.error = updateError.message;
        }
      }

      allResults.push(result);
      processed++;

      if (onProgress) {
        onProgress({
          processed,
          total,
          currentProduct: product.name,
          percentComplete: Math.round((processed / total) * 100),
        });
      }
    }

    offset += BATCH_SIZE;
  }

  // ── Save rollback snapshot ─────────────────────────────────────────────
  if (!dryRun) {
    saveRollbackSnapshot(rollbackData);
  }

  // ── Persist audit log to DB (best-effort) ─────────────────────────────
  const changedProducts = allResults.filter((r) => r.changed && !r.error);
  if (!dryRun && changedProducts.length > 0) {
    try {
      await supabase.from("feature_cleanup_log" as any).insert({
        run_at: startedAt,
        dry_run: false,
        total_scanned: total,
        total_changed: changedProducts.length,
        product_ids: changedProducts.map((r) => r.id),
        details: changedProducts.map((r) => ({
          id: r.id,
          name: r.name,
          before: r.before,
          after: r.after,
        })) as any,
      });
    } catch {
      // Ignore if the log table doesn't exist yet
    }
  }

  const completedAt = new Date().toISOString();

  return {
    total,
    updated: allResults.filter((r) => r.changed && !r.error).length,
    unchanged: allResults.filter((r) => !r.changed).length,
    skipped: allResults.filter((r) => !r.changed && r.malformedScore === 0).length,
    errors: allResults.filter((r) => !!r.error).length,
    dryRun,
    startedAt,
    completedAt,
    products: allResults,
  };
}

// ─────────────────────────────────────────────────────────────
// Rollback
// ─────────────────────────────────────────────────────────────

/**
 * rollbackFeatureMigration
 * =========================
 * Restores all products to their pre-migration state using the snapshot
 * saved in localStorage during the last migration run.
 *
 * @param onProgress  - Optional progress callback
 * @returns           - Number of products restored
 */
export async function rollbackFeatureMigration(
  onProgress?: ProgressCallback
): Promise<{ restored: number; errors: number; message: string }> {
  const snapshot = loadRollbackSnapshot();

  if (!snapshot) {
    return {
      restored: 0,
      errors: 0,
      message: "No rollback snapshot found. Either no migration has been run, or the snapshot was cleared.",
    };
  }

  const products = Object.values(snapshot.products);
  let restored = 0;
  let errors = 0;

  for (let i = 0; i < products.length; i++) {
    const { id, name, features } = products[i];

    if (onProgress) {
      onProgress({
        processed: i + 1,
        total: products.length,
        currentProduct: name,
        percentComplete: Math.round(((i + 1) / products.length) * 100),
      });
    }

    const { error } = await supabase
      .from("products")
      .update({ key_features: features })
      .eq("id", id);

    if (error) {
      errors++;
    } else {
      restored++;
    }
  }

  if (errors === 0) {
    clearRollbackSnapshot();
  }

  return {
    restored,
    errors,
    message:
      errors === 0
        ? `Successfully restored ${restored} products to pre-migration state.`
        : `Restored ${restored} products. ${errors} failed — snapshot kept for retry.`,
  };
}

// ─────────────────────────────────────────────────────────────
// Quick Scan (for admin dashboard summary)
// ─────────────────────────────────────────────────────────────

export interface QuickScanResult {
  totalProducts: number;
  affectedProducts: number;
  affectedIds: string[];
  sampleProblems: Array<{
    id: string;
    name: string;
    before: string[];
    after: string[];
    reasons: string[];
  }>;
}

/**
 * quickScan
 * =========
 * Fast scan that checks the first 500 products and returns summary statistics.
 * Used to populate the admin tool's overview panel without running a full migration.
 */
export async function quickScan(limit = 500): Promise<QuickScanResult> {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, key_features")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Quick scan failed: ${error.message}`);

  const products = data ?? [];
  const affected: typeof sampleProblems = [];
  const affectedIds: string[] = [];

  const sampleProblems: Array<{
    id: string;
    name: string;
    before: string[];
    after: string[];
    reasons: string[];
  }> = [];

  for (const product of products) {
    const current: string[] = Array.isArray(product.key_features)
      ? product.key_features
      : [];

    if (current.length === 0) continue;

    const { isMalformed, reasons } = detectMalformedFeatures(current);
    const repaired = parseKeyFeatures(current);
    const changed = JSON.stringify(current) !== JSON.stringify(repaired);

    if (isMalformed || changed) {
      affectedIds.push(product.id);
      sampleProblems.push({
        id: product.id,
        name: product.name,
        before: current,
        after: repaired,
        reasons,
      });
    }
  }

  return {
    totalProducts: products.length,
    affectedProducts: affectedIds.length,
    affectedIds,
    sampleProblems: sampleProblems.slice(0, 20), // cap at 20 for UI
  };
}
