import { supabase } from "./supabase";
import type { AppUser, Customer, CustomerInput, EntryInput, LedgerEntry } from "../types";

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
