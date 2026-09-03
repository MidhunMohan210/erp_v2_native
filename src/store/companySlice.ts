import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import * as SecureStore from "expo-secure-store";

import type { AppThunk } from "@/store";
import { resetVoucherDraft } from "@/store/voucherDraftSlice";
import { resetSaleDraft } from "@/store/saleDraftSlice";
import { CompanySummary } from "@/types/company";

export const SELECTED_COMPANY_KEY = "selectedCompany";

type CompanyState = {
  selectedCompany: CompanySummary | null;
  isLoading: boolean;
};

const initialState: CompanyState = {
  selectedCompany: null,
  isLoading: true,
};

const companySlice = createSlice({
  name: "company",
  initialState,
  reducers: {
    setSelectedCompany: (state, action: PayloadAction<CompanySummary>) => {
      state.selectedCompany = action.payload;
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
  async (dispatch) => {
    await SecureStore.setItemAsync(
      SELECTED_COMPANY_KEY,
      JSON.stringify(company),
    );
    dispatch(setSelectedCompany(company));
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
  dispatch(resetVoucherDraft());
  dispatch(resetSaleDraft());
};

export default companySlice.reducer;
