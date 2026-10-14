export type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue" | "Cancelled";
export type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";
export type CustomerStatus = "Active" | "Inactive" | "Blocked";
export type BranchStatus = "Active" | "Inactive";
export type UserRole = "Owner" | "Admin" | "Manager" | "Staff" | "Viewer";
export type UserStatus = "Active" | "Suspended" | "Invited";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  status: CustomerStatus;
  outstandingBalance: number;
  totalOrders: number;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unitPrice: number;
  costPrice: number;
  stockQuantity: number;
  reorderLevel: number;
  unit: string;
  stockStatus: StockStatus;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  total: number;
  status: InvoiceStatus;
  items: number;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  city: string;
  phone: string;
  email: string;
  status: BranchStatus;
  manager: string;
}

export interface Company {
  id: string;
  name: string;
  registrationNumber: string;
  vatNumber: string;
  currency: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  website: string;
  branches: Branch[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastActive: string;
  branch: string;
}

export interface ActivityItem {
  id: string;
  type: "invoice" | "payment" | "customer" | "product" | "expense" | "order";
  description: string;
  amount?: number;
  timestamp: string;
  user: string;
}

export interface KPIData {
  label: string;
  value: number;
  change: number;
  trend: "up" | "down" | "neutral";
  icon: "revenue" | "invoices" | "expenses" | "profit";
}

export interface RevenuePoint {
  month: string;
  revenue: number;
  expenses: number;
}

export interface CategoryBreakdown {
  name: string;
  value: number;
  color: string;
}
