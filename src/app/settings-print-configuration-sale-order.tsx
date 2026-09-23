import { PrintConfigurationScreen } from "@/components/printConfiguration/PrintConfigurationScreen";

export default function SaleOrderPrintConfigurationScreen() {
  return (
    <PrintConfigurationScreen
      voucherType="sale_order"
      voucherLabel="Sale Order"
    />
  );
}
