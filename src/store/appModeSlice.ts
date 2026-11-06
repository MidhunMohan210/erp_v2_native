import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { AppThunk, RootState } from "@/store";
import {
  hasCompleteOfflineMasterData,
  readAppMode,
  saveAppMode,
  type AppMode,
} from "@/services/appMode.service";
import {
  getCurrentContextGeneration,
  isCurrentContextGeneration,
} from "@/services/authSessionGeneration";
import { queryClient } from "@/lib/queryClient";

type ModeContext = { userId: string; companyId: string }; // check which company and user the mode belongs to, so we don't overwrite a new user's mode with an old user's mode
type ModeSelection = { userId: string; companyId: string; mode: AppMode };
type AppModeState = {
  userId: string;
  companyId: string;
  mode: AppMode;
  isLoading: boolean;
};
type ModeSwitchResult = "changed" | "unavailable" | "stale";

const initialState: AppModeState = {
  userId: "",
  companyId: "",
  mode: "online",
  isLoading: false,
};

const appModeSlice = createSlice({
  name: "appMode",
  initialState,
  reducers: {
    //beginModeContext resets the displayed mode to Online temporarily while it loads the saved mode for the new user and company.
    beginModeContext: (state, action: PayloadAction<ModeContext>) => {
      state.userId = action.payload.userId;
      state.companyId = action.payload.companyId;
      state.mode = "online";
      state.isLoading = true;
    },
    finishModeContext: (state, action: PayloadAction<ModeSelection>) => {
      if (
        state.userId !== action.payload.userId ||
        state.companyId !== action.payload.companyId
      )
        return;
      state.mode = action.payload.mode;
      state.isLoading = false;
    },
    resetAppMode: () => initialState,
  },
});

export const { beginModeContext, finishModeContext, resetAppMode } =
  appModeSlice.actions;

// Check whether this work still belongs to the current screen. The generation
// changes when the session or company changes, and the IDs must match the
// logged-in user and selected company. For example, if reading Company A's
// saved mode finishes after switching to Company B, return false so A's mode
// cannot update B's screen.
function isActiveModeContext(
  getState: () => RootState,
  context: ModeContext,
  generation: number,
): boolean {
  const state = getState();
  return (
    isCurrentContextGeneration(generation) &&
    state.auth.user?._id === context.userId &&
    state.company.selectedCompany?._id === context.companyId
  );
}

// Restore the mode after login and company selection. First show Online while
// reading this user/company's saved choice. A saved Offline choice is allowed
// only when that company still has a complete master download; otherwise save
// Online so an incomplete local snapshot cannot be activated silently.
// Check the context again after the read because the user may have switched
// accounts or companies while storage was loading.
export const restoreAppMode =
  (context: ModeContext): AppThunk<Promise<void>> =>
  async (dispatch, getState) => {
    const generation = getCurrentContextGeneration();
    if (!isActiveModeContext(getState, context, generation)) return;
    dispatch(beginModeContext(context));
    let mode: AppMode = "online";
    try {
      const saved = await readAppMode(context.userId, context.companyId);
      if (saved === "offline") {
        if (await hasCompleteOfflineMasterData(context.userId, context.companyId)) {
          mode = "offline";
        } else {
          // A later master download must not activate Offline automatically.
          await saveAppMode(context.userId, context.companyId, "online");
        }
      }
    } catch {
      // Storage failure is safe: Online remains the default and still uses APIs.
    }
    if (isActiveModeContext(getState, context, generation)) {
      dispatch(finishModeContext({ ...context, mode }));
    }
  };

// The UI confirms first. The readiness check is repeated here so a stale screen
// cannot activate Offline after its local master data becomes incomplete.
export const switchAppMode =
  (
    target: AppMode,
    context: ModeContext,
  ): AppThunk<Promise<ModeSwitchResult>> =>
  async (dispatch, getState) => {
    const generation = getCurrentContextGeneration();
    if (
      !context.userId ||
      !context.companyId ||
      !isActiveModeContext(getState, context, generation)
    )
      return "stale";
    if (
      target === "offline" &&
      !(await hasCompleteOfflineMasterData(context.userId, context.companyId))
    )
      return "unavailable";
    if (!isActiveModeContext(getState, context, generation)) return "stale";
    await saveAppMode(context.userId, context.companyId, target);
    if (!isActiveModeContext(getState, context, generation)) return "stale";
    // A mode change must not show business results cached under the old mode.
    await queryClient.cancelQueries(); //tells React Query to cancel requests currently fetching and waits for cancellation to settle.
    queryClient.clear(); //removes stored query results (and the mutation cache), so the next context cannot display them.
    if (!isActiveModeContext(getState, context, generation)) return "stale";
    dispatch(finishModeContext({ ...context, mode: target }));
    return "changed";
  };

export default appModeSlice.reducer;
