import { useRef, useState } from "react";
import {
  ActivityIndicator,
  View,
  type NativeSyntheticEvent,
  type NativeTouchEvent,
} from "react-native";

import { useVoucherTotalsSummaryQuery } from "@/hooks/queries/voucherQueries";
import { useAppSelector } from "@/store/hooks";
import { AppText } from "@/components/ui/AppText";

/**
 * The voucher totals supported by this carousel.
 *
 * Keeping this as a union type prevents invalid values such as:
 * setActiveTotalType("sales")
 */
type TotalType = "saleOrder" | "receipt";

/**
 * Structure of each card shown inside the carousel.
 */
type TotalCard = {
  key: TotalType;
  label: string;
  value: number;
  helper: string;
};

/**
 * Minimum horizontal finger movement required to treat the gesture as a swipe.
 *
 * Small movements below 40 points are ignored because a user's finger
 * may move slightly during a normal touch.
 */
const SWIPE_THRESHOLD = 40;

/**
 * Formats a number as Indian Rupees.
 *
 * Example:
 * 12500 -> ₹12,500.00
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export default function BalanceCarousel() {
  /**
   * Read the currently selected company from Redux.
   */
  const selectedCompany = useAppSelector(
    (state) => state.company.selectedCompany,
  );

  /**
   * Use an empty string when no company is selected.
   *
   * The query hook should normally avoid making the API request
   * when companyId is empty.
   */
  const companyId = selectedCompany?._id ?? "";

  /**
   * Fetch the sale-order total and receipt total for the selected company.
   */
  const totalsSummaryQuery = useVoucherTotalsSummaryQuery(companyId);

  /**
   * Controls which total is currently visible.
   *
   * The Sale Order total is shown first.
   */
  const [activeTotalType, setActiveTotalType] =
    useState<TotalType>("saleOrder");

  /**
   * Stores the horizontal position where the finger first touched the card.
   *
   * useRef is used instead of useState because this value is only needed
   * for calculating the swipe distance. Updating it does not need to
   * rerender the UI.
   */
  const touchStartXRef = useRef<number | null>(null);

  /**
   * Use zero totals until API data becomes available.
   */
  const totals = totalsSummaryQuery.data?.totals ?? {
    saleOrder: 0,
    receipt: 0,
  };

  /**
   * Cards available in the carousel.
   */
  const totalCards: TotalCard[] = [
    {
      key: "saleOrder",
      label: "Sale Order Total",
      value: totals.saleOrder,
      helper: "Swipe to switch voucher total",
    },
    {
      key: "receipt",
      label: "Receipt Total",
      value: totals.receipt,
      helper: "Swipe to switch voucher total",
    },
  ];

  /**
   * Find the card matching the currently selected total type.
   *
   * totalCards[0] is used as a safe fallback.
   */
  const activeCard =
    totalCards.find((card) => card.key === activeTotalType) ?? totalCards[0];

  /**
   * Runs when the user first places their finger on the card.
   */
  const handleTouchStart = (
    event: NativeSyntheticEvent<NativeTouchEvent>,
  ) => {
    /**
     * touches contains all fingers currently touching the screen.
     *
     * touches[0] means the first finger.
     * pageX is its horizontal position on the screen.
     */
    const firstTouch = event.nativeEvent.touches[0];

    if (!firstTouch) {
      touchStartXRef.current = null;
      return;
    }

    /**
     * Example:
     *
     * The user touches near the right side of the screen:
     * touchStartXRef.current = 280
     */
    touchStartXRef.current = firstTouch.pageX;
  };

  /**
   * Calculates the swipe direction after the user's finger is released.
   */
  const handleTouchEnd = (
    event: NativeSyntheticEvent<NativeTouchEvent>,
  ) => {
    /**
     * Read the stored starting position.
     */
    const touchStartX = touchStartXRef.current;

    /**
     * changedTouches contains the touches that ended or changed.
     *
     * During onTouchEnd, changedTouches[0] normally represents
     * the finger that was just released.
     */
    const endedTouch = event.nativeEvent.changedTouches[0];

    /**
     * Swipe distance cannot be calculated when either the start
     * position or end position is unavailable.
     */
    if (touchStartX === null || !endedTouch) {
      touchStartXRef.current = null;
      return;
    }

    const touchEndX = endedTouch.pageX;

    /**
     * Calculate horizontal movement.
     *
     * Formula:
     *
     * distance = ending position - starting position
     */
    const distance = touchEndX - touchStartX;

    /**
     * Positive distance means the finger moved toward the right.
     *
     * Example:
     *
     * Start = 100
     * End   = 220
     *
     * distance = 220 - 100
     * distance = 120
     *
     * 120 is greater than 40, so this is a right swipe.
     */
    if (distance > SWIPE_THRESHOLD) {
      setActiveTotalType("saleOrder");
    }

    /**
     * Negative distance means the finger moved toward the left.
     *
     * Example:
     *
     * Start = 250
     * End   = 100
     *
     * distance = 100 - 250
     * distance = -150
     *
     * -150 is less than -40, so this is a left swipe.
     */
    else if (distance < -SWIPE_THRESHOLD) {
      setActiveTotalType("receipt");
    }

    /**
     * When distance is between -40 and 40, nothing changes.
     *
     * Example:
     *
     * Start = 200
     * End   = 220
     *
     * distance = 20
     *
     * This is treated as a small finger movement rather than a swipe.
     */

    /**
     * Clear the stored position after completing the gesture.
     *
     * This prepares the component for the next swipe.
     */
    touchStartXRef.current = null;
  };

  /**
   * Runs when React Native cancels the touch gesture.
   *
   * This may happen when another gesture handler or system action
   * takes control of the touch.
   */
  const handleTouchCancel = () => {
    touchStartXRef.current = null;
  };

  return (
    <View
      /**
       * Record where the finger initially touches the carousel.
       */
      onTouchStart={handleTouchStart}
      /**
       * Calculate the swipe when the finger is released.
       */
      onTouchEnd={handleTouchEnd}
      /**
       * Clear the stored position when the gesture is cancelled.
       */
      onTouchCancel={handleTouchCancel}
      className="mx-6 items-center rounded-3xl border border-white/5 bg-white/10 p-6"
    >
      <AppText className="mb-2 text-xs font-bold tracking-widest text-white/70">
        TOTAL BALANCE
      </AppText>

      <AppText className="mb-1 text-sm font-medium text-white">
        {activeCard.label}
      </AppText>

      {/**
       * Show a loader while the totals API request is running.
       */}
      {totalsSummaryQuery.isLoading ? (
        <View className="mb-4 h-[48px] justify-center">
          <ActivityIndicator color="#ffffff" size="small" />
        </View>
      ) : (
        <AppText className="mb-4 text-4xl font-bold text-white">
          {formatCurrency(activeCard.value)}
        </AppText>
      )}

      <AppText className="mb-4 text-xs text-white/60">
        {totalsSummaryQuery.isError
          ? "Unable to load total right now"
          : activeCard.helper}
      </AppText>

      {/**
       * Carousel position indicators.
       *
       * The active card gets a wider indicator.
       * The inactive card gets a small circular indicator.
       */}
      <View className="flex-row items-center gap-2">
        {totalCards.map((card) => {
          const isActive = card.key === activeCard.key;

          return (
            <View
              key={card.key}
              className={
                isActive
                  ? "h-1.5 w-6 rounded-full bg-white"
                  : "h-1.5 w-1.5 rounded-full bg-white/40"
              }
            />
          );
        })}
      </View>
    </View>
  );
}
