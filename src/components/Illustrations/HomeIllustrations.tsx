import Svg, { Path, Circle, Rect, G, Line } from 'react-native-svg';

type IllustrationProps = {
  size?: number;
  color?: string;
  opacity?: number;
};

// Customers — group of people
export function CustomersIllustration({ size = 100, color = '#fff', opacity = 1 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" opacity={opacity}>
      <Circle cx="35" cy="30" r="14" fill={color} />
      <Path d="M10 78 Q10 50 35 50 Q60 50 60 78 Z" fill={color} />
      <Circle cx="68" cy="38" r="11" fill={color} opacity={0.7} />
      <Path d="M48 82 Q48 60 68 60 Q88 60 88 82 Z" fill={color} opacity={0.7} />
    </Svg>
  );
}

// Products — stacked boxes
export function ProductsIllustration({ size = 100, color = '#fff', opacity = 1 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" opacity={opacity}>
      <G>
        <Path d="M50 8 L88 26 L50 44 L12 26 Z" fill={color} />
        <Path d="M12 26 L50 44 L50 84 L12 66 Z" fill={color} opacity={0.75} />
        <Path d="M88 26 L50 44 L50 84 L88 66 Z" fill={color} opacity={0.55} />
      </G>
    </Svg>
  );
}

// Daybook — notebook with lines
export function DaybookIllustration({ size = 100, color = '#fff', opacity = 1 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" opacity={opacity}>
      <Rect x="18" y="10" width="64" height="80" rx="8" fill={color} />
      <Rect x="18" y="10" width="14" height="80" rx="7" fill={color} opacity={0.6} />
      <Line x1="42" y1="34" x2="72" y2="34" stroke="#00000022" strokeWidth="4" strokeLinecap="round" />
      <Line x1="42" y1="48" x2="72" y2="48" stroke="#00000022" strokeWidth="4" strokeLinecap="round" />
      <Line x1="42" y1="62" x2="62" y2="62" stroke="#00000022" strokeWidth="4" strokeLinecap="round" />
    </Svg>
  );
}

// Outstandings — alert badge with exclamation
export function OutstandingsIllustration({ size = 100, color = '#fff', opacity = 1 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" opacity={opacity}>
      <Path
        d="M50 6 L92 78 Q95 84 88 84 L12 84 Q5 84 8 78 Z"
        fill={color}
      />
      <Rect x="45" y="34" width="10" height="26" rx="5" fill="#00000030" />
      <Circle cx="50" cy="70" r="6" fill="#00000030" />
    </Svg>
  );
}

// Cash / Bank — coin stack + note
export function CashBankIllustration({ size = 100, color = '#fff', opacity = 1 }: IllustrationProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" opacity={opacity}>
      <Rect x="10" y="42" width="60" height="38" rx="6" fill={color} opacity={0.7} />
      <Circle cx="40" cy="61" r="10" fill="#00000025" />
      <Circle cx="66" cy="30" r="22" fill={color} />
      <Path
        d="M66 20 v20 M60 24 h12 M60 36 h12"
        stroke="#00000030"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </Svg>
  );
}