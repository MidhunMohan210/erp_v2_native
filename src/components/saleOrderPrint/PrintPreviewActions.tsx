import { Download, Printer } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type PrintPreviewActionsProps = {
  pdfUri?: string;
  onDownload: () => void;
};

export function PrintPreviewActions({
  pdfUri,
  onDownload,
}: PrintPreviewActionsProps) {
  const insets = useSafeAreaInsets();
  const isDownloadReady = Boolean(pdfUri);

  return (
    <View
      className="flex-row gap-3 border-t border-slate-200 bg-white px-4 pt-3"
      style={{ paddingBottom: insets.bottom + 12 }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Download PDF"
        accessibilityState={{ disabled: !isDownloadReady }}
        disabled={!isDownloadReady}
        onPress={onDownload}
        className={`flex-1 flex-row items-center justify-center rounded-2xl bg-[#134074] px-3 py-3.5 ${
          isDownloadReady ? "" : "opacity-60"
        }`}
      >
        <Download color="#ffffff" size={17} strokeWidth={2.2} />
        <Text className="ml-2 text-[13px] font-extrabold text-white">
          Download PDF
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Print coming soon"
        accessibilityState={{ disabled: true }}
        disabled
        className="flex-1 flex-row items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2"
      >
        <Printer color="#94a3b8" size={17} strokeWidth={2.2} />
        <View className="ml-2">
          <Text className="text-[13px] font-extrabold text-slate-400">
            Print
          </Text>
          <Text className="text-[9px] font-bold uppercase tracking-[0.5px] text-slate-400">
            Coming soon
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
