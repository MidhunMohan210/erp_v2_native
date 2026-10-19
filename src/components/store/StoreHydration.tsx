import { useEffect } from "react";

import { rehydrateAuth } from "@/store/authSlice";
import {
  finishCompanyHydration,
  rehydrateSelectedCompany,
} from "@/store/companySlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { companyService } from "@/services/company.service";
import {
  getCurrentAuthGeneration,
  isCurrentAuthGeneration,
} from "@/services/authSessionGeneration";

export function StoreHydration() {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((state) => state.auth.user?._id);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const isAuthLoading = useAppSelector((state) => state.auth.isLoading);
  const isCompanyLoading = useAppSelector((state) => state.company.isLoading);

  useEffect(() => {
    if (isAuthLoading) {
      void dispatch(rehydrateAuth());
    }
  }, [dispatch, isAuthLoading]);

  useEffect(() => {
    if (!isCompanyLoading || isAuthLoading) return;

    if (!isAuthenticated || !userId) {
      dispatch(finishCompanyHydration());
      return;
    }

    const authGeneration = getCurrentAuthGeneration();
    let isCancelled = false;

    void companyService
      .getCompanies()
      .then((companies) => {
        if (isCancelled || !isCurrentAuthGeneration(authGeneration)) return;
        void dispatch(rehydrateSelectedCompany(userId, companies));
      })
      .catch(() => {
        // Without a fresh company list, do not restore a potentially revoked company.
        if (!isCancelled && isCurrentAuthGeneration(authGeneration)) {
          dispatch(finishCompanyHydration());
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [dispatch, isAuthenticated, isAuthLoading, isCompanyLoading, userId]);

  return null;
}
