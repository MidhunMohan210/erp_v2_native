import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import * as SecureStore from "expo-secure-store";

import type { AppThunk } from "@/store";
import { clearReceiptDraft } from "@/store/receiptDraftSlice";
import { resetVoucherDraft } from "@/store/voucherDraftSlice";
import { resetSaleDraft } from "@/store/saleDraftSlice";
import type { CompanySummary } from "@/types/company";

export const SELECTED_COMPANY_KEY = "selectedCompany";

// Sale tax mode compares this field with the selected Party's state. Keeping
// it required in Redux prevents a missing field from defaulting every Sale to
// IGST after company selection or app rehydration.
type SelectedCompany = CompanySummary & {
  state: string;
};

type CompanyState = {
  selectedCompany: SelectedCompany | null;
  isLoading: boolean;
};

const initialState: CompanyState = {
  selectedCompany: null,
  isLoading: true,
};

function normalizeSelectedCompany(company: CompanySummary): SelectedCompany {
  return {
    ...company,
    state: company.state ?? "",
  };
}

const companySlice = createSlice({
  name: "company",
  initialState,
  reducers: {
    setSelectedCompany: (state, action: PayloadAction<CompanySummary>) => {
      state.selectedCompany = normalizeSelectedCompany(action.payload);
      state.isLoading = false;
    },
    clearSelectedCompany: (state) => {
      state.selectedCompany = null;
      // A Redux-only reset must reload the company from persistent storage.
      state.isLoading = true;
    },
    finishCompanyHydration: (state) => {
      state.isLoading = false;
    },
  },
});

export const {
  clearSelectedCompany,
  finishCompanyHydration,
  setSelectedCompany,
} = companySlice.actions;

export const persistSelectedCompany =
  (company: CompanySummary): AppThunk =>
  async (dispatch, getState) => {
    const selectedCompany = normalizeSelectedCompany(company);
    const previousCompanyId = getState().company.selectedCompany?._id;

    await SecureStore.setItemAsync(
      SELECTED_COMPANY_KEY,
      JSON.stringify(selectedCompany),
    );

    if (previousCompanyId && previousCompanyId !== selectedCompany._id) {
      dispatch(clearReceiptDraft());
    }

    dispatch(setSelectedCompany(selectedCompany));
  };

export const rehydrateSelectedCompany = (): AppThunk => async (dispatch) => {
  try {
    const companyStr =
      await SecureStore.getItemAsync(SELECTED_COMPANY_KEY);

    if (companyStr) {
      dispatch(setSelectedCompany(JSON.parse(companyStr) as CompanySummary));
    }
  } catch (error) {
    console.error("Failed to restore the selected company.", error);
  } finally {
    dispatch(finishCompanyHydration());
  }
};

export const clearPersistedSelectedCompany = (): AppThunk => async (dispatch) => {
  await SecureStore.deleteItemAsync(SELECTED_COMPANY_KEY);
  dispatch(clearSelectedCompany());
  dispatch(clearReceiptDraft());
  dispatch(resetVoucherDraft());
  dispatch(resetSaleDraft());
};

export default companySlice.reducer;
