import { View } from "react-native";
import ActionCard from "./ActionCard";



export default function QuickActionsSheet() {
  return (
    <View
      className="bg-white
     flex-1 rounded-t-[40px] px-6 pt-2 pb-32 mt-2"
    >
      {/* <Text className="text-slate-400 text-[11px] font-bold tracking-[0.15em] mb-6">QUICK ACTIONS</Text> */}

      <View className="flex-row items-center justify-center mb-6">
        <View className="h-1 w-14 bg-gray-300 rounded-full" />
      </View>
      <View className="flex-row flex-wrap justify-between">
        {/* Row 1: Large Square Cards */}
        <ActionCard
          title="Customers"
          subtitle="Manage parties"
          iconName="users"
          iconColor="#ca8a04" // yellow-600
          iconBgColor="bg-yellow-100" // solid circle
          glowColors={["#fef08a", "transparent"]} // yellow-200 to transparent
          type="square"
          to="/customer-list"
        />

        <ActionCard
          title="Products"
          subtitle="Catalog items"
          iconName="box"
          iconColor="#db2777" // pink-600
          iconBgColor="bg-pink-100"
          glowColors={["#fbcfe8", "transparent"]} // pink-200 to transparent
          type="square"
          to="/product-list"

        />

        {/* Row 2: Full Width Horizontal Card */}
        <ActionCard
          title="Daybook"
          iconName="file-text"
          iconColor="#4f46e5" // indigo-600
          iconBgColor="bg-indigo-100"
          glowColors={["#c7d2fe", "transparent"]} // indigo-200 to transparent
          type="horizontal-full"
        />

        {/* Row 3: Half Width Horizontal Cards */}
        <ActionCard
          title="Outstandings"
          subtitle="Pending dues"
          iconName="alert-circle"
          iconColor="#dc2626" // red-600
          iconBgColor="bg-red-100"
          glowColors={["#fecaca", "transparent"]} // red-200 to transparent
          type="horizontal-half"
        />

        <ActionCard
          title="Cash / Bank"
          subtitle="Ledger & balance"
          iconName="dollar-sign"
          iconColor="#059669" // emerald-600
          iconBgColor="bg-emerald-100"
          glowColors={["#a7f3d0", "transparent"]} // emerald-200 to transparent
          type="horizontal-half"
        />
      </View>
    </View>
  );
}
