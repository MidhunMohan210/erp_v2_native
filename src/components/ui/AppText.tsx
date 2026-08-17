import { Text, type TextProps } from "react-native";

/**
 * Text that still follows the system font-size setting, with a sensible cap
 * for compact mobile layouts. Pass maxFontSizeMultiplier to override it.
 */
export function AppText({
  maxFontSizeMultiplier = 1,
  ...props
}: TextProps) {
  return <Text {...props} maxFontSizeMultiplier={maxFontSizeMultiplier} />;
}
