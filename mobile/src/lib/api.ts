import { File, UploadType } from "expo-file-system";
import { supabase } from "./supabase";
import type {
  AppUser,
  BulkEntryInput,
  Customer,
  CustomerInput,
  CustomerReportSummary,
  CustomerStatement,
  EntryInput,
  LedgerEntry,
  PhotoDraftRow,
  VoiceDraft,
} from "../types";

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error("Missing EXPO_PUBLIC_API_URL. Copy .env.example to .env and set your backend URL.");
}

async function authedFetch(path: string, init?: RequestInit) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Not signed in");
  }

  const res = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request to ${path} failed with ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

/** Provisions (or fetches) the app-side user row right after Supabase sign-in. */
export async function syncUser(): Promise<AppUser> {
  const { user } = await authedFetch("/api/auth/sync", { method: "POST" });
  return user;
}

/** Fetches the signed-in app-side user, e.g. on app relaunch with an existing session. */
export async function getMe(): Promise<AppUser> {
  const { user } = await authedFetch("/api/auth/me");
  return user;
}

export async function listCustomers(): Promise<Customer[]> {
  const { customers } = await authedFetch("/api/customers");
  return customers;
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  const { customer } = await authedFetch("/api/customers", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return customer;
}

export async function getCustomer(id: string): Promise<Customer> {
  const { customer } = await authedFetch(`/api/customers/${id}`);
  return customer;
}

export async function updateCustomer(id: string, input: Partial<CustomerInput>): Promise<Customer> {
  const { customer } = await authedFetch(`/api/customers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return customer;
}

/** Lists entries for a given day (defaults to today). `date` is a "YYYY-MM-DD" string. */
export async function listEntries(date?: string): Promise<LedgerEntry[]> {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  const { entries } = await authedFetch(`/api/entries${query}`);
  return entries;
}

export async function createEntry(input: EntryInput): Promise<LedgerEntry> {
  const { entry } = await authedFetch("/api/entries", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return entry;
}

export async function updateEntry(
  id: string,
  input: Partial<Pick<EntryInput, "amount" | "note">>
): Promise<LedgerEntry> {
  const { entry } = await authedFetch(`/api/entries/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return entry;
}

export async function deleteEntry(id: string): Promise<void> {
  await authedFetch(`/api/entries/${id}`, { method: "DELETE" });
}

// expo-file-system's native multipart upload, not fetch+FormData: React Native's classic
// { uri, name, type } FormData part shape isn't recognized by RN 0.86's networking layer
// ("Unsupported FormDataPart implementation"), and File.upload() avoids that entirely.
async function uploadFile(path: string, fieldName: string, fileUri: string, mimeType: string): Promise<unknown> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Not signed in");
  }

  const file = new File(fileUri);
  const result = await file.upload(`${apiUrl}${path}`, {
    httpMethod: "POST",
    uploadType: UploadType.MULTIPART,
    fieldName,
    mimeType,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (result.status < 200 || result.status >= 300) {
    let message = `Request to ${path} failed with ${result.status}`;
    try {
      message = JSON.parse(result.body).error ?? message;
    } catch {
      // response body wasn't JSON; fall back to the generic message
    }
    throw new Error(message);
  }

  return JSON.parse(result.body);
}

/** Uploads a recorded voice note and returns an unsaved AI-extracted draft for human review. */
export async function draftVoiceEntry(fileUri: string, mimeType: string): Promise<VoiceDraft> {
  const { draft } = (await uploadFile("/api/entries/voice", "audio", fileUri, mimeType)) as { draft: VoiceDraft };
  return draft;
}

/** Uploads a notebook photo and returns unsaved AI-extracted draft rows, one per customer line found. */
export async function draftPhotoEntries(fileUri: string, mimeType: string): Promise<PhotoDraftRow[]> {
  const { rows } = (await uploadFile("/api/entries/photo", "photo", fileUri, mimeType)) as { rows: PhotoDraftRow[] };
  return rows;
}

/** Creates multiple customers in one request — used after a photo scan finds unrecognized names. */
export async function createCustomersBulk(customers: { name: string; phone?: string }[]): Promise<Customer[]> {
  const { customers: created } = await authedFetch("/api/customers/bulk", {
    method: "POST",
    body: JSON.stringify({ customers }),
  });
  return created;
}

/** Creates multiple entries in one request — used to save all rows from a photo scan at once. */
export async function createEntriesBulk(entries: BulkEntryInput[]): Promise<LedgerEntry[]> {
  const { entries: created } = await authedFetch("/api/entries/bulk", {
    method: "POST",
    body: JSON.stringify({ entries }),
  });
  return created;
}

/** Customers ranked by running balance (highest first), for the Reports list. */
export async function listCustomerReports(): Promise<CustomerReportSummary[]> {
  const { customers } = await authedFetch("/api/reports/customers");
  return customers;
}

/** A single customer's full ledger history plus balance/summary totals. */
export async function getCustomerStatement(id: string): Promise<CustomerStatement> {
  return authedFetch(`/api/reports/customers/${id}`);
}
