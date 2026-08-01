import type { User as AppUser } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      // Populated by requireAuth once the Supabase access token has been
      // verified and mapped to a row in our own `users` table.
      appUser?: AppUser;
    }
  }
}

export {};
