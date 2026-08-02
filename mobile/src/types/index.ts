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
  customerNameNative: string | null;
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
  source?: EntrySource;
  rawVoiceText?: string;
  customerNameNative?: string;
  aiConfidence?: number;
}

export interface CustomerMatch {
  id: string;
  name: string;
  score: number;
}

export interface VoiceDraft {
  transcript: string;
  extractedCustomerName: string | null;
  extractedCustomerNameNative: string | null;
  amount: number | null;
  note: string | null;
  confidence: number;
  matchedCustomer: CustomerMatch | null;
  suggestedCustomers: CustomerMatch[];
}

export interface PhotoDraftRow {
  extractedCustomerName: string | null;
  extractedCustomerNameNative: string | null;
  amount: number | null;
  note: string | null;
  confidence: number;
  matchedCustomer: CustomerMatch | null;
  suggestedCustomers: CustomerMatch[];
}

export interface BulkEntryInput {
  customerId: string;
  amount: number;
  note?: string;
  source?: EntrySource;
  customerNameNative?: string;
  aiConfidence?: number;
}

export interface CustomerReportSummary {
  id: string;
  name: string;
  phone: string | null;
  isActive: boolean;
  runningBalance: number;
}

export type ReportEntry = Omit<LedgerEntry, "customer">;

export interface CustomerStatement {
  customer: {
    id: string;
    name: string;
    phone: string | null;
    isActive: boolean;
    openingBalance: string;
    runningBalance: number;
  };
  summary: {
    totalCredit: number;
    entryCount: number;
    dateRange: { from: string; to: string } | null;
    unbilledTotal: number;
    outstandingBillTotal: number;
    unappliedPaymentsTotal: number;
  };
  entries: ReportEntry[];
}

export interface Payment {
  id: string;
  shopId: string;
  customerId: string;
  billId: string | null;
  amount: string;
  paymentMethod: string;
  paymentDate: string;
  notes: string | null;
  recordedByUserId: string;
  createdAt: string;
}

export interface PaymentInput {
  customerId: string;
  amount: number;
  paymentMethod?: string;
  paymentDate?: string;
  notes?: string;
}
