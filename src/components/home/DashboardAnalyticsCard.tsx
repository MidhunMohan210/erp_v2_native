import { useState } from "react";
import { Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import { AppText } from "@/components/ui/AppText";

type DashboardMetricKey = "saleOrder" | "sales" | "receipt";

type TrendPoint = {
  label: string;
  amount: number;
};

type DashboardMetric = {
  tabLabel: string;
  label: string;
  total: string;
  count: number;
  countLabel: string;
  percentageChange: number;
  trend: TrendPoint[];
};

type DashboardMockData = {
  saleOrder: DashboardMetric;
  sales: DashboardMetric;
  receipt: DashboardMetric;
};

type ChartPoint = TrendPoint & {
  x: number;
  y: number;
};

// TODO: Replace dashboardMockData with dashboard API data.
const dashboardMockData: DashboardMockData = {
  saleOrder: {
    tabLabel: "Sale Order",
    label: "Sale Orders",
    total: "₹2,10,800",
    count: 42,
    countLabel: "Total Orders",
    percentageChange: 8.6,
    trend: [
      { label: "1 Dec", amount: 18000 },
      { label: "5 Dec", amount: 26000 },
      { label: "10 Dec", amount: 22000 },
      { label: "15 Dec", amount: 34000 },
      { label: "20 Dec", amount: 31000 },
      { label: "25 Dec", amount: 38000 },
      { label: "31 Dec", amount: 41800 },
    ],
  },
  sales: {
    tabLabel: "Sales",
    label: "Sales",
    total: "₹1,82,450",
    count: 36,
    countLabel: "Total Invoices",
    percentageChange: 12.4,
    trend: [
      { label: "1 Dec", amount: 12000 },
      { label: "5 Dec", amount: 19000 },
      { label: "10 Dec", amount: 17500 },
      { label: "15 Dec", amount: 23500 },
      { label: "20 Dec", amount: 28450 },
      { label: "25 Dec", amount: 36000 },
      { label: "31 Dec", amount: 46000 },
    ],
  },
  receipt: {
    tabLabel: "Receipt",
    label: "Receipts",
    total: "₹1,45,200",
    count: 31,
    countLabel: "Total Receipts",
    percentageChange: 6.8,
    trend: [
      { label: "1 Dec", amount: 9000 },
      { label: "5 Dec", amount: 15500 },
      { label: "10 Dec", amount: 14000 },
      { label: "15 Dec", amount: 20500 },
      { label: "20 Dec", amount: 18700 },
      { label: "25 Dec", amount: 29000 },
      { label: "31 Dec", amount: 38500 },
    ],
  },
};

const metricKeys: DashboardMetricKey[] = ["saleOrder", "sales", "receipt"];

const CHART_WIDTH = 360;
const CHART_HEIGHT = 142;
const CHART_LEFT = 14;
const CHART_RIGHT = 14;
const CHART_TOP = 18;
const CHART_BOTTOM = 106;
const TOOLTIP_WIDTH = 78;

function formatTooltipAmount(amount: number): string {
  return `₹${new Intl.NumberFormat("en-IN").format(amount)}`;
}

function createChartPoints(trend: TrendPoint[]): ChartPoint[] {
  const amounts = trend.map((point) => point.amount);
  const lowestAmount = Math.min(...amounts);
  const highestAmount = Math.max(...amounts);
  const amountRange = Math.max(highestAmount - lowestAmount, 1);
  const horizontalSpace = CHART_WIDTH - CHART_LEFT - CHART_RIGHT;
  const verticalSpace = CHART_BOTTOM - CHART_TOP;

  return trend.map((point, index) => ({
    ...point,
    x: CHART_LEFT + (horizontalSpace * index) / (trend.length - 1),
    y:
      CHART_BOTTOM -
      ((point.amount - lowestAmount) / amountRange) * verticalSpace,
  }));
}

// Quadratic curves join the data points without requiring a chart dependency.
function createSmoothPath(points: ChartPoint[]): string {
  if (points.length === 0) return "";

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 1; index < points.length - 1; index += 1) {
    const currentPoint = points[index];
    const nextPoint = points[index + 1];
    const middleX = (currentPoint.x + nextPoint.x) / 2;
    const middleY = (currentPoint.y + nextPoint.y) / 2;

    path += ` Q ${currentPoint.x} ${currentPoint.y} ${middleX} ${middleY}`;
  }

  const finalPoint = points[points.length - 1];
  path += ` T ${finalPoint.x} ${finalPoint.y}`;

  return path;
}

type AnalyticsChartProps = {
  trend: TrendPoint[];
};

function AnalyticsChart({ trend }: AnalyticsChartProps) {
  const [selectedPointIndex, setSelectedPointIndex] = useState(4);
  const points = createChartPoints(trend);
  const linePath = createSmoothPath(points);
  const firstPoint = points[0];
  const finalPoint = points[points.length - 1];
  const selectedPoint = points[selectedPointIndex] ?? points[0];
  const areaPath = `${linePath} L ${finalPoint.x} ${CHART_BOTTOM} L ${firstPoint.x} ${CHART_BOTTOM} Z`;
  const tooltipX = Math.min(
    Math.max(selectedPoint.x - TOOLTIP_WIDTH / 2, 2),
    CHART_WIDTH - TOOLTIP_WIDTH - 2,
  );
  const tooltipY = Math.max(selectedPoint.y - 35, 1);

  return (
    <View className="mt-1 h-[142px] w-full overflow-hidden">
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id="analyticsLine" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#38D6F2" />
            <Stop offset="0.55" stopColor="#5B8CFF" />
            <Stop offset="1" stopColor="#9B4DFF" />
          </LinearGradient>
          <LinearGradient id="analyticsArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#4DAAF8" stopOpacity="0.34" />
            <Stop offset="1" stopColor="#4DAAF8" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        <Path d={areaPath} fill="url(#analyticsArea)" />
        <Path
          d={linePath}
          fill="none"
          stroke="url(#analyticsLine)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <Line
          x1={selectedPoint.x}
          y1={selectedPoint.y + 7}
          x2={selectedPoint.x}
          y2={CHART_BOTTOM}
          stroke="#6BA7FF"
          strokeOpacity={0.75}
          strokeWidth={1}
          strokeDasharray="4 5"
        />

        {points.map((point, index) => {
          const isSelected = index === selectedPointIndex;

          return (
            <Circle
              key={point.label}
              cx={point.x}
              cy={point.y}
              r={isSelected ? 5.5 : 3.5}
              fill={isSelected ? "#EAF5FF" : "#53C9F4"}
              stroke={isSelected ? "#66A8FF" : "transparent"}
              strokeWidth={isSelected ? 4 : 0}
              onPress={() => setSelectedPointIndex(index)}
            />
          );
        })}

        <Rect
          x={tooltipX}
          y={tooltipY}
          width={TOOLTIP_WIDTH}
          height={27}
          rx={12}
          fill="#071426"
          stroke="#FFFFFF"
          strokeOpacity={0.18}
        />
        <SvgText
          x={tooltipX + TOOLTIP_WIDTH / 2}
          y={tooltipY + 18}
          fill="#FFFFFF"
          fontSize={11}
          fontWeight="700"
          textAnchor="middle"
        >
          {formatTooltipAmount(selectedPoint.amount)}
        </SvgText>

        {points.map((point, index) => (
          <SvgText
            key={`${point.label}-axis`}
            x={point.x}
            y={134}
            fill="#B7C6DA"
            fontSize={8.5}
            textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
          >
            {point.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

export default function DashboardAnalyticsCard() {
  const [selectedMetric, setSelectedMetric] =
    useState<DashboardMetricKey>("sales");
  const activeMetric = dashboardMockData[selectedMetric];

  return (
    <View className="mx-6 rounded-[30px] border border-white/10 bg-[#14263A]/95 px-4 pb-3 pt-4">
      <View className="flex-row items-center justify-between px-1">
        <AppText className="text-[16px] font-bold text-white">
          Business Overview
        </AppText>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Selected period: This Month"
          className="flex-row items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-2"
        >
          <AppText className="text-[11px] font-semibold text-white/85">
            This Month
          </AppText>
          <Feather name="chevron-down" size={13} color="#D9E5F4" />
        </Pressable>
      </View>

      <View className="mt-3 flex-row rounded-2xl border border-white/15 bg-black/10 p-1">
        {metricKeys.map((metricKey) => {
          const metric = dashboardMockData[metricKey];
          const isSelected = metricKey === selectedMetric;

          return (
            <Pressable
              key={metricKey}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setSelectedMetric(metricKey)}
              className={`flex-1 items-center rounded-xl py-2 ${
                isSelected ? "bg-white" : "bg-transparent"
              }`}
            >
              <AppText
                className={`text-[12px] font-semibold ${
                  isSelected ? "text-[#134074]" : "text-white/75"
                }`}
              >
                {metric.tabLabel}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View className="mt-4 flex-row items-end justify-between px-1">
        <View className="flex-1 pr-4">
          <AppText className="text-[12px] font-medium text-white/75">
            {activeMetric.label}
          </AppText>
          <AppText className="mt-0.5 text-[28px] font-bold tracking-tight text-white">
            {activeMetric.total}
          </AppText>
          <View className="mt-1 flex-row items-center">
            <Feather name="arrow-up" size={14} color="#35E59A" />
            <AppText className="ml-1 text-[12px] font-bold text-[#35E59A]">
              {activeMetric.percentageChange}%
            </AppText>
            <AppText className="ml-2 text-[11px] text-white/55">
              vs last month
            </AppText>
          </View>
        </View>

        <View className="items-end pb-1">
          <AppText className="text-[28px] font-bold text-white">
            {activeMetric.count}
          </AppText>
          <AppText className="mt-0.5 text-[10px] text-[#A8BDD3]">
            {activeMetric.countLabel}
          </AppText>
        </View>
      </View>

      <AnalyticsChart key={selectedMetric} trend={activeMetric.trend} />
    </View>
  );
}
