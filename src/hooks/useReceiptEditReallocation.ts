import { useCallback } from "react";

import { useReceiptEditAvailabilityMutation } from "@/hooks/queries/receiptQueries";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { enterReceiptReallocationMode } from "@/store/receiptEditSlice";

export function useReceiptEditReallocation(companyId: string) {
  const dispatch = useAppDispatch();
  const edit = useAppSelector((state) => state.receiptEdit);
  const availabilityMutation = useReceiptEditAvailabilityMutation();
  const { isPending, mutateAsync } = availabilityMutation;

  const loadLatestAvailability = useCallback(async () => {
    if (!edit.receiptId) {
      throw new Error("Receipt ID is missing");
    }

    const availability = await mutateAsync({
      receiptId: edit.receiptId,
      companyId,
    });
    if (
      availability.receipt_id !== edit.receiptId ||
      availability.party_id !== edit.partyId
    ) {
      throw new Error("Receipt allocation data did not match this Receipt");
    }

    // Both amount changes and allocation resets use this one transition so
    // expected_updated_at and the initial selections can never diverge.
    dispatch(enterReceiptReallocationMode(availability));
    return availability;
  }, [
    companyId,
    dispatch,
    edit.partyId,
    edit.receiptId,
    mutateAsync,
  ]);

  return {
    isLoading: isPending,
    loadLatestAvailability,
  };
}
