import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import * as SecureStore from "expo-secure-store";

import type { AppThunk } from "@/store";
import { resetVoucherDraft } from "@/store/voucherDraftSlice";
import { CompanySummary } from "@/types/company";

const SELECTED_COMPANY_KEY = "selectedCompany";


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
      state.isLoading = false;
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
    await SecureStore.setItemAsync(SELECTED_COMPANY_KEY, JSON.stringify(company));
    dispatch(setSelectedCompany(company));
  };

export const rehydrateSelectedCompany = (): AppThunk => async (dispatch) => {
  const companyStr = await SecureStore.getItemAsync(SELECTED_COMPANY_KEY);

  if (companyStr) {
    dispatch(setSelectedCompany(JSON.parse(companyStr) as CompanySummary));
    return;
  }

  dispatch(finishCompanyHydration());
};

export const clearPersistedSelectedCompany = (): AppThunk => async (dispatch) => {
  await SecureStore.deleteItemAsync(SELECTED_COMPANY_KEY);
  dispatch(clearSelectedCompany());
  dispatch(resetVoucherDraft());
};

export default companySlice.reducer;
