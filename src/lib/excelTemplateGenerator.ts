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

/**
 * Sanitizes a category name to be safe as an Excel named range.
 * Named ranges: start with letter/underscore, only letters/digits/underscores.
 */
function sanitizeNamedRangeName(name: string): string {
  const sanitized = name
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .substring(0, 31);
  return /^\d/.test(sanitized) ? `_${sanitized}` : sanitized;
}

/**
 * Converts a 0-based column index to an Excel column letter string.
 * Handles multi-letter columns: 0→A, 25→Z, 26→AA, …
 */
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
 * Generates a product import Excel template with real working
 * category / sub-category dropdowns.
 *
 * Uses ExcelJS (which has first-class data-validation support) for template
 * creation, and keeps the existing xlsx library for parsing uploaded files.
 *
 * Dropdown mechanism:
 *  - A hidden "DropdownData" sheet holds all category names in column A
 *    and each category's subcategories in subsequent columns (B, C, …).
 *  - Named ranges tie each column to the category it belongs to.
 *  - Column G (category) gets a dropdown sourced from the "Categories" range.
 *  - Column H (sub-category) uses INDIRECT(SUBSTITUTE(Gn," ","_")) so it
 *    dynamically filters to the subcategories of whatever category was chosen.
 */
export async function generateProductImportTemplate(
  categories: CategoryWithSubcategories[]
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Toolsman Admin";
  workbook.created = new Date();

  // ── 1. Hidden DropdownData sheet ─────────────────────────────────────────
  //   Col A  = parent category names
  //   Col B+ = subcategory names for each parent
  const ddSheet = workbook.addWorksheet("DropdownData", {
    state: "veryHidden",
  });

  const categoryNames = categories.map((c) => c.name);

  // Write category names into column A
  categoryNames.forEach((name, rowIdx) => {
    ddSheet.getCell(rowIdx + 1, 1).value = name;
  });

  // Write each category's subcategories into its own column (B, C, …)
  categories.forEach((cat, catIdx) => {
    cat.subcategories.forEach((sub, subIdx) => {
      ddSheet.getCell(subIdx + 1, catIdx + 2).value = sub.name;
    });
  });

  // ── 2. Named ranges ───────────────────────────────────────────────────────
  // "Categories" → all category names in DropdownData column A
  if (categoryNames.length > 0) {
    workbook.definedNames.add(
      `DropdownData!$A$1:$A$${categoryNames.length}`,
      "Categories"
    );
  }

  // One named range per category → its subcategory column in DropdownData
  categories.forEach((cat, idx) => {
    if (cat.subcategories.length === 0) return;
    const sanitized = sanitizeNamedRangeName(cat.name);
    const colLetter = colIndexToLetter(idx + 1); // catIdx 0 → col B, etc.
    workbook.definedNames.add(
      `DropdownData!$${colLetter}$1:$${colLetter}$${cat.subcategories.length}`,
      sanitized
    );
  });

  // ── 3. Products sheet ─────────────────────────────────────────────────────
  const ws = workbook.addWorksheet("Products");

  // Define columns (sets headers + widths in one pass)
  ws.columns = [
    { header: "name", key: "name", width: 25 },
    { header: "description", key: "description", width: 40 },
    { header: "price", key: "price", width: 12 },
    { header: "original_price", key: "original_price", width: 15 },
    { header: "sku", key: "sku", width: 12 },
    // stock_quantity removed — col F = category, col G = sub_category
    { header: "category", key: "category", width: 22 },
    { header: "sub_category", key: "sub_category", width: 22 },
    { header: "brand", key: "brand", width: 15 },
    { header: "tags", key: "tags", width: 25 },
    { header: "key_features", key: "key_features", width: 25 },
    { header: "image_url", key: "image_url", width: 35 },
    { header: "image_url_2", key: "image_url_2", width: 35 },
    { header: "image_url_3", key: "image_url_3", width: 35 },
    { header: "image_url_4", key: "image_url_4", width: 35 },
    { header: "image_url_5", key: "image_url_5", width: 35 },
  ];

  // Bold header row
  ws.getRow(1).font = { bold: true };

  // Sample data row
  ws.addRow({
    name: "Example Product",
    description: "Product description here",
    price: 9999,
    original_price: 12999,
    sku: "SKU-001",
    category: categoryNames[0] ?? "Select Category",
    sub_category:
      categories[0]?.subcategories[0]?.name ?? "Select Sub Category",
    brand: "Brand Name",
    tags: "tag1, tag2, tag3",
    key_features: "Feature 1, Feature 2",
    image_url: "https://example.com/image1.jpg",
    image_url_2: "https://example.com/image2.jpg",
    image_url_3: "https://example.com/image3.jpg",
    image_url_4: "",
    image_url_5: "",
  });

  // Freeze the header row
  ws.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];

  // ── 4. Add data validations ───────────────────────────────────────────────
  // Apply to rows 2–2001 (covers 2,000 products — more than enough for bulk import)
  const DATA_ROWS = 2001;

  for (let row = 2; row <= DATA_ROWS; row++) {
    // Category dropdown — col F (index 6, after removing stock_quantity)
    ws.getCell(row, 6).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ["Categories"],
      showInputMessage: true,
      promptTitle: "Category",
      prompt: "Select a category from the dropdown list",
      showErrorMessage: true,
      errorTitle: "Invalid Category",
      error: "Please select a valid category from the list",
    };

    // Sub-category dropdown — col G (index 7)
    // INDIRECT(SUBSTITUTE(Fn," ","_")) dynamically resolves to the
    // named range matching the category chosen in the same row (col F).
    ws.getCell(row, 7).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`INDIRECT(SUBSTITUTE(F${row}," ","_"))`],
      showInputMessage: true,
      promptTitle: "Sub Category",
      prompt: "Select a sub-category — filtered to match your chosen category",
      showErrorMessage: false,
    };
  }

  // ── 5. Write to buffer and trigger browser download ───────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "product_import_template.xlsx";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Parses an uploaded Excel or CSV file and returns the rows as plain objects.
 * Prioritises the "Products" sheet; skips the "DropdownData" helper sheet.
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

        // Prefer the "Products" sheet; skip utility sheets
        const sheetName =
          workbook.SheetNames.find(
            (n) => n.toLowerCase() === "products"
          ) ||
          workbook.SheetNames.find(
            (n) => n.toLowerCase() !== "dropdowndata"
          ) ||
          workbook.SheetNames[0];

        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet) as Record<
          string,
          string
        >[];

        if (jsonData.length === 0) {
          reject(
            new Error(
              "No data found in the Excel file. Make sure headers exist and rows are filled in."
            )
          );
          return;
        }

        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read Excel file"));
    };

    reader.readAsArrayBuffer(file);
  });
}
