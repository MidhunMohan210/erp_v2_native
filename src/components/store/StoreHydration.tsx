import { useEffect } from "react";

import { rehydrateAuth } from "@/store/authSlice";
import { rehydrateSelectedCompany } from "@/store/companySlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function StoreHydration() {
  const dispatch = useAppDispatch();
  const isAuthLoading = useAppSelector((state) => state.auth.isLoading);
  const isCompanyLoading = useAppSelector((state) => state.company.isLoading);

  useEffect(() => {
    if (isAuthLoading) {
      void dispatch(rehydrateAuth());
    }
  }, [dispatch, isAuthLoading]);

  useEffect(() => {
    if (isCompanyLoading) {
      void dispatch(rehydrateSelectedCompany());
    }
  }, [dispatch, isCompanyLoading]);

  return null;
}
