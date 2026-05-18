import { Action, configureStore, ThunkAction } from "@reduxjs/toolkit";
import devToolsEnhancer from "redux-devtools-expo-dev-plugin";

import authReducer from "@/store/authSlice";

// Handles: Redux state, action history, time-travel via browser DevTools
export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  devTools: false,
  enhancers: (getDefaultEnhancers) =>
    __DEV__
      ? getDefaultEnhancers().concat(devToolsEnhancer())
      : getDefaultEnhancers(),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
