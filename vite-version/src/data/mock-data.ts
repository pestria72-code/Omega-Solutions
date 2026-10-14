import type {
  Customer,
  Product,
  Invoice,
  Company,
  User,
  ActivityItem,
  KPIData,
  RevenuePoint,
  CategoryBreakdown,
} from "@/lib/types";

export const DEMO_COMPANY: Company = {
  id: "comp-001",
  name: "Acacia Trading Ltd",
  registrationNumber: "CSR/2018/45291",
  vatNumber: "P051234567X",
  currency: "KES",
  email: "info@acacia.co.ke",
  phone: "+254 20 123 4567",
  address: "Westlands Road, Suite 301",
  city: "Nairobi",
  website: "www.acacia.co.ke",
  branches: [
    {
      id: "br-001",
      name: "Nairobi HQ",
      code: "NBO-HQ",
      city: "Nairobi",
      phone: "+254 20 123 4567",
      email: "nairobi@acacia.co.ke",
      status: "Active",
      manager: "James Mwangi",
    },
    {
      id: "br-002",
      name: "Mombasa Branch",
      code: "MSA-01",
      city: "Mombasa",
      phone: "+254 41 234 5678",
      email: "mombasa@acacia.co.ke",
      status: "Active",
      manager: "Aisha Hassan",
    },
    {
      id: "br-003",
      name: "Kisumu Branch",
      code: "KSM-01",
      city: "Kisumu",
      phone: "+254 57 345 6789",
      email: "kisumu@acacia.co.ke",
      status: "Inactive",
      manager: "David Otieno",
    },
  ],
};

export const DEMO_COMPANIES: Company[] = [
  DEMO_COMPANY,
  {
    id: "comp-002",
    name: "Savanna Supplies Ltd",
    registrationNumber: "CSR/2020/77812",
    vatNumber: "P059876543Y",
    currency: "KES",
    email: "info@savanna.co.ke",
    phone: "+254 20 987 6543",
    address: "Industrial Area, Plot 45",
    city: "Nairobi",
    website: "www.savanna.co.ke",
    branches: [
      {
        id: "br-101",
        name: "Industrial HQ",
        code: "IND-HQ",
        city: "Nairobi",
        phone: "+254 20 987 6543",
        email: "info@savanna.co.ke",
        status: "Active",
        manager: "Grace Wanjiku",
      },
    ],
  },
];

export const DEMO_CUSTOMERS: Customer[] = [
  { id: "cust-001", name: "Blue Sky Logistics", email: "accounts@bluesky.co.ke", phone: "+254 712 345 678", city: "Nairobi", status: "Active", outstandingBalance: 145000, totalOrders: 42, createdAt: "2024-03-15" },
  { id: "cust-002", name: "Highland Traders", email: "info@highlandtraders.co.ke", phone: "+254 722 456 789", city: "Nakuru", status: "Active", outstandingBalance: 0, totalOrders: 28, createdAt: "2024-05-02" },
  { id: "cust-003", name: "Coastal Imports Ltd", email: "sales@coastalimports.co.ke", phone: "+254 733 567 890", city: "Mombasa", status: "Active", outstandingBalance: 320000, totalOrders: 67, createdAt: "2023-11-20" },
  { id: "cust-004", name: "Rift Valley Enterprises", email: "admin@rve.co.ke", phone: "+254 745 678 901", city: "Eldoret", status: "Inactive", outstandingBalance: 85000, totalOrders: 15, createdAt: "2024-01-10" },
  { id: "cust-005", name: "Maendeleo Agencies", email: "contact@maendeleo.co.ke", phone: "+254 756 789 012", city: "Kisumu", status: "Active", outstandingBalance: 52000, totalOrders: 33, createdAt: "2024-06-18" },
  { id: "cust-006", name: "Tausi Retailers", email: "info@tausi.co.ke", phone: "+254 767 890 123", city: "Nairobi", status: "Blocked", outstandingBalance: 210000, totalOrders: 8, createdAt: "2024-02-28" },
  { id: "cust-007", name: "Bahari Distributors", email: "accounts@bahari.co.ke", phone: "+254 778 901 234", city: "Mombasa", status: "Active", outstandingBalance: 178000, totalOrders: 51, createdAt: "2023-09-14" },
  { id: "cust-008", name: "Nuru Wholesale", email: "sales@nuru.co.ke", phone: "+254 789 012 345", city: "Nakuru", status: "Active", outstandingBalance: 0, totalOrders: 19, createdAt: "2024-07-05" },
];

export const DEMO_PRODUCTS: Product[] = [
  { id: "prod-001", sku: "ELEC-001", name: "LED Tube Light 4ft", category: "Electronics", unitPrice: 850, costPrice: 520, stockQuantity: 340, reorderLevel: 100, unit: "pcs", stockStatus: "In Stock" },
  { id: "prod-002", sku: "ELEC-002", name: "Solar Panel 100W", category: "Electronics", unitPrice: 12500, costPrice: 9800, stockQuantity: 45, reorderLevel: 50, unit: "pcs", stockStatus: "Low Stock" },
  { id: "prod-003", sku: "STAT-001", name: "A4 Paper Ream 80gsm", category: "Stationery", unitPrice: 350, costPrice: 220, stockQuantity: 1200, reorderLevel: 300, unit: "reams", stockStatus: "In Stock" },
  { id: "prod-004", sku: "STAT-002", name: "Ballpoint Pens Blue (Box)", category: "Stationery", unitPrice: 1200, costPrice: 750, stockQuantity: 85, reorderLevel: 40, unit: "boxes", stockStatus: "In Stock" },
  { id: "prod-005", sku: "CLN-001", name: "Detergent 5L", category: "Cleaning", unitPrice: 680, costPrice: 420, stockQuantity: 0, reorderLevel: 60, unit: "bottles", stockStatus: "Out of Stock" },
  { id: "prod-006", sku: "CLN-002", name: "Disinfectant 1L", category: "Cleaning", unitPrice: 320, costPrice: 180, stockQuantity: 180, reorderLevel: 80, unit: "bottles", stockStatus: "In Stock" },
  { id: "prod-007", sku: "FUR-001", name: "Office Chair Ergonomic", category: "Furniture", unitPrice: 8500, costPrice: 5800, stockQuantity: 28, reorderLevel: 15, unit: "pcs", stockStatus: "In Stock" },
  { id: "prod-008", sku: "FUR-002", name: "Folding Table 6ft", category: "Furniture", unitPrice: 4500, costPrice: 3200, stockQuantity: 12, reorderLevel: 20, unit: "pcs", stockStatus: "Low Stock" },
  { id: "prod-009", sku: "ELEC-003", name: "Extension Cable 5m", category: "Electronics", unitPrice: 450, costPrice: 280, stockQuantity: 220, reorderLevel: 80, unit: "pcs", stockStatus: "In Stock" },
  { id: "prod-010", sku: "STAT-003", name: "Stapler Heavy Duty", category: "Stationery", unitPrice: 890, costPrice: 540, stockQuantity: 5, reorderLevel: 25, unit: "pcs", stockStatus: "Low Stock" },
];

export const DEMO_INVOICES: Invoice[] = [
  { id: "inv-001", invoiceNumber: "INV-2024-001", customerId: "cust-001", customerName: "Blue Sky Logistics", issueDate: "2024-10-01", dueDate: "2024-10-15", total: 145000, status: "Sent", items: 5 },
  { id: "inv-002", invoiceNumber: "INV-2024-002", customerId: "cust-003", customerName: "Coastal Imports Ltd", issueDate: "2024-09-28", dueDate: "2024-10-12", total: 320000, status: "Overdue", items: 12 },
  { id: "inv-003", invoiceNumber: "INV-2024-003", customerId: "cust-002", customerName: "Highland Traders", issueDate: "2024-09-25", dueDate: "2024-10-09", total: 87000, status: "Paid", items: 3 },
  { id: "inv-004", invoiceNumber: "INV-2024-004", customerId: "cust-005", customerName: "Maendeleo Agencies", issueDate: "2024-10-03", dueDate: "2024-10-17", total: 52000, status: "Sent", items: 7 },
  { id: "inv-005", invoiceNumber: "INV-2024-005", customerId: "cust-007", customerName: "Bahari Distributors", issueDate: "2024-10-02", dueDate: "2024-10-16", total: 178000, status: "Sent", items: 9 },
  { id: "inv-006", invoiceNumber: "INV-2024-006", customerId: "cust-001", customerName: "Blue Sky Logistics", issueDate: "2024-09-20", dueDate: "2024-10-04", total: 96000, status: "Paid", items: 4 },
  { id: "inv-007", invoiceNumber: "INV-2024-007", customerId: "cust-004", customerName: "Rift Valley Enterprises", issueDate: "2024-10-05", dueDate: "2024-10-19", total: 85000, status: "Draft", items: 2 },
  { id: "inv-008", invoiceNumber: "INV-2024-008", customerId: "cust-008", customerName: "Nuru Wholesale", issueDate: "2024-09-15", dueDate: "2024-09-29", total: 43000, status: "Paid", items: 6 },
  { id: "inv-009", invoiceNumber: "INV-2024-009", customerId: "cust-006", customerName: "Tausi Retailers", issueDate: "2024-08-28", dueDate: "2024-09-11", total: 210000, status: "Overdue", items: 11 },
  { id: "inv-010", invoiceNumber: "INV-2024-010", customerId: "cust-003", customerName: "Coastal Imports Ltd", issueDate: "2024-10-06", dueDate: "2024-10-20", total: 67000, status: "Draft", items: 3 },
];

export const DEMO_USERS: User[] = [
  { id: "user-001", name: "James Mwangi", email: "james@acacia.co.ke", role: "Owner", status: "Active", lastActive: "2024-10-10T14:30:00", branch: "Nairobi HQ" },
  { id: "user-002", name: "Aisha Hassan", email: "aisha@acacia.co.ke", role: "Admin", status: "Active", lastActive: "2024-10-10T11:20:00", branch: "Mombasa Branch" },
  { id: "user-003", name: "David Otieno", email: "david@acacia.co.ke", role: "Manager", status: "Active", lastActive: "2024-10-09T16:45:00", branch: "Kisumu Branch" },
  { id: "user-004", name: "Grace Wanjiku", email: "grace@acacia.co.ke", role: "Manager", status: "Active", lastActive: "2024-10-10T09:15:00", branch: "Nairobi HQ" },
  { id: "user-005", name: "Peter Kamau", email: "peter@acacia.co.ke", role: "Staff", status: "Active", lastActive: "2024-10-10T13:00:00", branch: "Nairobi HQ" },
  { id: "user-006", name: "Mary Atieno", email: "mary@acacia.co.ke", role: "Staff", status: "Suspended", lastActive: "2024-09-28T10:30:00", branch: "Mombasa Branch" },
  { id: "user-007", name: "Samuel Kiprop", email: "samuel@acacia.co.ke", role: "Viewer", status: "Invited", lastActive: "", branch: "Nairobi HQ" },
];

export const DEMO_KPIS: KPIData[] = [
  { label: "Total Revenue", value: 2845000, change: 12.5, trend: "up", icon: "revenue" },
  { label: "Outstanding Invoices", value: 890000, change: -8.2, trend: "down", icon: "invoices" },
  { label: "Operating Expenses", value: 1320000, change: 5.3, trend: "up", icon: "expenses" },
  { label: "Net Profit", value: 1525000, change: 18.7, trend: "up", icon: "profit" },
];

export const DEMO_REVENUE_DATA: RevenuePoint[] = [
  { month: "May", revenue: 2100000, expenses: 980000 },
  { month: "Jun", revenue: 2350000, expenses: 1050000 },
  { month: "Jul", revenue: 1980000, expenses: 920000 },
  { month: "Aug", revenue: 2650000, expenses: 1180000 },
  { month: "Sep", revenue: 2780000, expenses: 1250000 },
  { month: "Oct", revenue: 2845000, expenses: 1320000 },
];

export const DEMO_CATEGORY_BREAKDOWN: CategoryBreakdown[] = [
  { name: "Electronics", value: 1120000, color: "var(--chart-1)" },
  { name: "Stationery", value: 680000, color: "var(--chart-2)" },
  { name: "Furniture", value: 540000, color: "var(--chart-3)" },
  { name: "Cleaning", value: 505000, color: "var(--chart-4)" },
];

export const DEMO_ACTIVITIES: ActivityItem[] = [
  { id: "act-001", type: "invoice", description: "Invoice INV-2024-010 created for Coastal Imports Ltd", amount: 67000, timestamp: "2024-10-06T15:30:00", user: "Peter Kamau" },
  { id: "act-002", type: "payment", description: "Payment received from Highland Traders", amount: 87000, timestamp: "2024-10-05T10:15:00", user: "Grace Wanjiku" },
  { id: "act-003", type: "customer", description: "New customer Nuru Wholesale added", timestamp: "2024-10-04T14:20:00", user: "Aisha Hassan" },
  { id: "act-004", type: "product", description: "Stock updated for Solar Panel 100W", timestamp: "2024-10-03T09:00:00", user: "Peter Kamau" },
  { id: "act-005", type: "expense", description: "Office rent expense recorded", amount: 120000, timestamp: "2024-10-02T16:45:00", user: "Grace Wanjiku" },
  { id: "act-006", type: "order", description: "Sales order SO-2024-045 fulfilled for Blue Sky Logistics", amount: 145000, timestamp: "2024-10-01T11:30:00", user: "James Mwangi" },
];

export const DEMO_NOTIFICATIONS = [
  { id: "ntf-001", title: "Invoice Overdue", message: "INV-2024-002 for Coastal Imports Ltd is 4 days overdue", time: "2h ago", read: false },
  { id: "ntf-002", title: "Low Stock Alert", message: "Solar Panel 100W is below reorder level (45 units)", time: "5h ago", read: false },
  { id: "ntf-003", title: "Out of Stock", message: "Detergent 5L is completely out of stock", time: "1d ago", read: false },
  { id: "ntf-004", title: "Payment Received", message: "KSh 87,000 received from Highland Traders", time: "1d ago", read: true },
  { id: "ntf-005", title: "New User Invited", message: "Samuel Kiprop has been invited as Viewer", time: "3d ago", read: true },
];

export const DEMO_USER = {
  name: "James Mwangi",
  email: "james@acacia.co.ke",
  role: "Owner" as const,
  company: "Acacia Trading Ltd",
};
