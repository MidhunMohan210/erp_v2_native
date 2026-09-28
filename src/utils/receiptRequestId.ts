import * as Crypto from "expo-crypto";

// UUID creation stays outside Redux reducers so every reducer remains pure.
export function createReceiptRequestId(): string {
  return Crypto.randomUUID();
}
