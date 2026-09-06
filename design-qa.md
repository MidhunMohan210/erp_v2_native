# Dashboard Analytics Card Design QA

- Source visual truth: `/Users/midhun/Downloads/ChatGPT Image Sep 6, 2026, 11_39_49 PM.png`
- Source pixels: 1214 x 1295
- Implementation: `src/components/home/DashboardAnalyticsCard.tsx`
- Intended viewport: responsive Expo React Native mobile screen
- Implementation pixels / CSS size / density: unavailable because a rendered app capture could not be obtained
- State: Sales tab selected, This Month period, 20 Dec point selected

## Full-view comparison evidence

The reference image was opened at its original resolution. The implementation
could not be captured in the matching Home-screen state because the connected
Android device disconnected before the ERP app could be opened. The Expo web
fallback is blocked by the existing native-only `react-native-pdf` import in the
sale-order print route.

## Focused region comparison evidence

A focused analytics-card comparison could not be completed without a rendered
implementation capture. Code inspection confirms that the intended hierarchy,
copy, three metric states, dark theme, area chart, point tooltip and date labels
are present, but code inspection is not visual evidence.

## Findings

- [P2] Rendered device evidence is unavailable.
  Location: Home screen / DashboardAnalyticsCard.
  Evidence: the 1214 x 1295 source is available, but no implementation screenshot
  is available at a matching mobile viewport and state.
  Impact: exact spacing, text fit, chart proportions and below-card visibility
  cannot receive final visual sign-off.
  Fix: reconnect the Android device or open the development build, capture the
  Home screen with Sales selected, and compare it with the supplied reference.

## Required fidelity surfaces

- Fonts and typography: hierarchy is implemented with the existing app/system
  font, but rendered weight and wrapping are not visually verified.
- Spacing and layout rhythm: responsive flex layout and SVG viewBox are present,
  but device-specific proportions are not visually verified.
- Colors and visual tokens: dark navy surface, muted labels, green trend accent,
  and cyan-to-purple chart treatment follow the brief; rendered contrast remains
  to be verified.
- Image quality and asset fidelity: no new raster assets are required for this
  section; the chart is a native SVG data visualization.
- Copy and content: Business Overview, This Month, all three metric tabs, totals,
  counts, comparisons and date labels match the supplied brief.

## Comparison history

- Initial pass: blocked because the Android device disconnected and the existing
  native PDF route prevents the Expo web fallback from bundling.
- Fixes made: none based on visual evidence; no valid implementation capture was
  available for a post-fix comparison.

## Implementation checklist

- Capture the Sales state on a connected Android or iOS development build.
- Tap Sale Order and Receipt and verify that all KPI and chart content updates.
- Tap chart points and verify tooltip positioning at both chart edges.
- Confirm Utilities and Recent Transactions remain visible below the card.

final result: blocked
