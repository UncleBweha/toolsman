import ExcelJS from "exceljs";

export interface SubSubCategory {
  id: string;
  name: string;
  parent_id: string;
}

export interface SubcategoryWithChildren {
  id: string;
  name: string;
  parent_id: string;
  children?: SubSubCategory[];
}

export interface CategoryWithSubcategories {
  id: string;
  name: string;
  parent_id: string | null;
  subcategories: SubcategoryWithChildren[];
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
 * Category → Sub-category → Sub-sub-category dropdowns.
 *
 * Layout of the hidden "DropdownData" sheet:
 *   Row 1, columns B…  = parent category name (header for each column of subs)
 *   Rows 2…            = subcategories under each parent
 *   A separate "SubSubData" sheet holds sub-subcategory lists keyed by subcategory name.
 */
export async function generateProductImportTemplate(
  categories: CategoryWithSubcategories[]
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Toolsman Admin";
  workbook.created = new Date();

  // ── 1. Hidden DropdownData sheet (parent → subcategory) ──────────────────
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

  const lastCatCol = colIndexToLetter(categories.length);
  const headerRange = `DropdownData!$B$1:$${lastCatCol}$1`;
  const subGridRows = Math.max(1, maxSubs);

  // ── 2. Hidden SubSubData sheet (subcategory → sub-subcategory) ───────────
  const ssSheet = workbook.addWorksheet("SubSubData", { state: "veryHidden" });

  // Collect all subcategories that have children
  const allSubcats = categories.flatMap(c => c.subcategories);
  const maxSubSubs = Math.max(0, ...allSubcats.map(s => (s.children || []).length));

  // Column A = list of all subcategory names (rows 2..N+1) — used for MATCH
  allSubcats.forEach((sub, i) => {
    ssSheet.getCell(i + 2, 1).value = sub.name;
  });
  // Columns B+ = one per subcategory. Row 1 = subcategory name header.
  allSubcats.forEach((sub, subIdx) => {
    const col = subIdx + 2;
    ssSheet.getCell(1, col).value = sub.name;
    (sub.children || []).forEach((child, childIdx) => {
      ssSheet.getCell(childIdx + 2, col).value = child.name;
    });
  });

  const lastSubCol = colIndexToLetter(allSubcats.length);
  const subHeaderRange = `SubSubData!$B$1:$${lastSubCol}$1`;
  const subSubGridRows = Math.max(1, maxSubSubs);

  // ── 3. Products sheet ─────────────────────────────────────────────────────
  const ws = workbook.addWorksheet("Products");
  ws.columns = [
    { header: "name",           key: "name",           width: 25 },
    { header: "description",    key: "description",    width: 40 },
    { header: "price",          key: "price",          width: 12 },
    { header: "original_price", key: "original_price", width: 15 },
    { header: "sku",            key: "sku",            width: 15 },
    { header: "category",       key: "category",       width: 24 }, // col F
    { header: "sub_category",   key: "sub_category",   width: 24 }, // col G
    { header: "sub_sub_category", key: "sub_sub_category", width: 24 }, // col H
    { header: "brand",          key: "brand",          width: 15 },
    { header: "tags",           key: "tags",           width: 25 },
    { header: "key_features",   key: "key_features",   width: 30 },
    { header: "image_url",      key: "image_url",      width: 35 },
    { header: "image_url_2",    key: "image_url_2",    width: 35 },
    { header: "image_url_3",    key: "image_url_3",    width: 35 },
    { header: "image_url_4",    key: "image_url_4",    width: 35 },
    { header: "image_url_5",    key: "image_url_5",    width: 35 },
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
    sub_sub_category: categories[0]?.subcategories[0]?.children?.[0]?.name ?? "",
    brand: "Brand Name",
    tags: "tag1, tag2, tag3",
    key_features: "20V Battery, Variable Speed, Safety Guard",
    image_url: "https://example.com/image1.jpg",
  });

  ws.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];

  const DATA_ROWS = 2001;
  for (let row = 2; row <= DATA_ROWS; row++) {
    // Parent category dropdown (col F = 6)
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

    // Dependent sub-category dropdown (col G = 7)
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

    // Dependent sub-sub-category dropdown (col H = 8)
    if (allSubcats.length > 0) {
      const subSubFormula =
        `OFFSET(SubSubData!$A$2,0,MATCH(G${row},${subHeaderRange},0),${subSubGridRows},1)`;
      ws.getCell(row, 8).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [subSubFormula],
        showInputMessage: true,
        promptTitle: "Sub-sub-category",
        prompt: "Filters based on the sub-category you picked",
        showErrorMessage: false,
      };
    }
  }

  // ── 4. Download ───────────────────────────────────────────────────────────
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
 * Parses an uploaded Excel/CSV file using ExcelJS.
 * Prefers the "Products" sheet; skips the "DropdownData" and "SubSubData" helper sheets.
 * Forces SKU column to string to prevent numeric corruption.
 */
export function parseExcelFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data || !(data instanceof ArrayBuffer)) {
          reject(new Error("Failed to read file data"));
          return;
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(data);

        if (!workbook.worksheets.length) {
          reject(new Error("No sheets found in the Excel file"));
          return;
        }

        // Prefer sheet named "Products"; fallback to first sheet that isn't helper sheets
        const helperSheets = new Set(["dropdowndata", "subsubdata"]);
        const sheet =
          workbook.getWorksheet("Products") ??
          workbook.worksheets.find(
            (ws) => !helperSheets.has(ws.name.toLowerCase())
          ) ??
          workbook.worksheets[0];

        if (!sheet) {
          reject(new Error("No usable sheet found"));
          return;
        }

        // Row 1 = headers
        const headers: Record<number, string> = {};
        const headerRow = sheet.getRow(1);
        headerRow.eachCell((cell, colNumber) => {
          const val = cell.value;
          if (val != null && String(val).trim() !== "") {
            headers[colNumber] = String(val).trim().toLowerCase();
          }
        });

        if (Object.keys(headers).length === 0) {
          reject(new Error("No headers found in row 1"));
          return;
        }

        // Determine which column numbers correspond to SKU (to force string)
        const skuColNums = new Set(
          Object.entries(headers)
            .filter(([, h]) => h === "sku")
            .map(([n]) => Number(n))
        );

        const rows: Record<string, string>[] = [];
        sheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // skip header row
          const obj: Record<string, string> = {};
          row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
            const header = headers[colNumber];
            if (header) {
              let val = cell.value;

              // Force SKU columns to string — prevents Excel treating "001" as 1
              if (skuColNums.has(colNumber)) {
                // Use raw text value if available (preserves leading zeros)
                const rawText = cell.text || String(val ?? "");
                obj[header] = rawText.trim();
                return;
              }

              // Normalize cell value: handle Date objects, rich text, formulas, hyperlinks
              if (val && typeof val === "object" && "richText" in (val as object)) {
                val = (val as { richText: { text: string }[] }).richText
                  .map((r) => r.text)
                  .join("");
              } else if (val instanceof Date) {
                val = val.toISOString();
              } else if (val && typeof val === "object" && "result" in (val as object)) {
                val = String((val as { result: unknown }).result ?? "");
              } else if (val && typeof val === "object" && "hyperlink" in (val as object)) {
                const hv = val as { hyperlink?: string; text?: string; target?: string };
                val = hv.hyperlink || hv.target || hv.text || "";
              } else if (val && typeof val === "object" && "text" in (val as object)) {
                val = String((val as { text: unknown }).text ?? "");
              }

              // Strip zero-width / non-breaking spaces from all string values
              obj[header] = String(val ?? "")
                .replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, " ")
                .trim();
            }
          });
          if (Object.keys(obj).length > 0) rows.push(obj);
        });

        if (rows.length === 0) {
          reject(
            new Error(
              "No data rows found. Make sure the headers row is intact and at least one product row is filled."
            )
          );
          return;
        }

        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read Excel file"));
    reader.readAsArrayBuffer(file);
  });
}
