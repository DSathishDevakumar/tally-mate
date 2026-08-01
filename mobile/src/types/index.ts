export type Role = "SUPER_ADMIN" | "SHOP_OWNER" | "CUSTOMER";

export interface AppUser {
  id: string;
  supabaseUserId: string;
  shopId: string | null;
  role: Role;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  shopId: string;
  userId: string | null;
  name: string;
  phone: string | null;
  address: string | null;
  creditLimit: string | null;
  openingBalance: string;
  runningBalance: number;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerInput {
  name: string;
  phone?: string;
  address?: string;
  creditLimit?: number;
  openingBalance?: number;
  notes?: string;
  isActive?: boolean;
}

export type EntrySource = "MANUAL" | "VOICE" | "PHOTO";

export interface LedgerEntry {
  id: string;
  shopId: string;
  customerId: string;
  productId: string | null;
  quantity: string | null;
  unitPrice: string | null;
  totalAmount: string;
  entryDate: string;
  source: EntrySource;
  note: string | null;
  rawVoiceText: string | null;
  sourcePhotoUrl: string | null;
  aiConfidence: string | null;
  isConfirmed: boolean;
  billId: string | null;
  recordedByUserId: string;
  createdAt: string;
  updatedAt: string;
  customer: { id: string; name: string };
}

export interface EntryInput {
  customerId: string;
  amount: number;
  note?: string;
  entryDate?: string;
}
