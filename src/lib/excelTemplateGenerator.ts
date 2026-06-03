import ExcelJS from "exceljs";
import * as XLSX from "xlsx";

export interface CategoryWithSubcategories {
  id: string;
  name: string;
  parent_id: string | null;
  subcategories: Array<{
    id: string;
    name: string;
    parent_id: string;
  }>;
}

/** 0-based column index → Excel letter ("A", "Z", "AA", …). */
function colIndexToLetter(idx: number): string {
  let letter = "";
  let n = idx;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

/**
 * Generates a product-import Excel template with dependent
 * Category → Sub-category dropdowns.
 *
 * Layout of the hidden "DropdownData" sheet:
 *   Row 1, columns B…  = parent category name (header for each column)
 *   Rows 2…,  column A = list of all parent category names (AllCategories)
 *   Rows 2…,  columns B… = subcategories under each parent
 *
 * The subcategory dropdown uses OFFSET + MATCH so it works for any
 * category name (including names with spaces or special characters,
 * which can break the alternative INDIRECT/named-range approach).
 */
export async function generateProductImportTemplate(
  categories: CategoryWithSubcategories[]
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Toolsman Admin";
  workbook.created = new Date();

  // ── 1. Hidden DropdownData sheet ─────────────────────────────────────────
  const ddSheet = workbook.addWorksheet("DropdownData", { state: "veryHidden" });

  const categoryNames = categories.map((c) => c.name);
  const maxSubs = Math.max(0, ...categories.map((c) => c.subcategories.length));

  // Column A = list of all parent category names (rows 2..N+1)
  categoryNames.forEach((name, i) => {
    ddSheet.getCell(i + 2, 1).value = name;
  });

  // Columns B+ = one column per category. Row 1 = header (category name),
  // rows 2..  = its subcategories.
  categories.forEach((cat, catIdx) => {
    const col = catIdx + 2; // B, C, D, …
    ddSheet.getCell(1, col).value = cat.name;
    cat.subcategories.forEach((sub, subIdx) => {
      ddSheet.getCell(subIdx + 2, col).value = sub.name;
    });
  });

  // Named range for the parent-category dropdown
  if (categoryNames.length > 0) {
    workbook.definedNames.add(
      `DropdownData!$A$2:$A$${categoryNames.length + 1}`,
      "AllCategories"
    );
  }

  const lastCatCol = colIndexToLetter(categories.length); // last col letter for B..lastCatCol
  // Lookup range used by MATCH (the header row of category columns)
  const headerRange = `DropdownData!$B$1:$${lastCatCol}$1`;
  // Whole subcategory grid (rows 2..maxSubs+1) — OFFSET works off DropdownData!$A$1
  const subGridRows = Math.max(1, maxSubs);

  // ── 2. Products sheet ────────────────────────────────────────────────────
  const ws = workbook.addWorksheet("Products");
  ws.columns = [
    { header: "name", key: "name", width: 25 },
    { header: "description", key: "description", width: 40 },
    { header: "price", key: "price", width: 12 },
    { header: "original_price", key: "original_price", width: 15 },
    { header: "sku", key: "sku", width: 12 },
    { header: "category", key: "category", width: 24 },        // col F
    { header: "sub_category", key: "sub_category", width: 24 }, // col G
    { header: "brand", key: "brand", width: 15 },
    { header: "tags", key: "tags", width: 25 },
    { header: "key_features", key: "key_features", width: 30 },
    { header: "image_url", key: "image_url", width: 35 },
    { header: "image_url_2", key: "image_url_2", width: 35 },
    { header: "image_url_3", key: "image_url_3", width: 35 },
    { header: "image_url_4", key: "image_url_4", width: 35 },
    { header: "image_url_5", key: "image_url_5", width: 35 },
  ];
  ws.getRow(1).font = { bold: true };

  // Sample row
  ws.addRow({
    name: "Example Product",
    description: "Durable construction. Easy installation. Rust resistant.",
    price: 9999,
    original_price: 12999,
    sku: "SKU-001",
    category: categoryNames[0] ?? "",
    sub_category: categories[0]?.subcategories[0]?.name ?? "",
    brand: "Brand Name",
    tags: "tag1, tag2, tag3",
    key_features: "Durable construction. Easy installation. Rust resistant.",
    image_url: "https://example.com/image1.jpg",
  });

  ws.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];

  const DATA_ROWS = 2001;
  for (let row = 2; row <= DATA_ROWS; row++) {
    // Parent category dropdown
    ws.getCell(row, 6).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ["AllCategories"],
      showInputMessage: true,
      promptTitle: "Category",
      prompt: "Pick a parent category",
      showErrorMessage: true,
      errorTitle: "Invalid Category",
      error: "Choose a category from the dropdown",
    };

    // Dependent sub-category dropdown — uses OFFSET/MATCH so it works for
    // any category name (spaces, &, /, etc.). When the category cell is
    // blank or unrecognised the dropdown simply shows nothing.
    const subFormula =
      `OFFSET(DropdownData!$A$2,0,MATCH(F${row},${headerRange},0),${subGridRows},1)`;
    ws.getCell(row, 7).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [subFormula],
      showInputMessage: true,
      promptTitle: "Sub-category",
      prompt: "Sub-categories filter automatically based on the category you picked",
      showErrorMessage: false,
    };
  }

  // ── 3. Download ──────────────────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "Toolsman_Product_Import_Template.xlsx";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Parses an uploaded Excel/CSV file. Prefers the "Products" sheet and
 * skips the "DropdownData" helper sheet.
 */
export function parseExcelFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error("Failed to read file data"));
          return;
        }
        const workbook = XLSX.read(data, { type: "array" });
        if (workbook.SheetNames.length === 0) {
          reject(new Error("No sheets found in the Excel file"));
          return;
        }
        const sheetName =
          workbook.SheetNames.find((n) => n.toLowerCase() === "products") ||
          workbook.SheetNames.find((n) => n.toLowerCase() !== "dropdowndata") ||
          workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, string>[];
        if (jsonData.length === 0) {
          reject(new Error("No data rows found. Make sure the headers row is intact and at least one product row is filled."));
          return;
        }
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read Excel file"));
    reader.readAsArrayBuffer(file);
  });
}
