import { init } from "@instantdb/admin";
import schema from "@/instant.schema";

let adminDb: ReturnType<typeof init> | null = null;

export function getAdminDb() {
  if (!adminDb) {
    adminDb = init({
      appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID!,
      adminToken: process.env.INSTANT_ADMIN_TOKEN!,
      schema,
    });
  }
  return adminDb;
}
