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
 * Sanitizes a category name to be used as an Excel named range
 * Removes spaces, special characters that are invalid in named ranges
 */
function sanitizeNamedRangeName(name: string): string {
  return name
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/[^a-zA-Z0-9_]/g, "") // Remove special characters
    .substring(0, 31); // Excel named range limit
}

/**
 * Creates a hidden sheet with dropdown data
 * Structure: Column A = Categories, Columns B+ = Subcategories for each category
 */
function createDropdownDataSheet(
  categories: CategoryWithSubcategories[]
): XLSX.WorkSheet {
  const dropdownData: any[][] = [];
  const headers = ["Category", ...categories.map((c) => sanitizeNamedRangeName(c.name))];

  // Find max subcategories to determine row count
  const maxSubcategories = Math.max(
    ...categories.map((c) => c.subcategories.length),
    1
  );

  // Create rows with categories and their subcategories
  for (let i = 0; i < maxSubcategories; i++) {
    const row: any[] = [];

    // First column: category names (only in first row per category)
    if (i === 0) {
      row.push(categories.map((c) => c.name).join("\n")); // Placeholder, will be overwritten
    } else {
      row.push("");
    }

    // Subsequent columns: subcategories for each category
    for (const category of categories) {
      const subcategory = category.subcategories[i];
      row.push(subcategory ? subcategory.name : "");
    }

    dropdownData.push(row);
  }

  // Create the actual structure: one column per category with its subcategories
  const sheet: any = {};
  let colIndex = 0;

  // Column A: All category names (for category dropdown)
  const categoryNames = categories.map((c) => c.name);
  categoryNames.forEach((name, idx) => {
    const cellRef = XLSX.utils.encode_cell({ r: idx, c: 0 });
    sheet[cellRef] = { t: "s", v: name };
  });

  // Columns B+: Subcategories for each category
  categories.forEach((category, catIndex) => {
    const colIdx = catIndex + 1;
    category.subcategories.forEach((subcategory, subIdx) => {
      const cellRef = XLSX.utils.encode_cell({ r: subIdx, c: colIdx });
      sheet[cellRef] = { t: "s", v: subcategory.name };
    });
  });

  // Set worksheet dimensions
  sheet["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: {
      r: maxSubcategories - 1,
      c: categories.length,
    },
  });

  return sheet;
}

/**
 * Generates a product import template with dependent category/subcategory dropdowns
 */
export async function generateProductImportTemplate(
  categories: CategoryWithSubcategories[]
): Promise<void> {
  // Create main products sheet with sample data
  const template = [
    {
      name: "Example Product",
      description: "Product description here",
      price: "9999",
      original_price: "12999",
      sku: "SKU-001",
      stock_quantity: "100",
      category: categories.length > 0 ? categories[0].name : "Select Category",
      sub_category:
        categories.length > 0 && categories[0].subcategories.length > 0
          ? categories[0].subcategories[0].name
          : "Select Sub Category",
      brand: "Brand Name",
      tags: "tag1, tag2, tag3",
      key_features: "Feature 1, Feature 2",
      image_url: "https://example.com/image.jpg",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(template);
  const wb = XLSX.utils.book_new();

  // Create hidden dropdown data sheet
  const dropdownSheet = createDropdownDataSheet(categories);
  XLSX.utils.book_append_sheet(wb, dropdownSheet, "DropdownData");

  // Move products sheet to front
  XLSX.utils.book_append_sheet(wb, ws, "Products");
  wb.SheetNames = ["Products", "DropdownData"];

  // Create named ranges for categories and subcategories
  if (!wb.Workbook) {
    wb.Workbook = { Names: [] };
  }
  if (!wb.Workbook.Names) {
    wb.Workbook.Names = [];
  }

  // Named range for all categories
  const categoryRange = `DropdownData!$A$1:$A$${categories.length}`;
  wb.Workbook.Names.push({
    Name: "Categories",
    Ref: categoryRange,
    SheetName: "DropdownData",
  });

  // Named ranges for each category's subcategories
  categories.forEach((category, idx) => {
    const sanitizedName = sanitizeNamedRangeName(category.name);
    const colLetter = String.fromCharCode(66 + idx); // B, C, D, etc.
    const subRange = `DropdownData!$${colLetter}$1:$${colLetter}$${category.subcategories.length}`;

    wb.Workbook.Names.push({
      Name: sanitizedName,
      Ref: subRange,
      SheetName: "DropdownData",
    });
  });

  // Apply data validation for category column (starting from row 2)
  // Columns: A=name, B=description, C=price, D=original_price, E=sku, F=stock_quantity, G=category, H=sub_category
  const startRow = 2;
  const endRow = 5001; // Support up to 5000 data rows

  // Apply category validation to column G (Category)
  if (!ws["!dataValidations"]) {
    ws["!dataValidations"] = [];
  }

  ws["!dataValidations"].push({
    type: "list",
    formula1: "Categories",
    sqref: `G${startRow}:G${endRow}`,
    showInputMessage: true,
    prompt: "Select a category from the dropdown",
  });

  // Apply subcategory validation with INDIRECT formula to column H (Sub Category)
  // This creates dependent dropdowns
  // For each row, the formula references the category cell in the same row
  ws["!dataValidations"].push({
    type: "list",
    formula1: `INDIRECT(SUBSTITUTE(G2," ","_"))`,
    sqref: `H${startRow}:H${endRow}`,
    showInputMessage: true,
    prompt: "Subcategory will update based on category selection",
    showDropDown: true,
  });

  // Format header row: freeze panes and bold
  const headerRow = ws["A1"];
  if (!ws["!freeze"]) {
    ws["!freeze"] = { xSplit: 0, ySplit: 1 }; // Freeze first row
  }

  // Set column widths for better readability
  ws["!cols"] = [
    { wch: 25 }, // name
    { wch: 40 }, // description
    { wch: 12 }, // price
    { wch: 15 }, // original_price
    { wch: 12 }, // sku
    { wch: 15 }, // stock_quantity
    { wch: 20 }, // category
    { wch: 20 }, // sub_category
    { wch: 15 }, // brand
    { wch: 25 }, // tags
    { wch: 25 }, // key_features
    { wch: 30 }, // image_url
  ];

  // Hide the DropdownData sheet
  const dropdownSheetIdx = wb.SheetNames.indexOf("DropdownData");
  if (dropdownSheetIdx !== -1) {
    if (!wb.Workbook.Sheets) {
      wb.Workbook.Sheets = [];
    }
    if (!wb.Workbook.Sheets[dropdownSheetIdx]) {
      wb.Workbook.Sheets[dropdownSheetIdx] = {};
    }
    wb.Workbook.Sheets[dropdownSheetIdx].Hidden = true;
  }

  // Write file
  XLSX.writeFile(wb, "product_import_template.xlsx");
}

/**
 * Parses imported Excel file and handles both old and new formats
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

        // Find the Products sheet, or use the first sheet
        const sheetName =
          workbook.SheetNames.find((name) => name.toLowerCase() === "products") ||
          workbook.SheetNames[0];

        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet) as Record<
          string,
          string
        >[];

        if (jsonData.length === 0) {
          reject(
            new Error("No data found in the Excel file. Make sure headers exist.")
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
