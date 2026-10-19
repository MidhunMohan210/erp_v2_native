import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import * as SecureStore from "expo-secure-store";

import type { AppThunk } from "@/store";
import { clearReceiptDraft } from "@/store/receiptDraftSlice";
import { resetVoucherDraft } from "@/store/voucherDraftSlice";
import { resetSaleDraft } from "@/store/saleDraftSlice";
import {
  getAuthorizedSavedCompany,
  getSelectedCompanyStorageKey,
  isCurrentCompanyRestoreContext,
  type CompanyRestoreContext,
} from "@/services/companySelectionPersistence";
import {
  advanceContextGeneration,
  getCurrentAuthGeneration,
} from "@/services/authSessionGeneration";
import type { Company, CompanySummary } from "@/types/company";


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
    const userId = getState().auth.user?._id;
    if (!userId) return;

    const context: CompanyRestoreContext = {
      userId,
      authGeneration: getCurrentAuthGeneration(),
    };
    const selectedCompany = normalizeSelectedCompany(company);
    const previousCompanyId = getState().company.selectedCompany?._id;

    if (!isCurrentCompanyRestoreContext(context, getState().auth.user?._id)) {
      return;
    }

    await SecureStore.setItemAsync(
      getSelectedCompanyStorageKey(userId),
      JSON.stringify(selectedCompany),
    );

    // A delayed write from another session must never update the active UI.
    if (!isCurrentCompanyRestoreContext(context, getState().auth.user?._id)) {
      return;
    }

    if (previousCompanyId && previousCompanyId !== selectedCompany._id) {
      dispatch(clearReceiptDraft());
    }

    if (previousCompanyId !== selectedCompany._id) {
      advanceContextGeneration();
    }

    dispatch(setSelectedCompany(selectedCompany));
  };

export const rehydrateSelectedCompany = (
  userId: string,
  accessibleCompanies: Company[],
): AppThunk => async (dispatch, getState) => {
  const context: CompanyRestoreContext = {
    userId,
    authGeneration: getCurrentAuthGeneration(),
  };

  try {
    const companyStr =
      await SecureStore.getItemAsync(getSelectedCompanyStorageKey(userId));

    if (!isCurrentCompanyRestoreContext(context, getState().auth.user?._id)) {
      return;
    }

    // A manual choice made while this read was pending must take priority.
    if (!getState().company.isLoading) {
      return;
    }

    const company = getAuthorizedSavedCompany(companyStr, accessibleCompanies);
    if (company) {
      advanceContextGeneration();
      dispatch(setSelectedCompany(company));
    }
  } catch (error) {
    console.error("Failed to restore the selected company.", error);
  } finally {
    if (isCurrentCompanyRestoreContext(context, getState().auth.user?._id)) {
      dispatch(finishCompanyHydration());
    }
  }
};

export const clearPersistedSelectedCompany = (): AppThunk => async (
  dispatch,
  getState,
) => {
  const userId = getState().auth.user?._id;
  if (userId) {
    await SecureStore.deleteItemAsync(getSelectedCompanyStorageKey(userId));
  }
  dispatch(clearSelectedCompany());
  dispatch(clearReceiptDraft());
  dispatch(resetVoucherDraft());
  dispatch(resetSaleDraft());
};

export default companySlice.reducer;
