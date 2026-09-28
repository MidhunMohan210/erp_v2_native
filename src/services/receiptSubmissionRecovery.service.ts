import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  CreateReceiptRequest,
  ReceiptSubmissionRecovery,
  ReceiptSubmissionRecoveryState,
} from "../types/receipt";
import {
  areReceiptRecoveryPayloadsEqual,
  getReceiptRecoveryStorageKey,
  parseReceiptSubmissionRecovery,
} from "../utils/receiptRecovery";

type SaveReceiptRecoveryInput = {
  userId: string;
  companyId: string;
  seriesName: string;
  payload: CreateReceiptRequest;
  state: ReceiptSubmissionRecoveryState;
};

export const receiptSubmissionRecoveryService = {
  async load(
    userId: string,
    companyId: string,
  ): Promise<ReceiptSubmissionRecovery | null> {
    const key = getReceiptRecoveryStorageKey(userId, companyId);
    const storedValue = await AsyncStorage.getItem(key);
    return parseReceiptSubmissionRecovery(storedValue, userId, companyId);
  },

  async save({
    userId,
    companyId,
    seriesName,
    payload,
    state,
  }: SaveReceiptRecoveryInput): Promise<void> {
    const key = getReceiptRecoveryStorageKey(userId, companyId);
    const storedValue = await AsyncStorage.getItem(key);
    const existingRecovery = parseReceiptSubmissionRecovery(
      storedValue,
      userId,
      companyId,
    );
    if (
      existingRecovery &&
      !areReceiptRecoveryPayloadsEqual(existingRecovery.payload, payload)
    ) {
      // Never replace an unresolved logical Receipt with a different body.
      throw new Error("A different Receipt submission is already recoverable");
    }

    const recovery: ReceiptSubmissionRecovery = {
      version: 1,
      userId,
      companyId,
      seriesName,
      payload,
      state,
      savedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(recovery));
  },

  async clear(userId: string, companyId: string): Promise<void> {
    const key = getReceiptRecoveryStorageKey(userId, companyId);
    await AsyncStorage.removeItem(key);
  },
};
