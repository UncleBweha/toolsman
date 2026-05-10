const fs = require('fs');
const path = require('path');

const files = [
  "src/pages/Search.tsx",
  "src/pages/Products.tsx",
  "src/pages/Product.tsx",
  "src/pages/Checkout.tsx",
  "src/pages/Category.tsx",
  "src/pages/Cart.tsx",
  "src/pages/Account.tsx",
  "src/components/home/ProductCard.tsx",
  "src/components/admin/AdminDashboard.tsx",
  "src/components/admin/ProductManagement.tsx",
  "src/components/admin/OrderManagement.tsx"
];

for (const file of files) {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    content = content.replace(/return new Intl\.NumberFormat\([\s\S]*?\}\)\.format\((.*?)\);/g, "return `Kshs ${Number($1).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;");
    
    fs.writeFileSync(fullPath, content);
  }
}
