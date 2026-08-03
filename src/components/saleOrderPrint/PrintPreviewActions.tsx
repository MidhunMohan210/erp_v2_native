import { Download, Printer, Share2 } from "lucide-react-native";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type PrintPreviewActionsProps = {
  pdfUri?: string;
  isDownloading?: boolean;
  isSharing?: boolean;
  onDownload: () => void;
  onShare: () => void;
};

export function PrintPreviewActions({
  pdfUri,
  isDownloading = false,
  isSharing = false,
  onDownload,
  onShare,
}: PrintPreviewActionsProps) {
  const insets = useSafeAreaInsets();
  const isDownloadReady = Boolean(pdfUri);
  const isActionProcessing = isDownloading || isSharing;
  const isDownloadDisabled = !isDownloadReady || isActionProcessing;
  const isShareDisabled = !isDownloadReady || isActionProcessing;

  return (
    <View
      className="gap-3 border-t border-slate-200 bg-white px-4 pt-3"
      style={{ paddingBottom: insets.bottom + 12 }}
    >
      <View className="flex-row gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Download PDF"
          accessibilityState={{ disabled: isDownloadDisabled, busy: isDownloading }}
          disabled={isDownloadDisabled}
          onPress={onDownload}
          className={`flex-1 flex-row items-center justify-center rounded-2xl bg-[#134074] px-3 py-3.5 ${
            isDownloadDisabled ? "opacity-60" : ""
          }`}
        >
          {isDownloading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Download color="#ffffff" size={17} strokeWidth={2.2} />
          )}
          <Text className="ml-2 text-[13px] font-extrabold text-white">
            {isDownloading ? "Saving PDF..." : "Download PDF"}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share PDF"
          accessibilityState={{ disabled: isShareDisabled, busy: isSharing }}
          disabled={isShareDisabled}
          onPress={onShare}
          className={`flex-1 flex-row items-center justify-center rounded-2xl border border-[#134074] bg-white px-3 py-3.5 ${
            isShareDisabled ? "opacity-60" : ""
          }`}
        >
          {isSharing ? (
            <ActivityIndicator color="#134074" size="small" />
          ) : (
            <Share2 color="#134074" size={17} strokeWidth={2.2} />
          )}
          <Text className="ml-2 text-[13px] font-extrabold text-[#134074]">
            {isSharing ? "Sharing PDF..." : "Share PDF"}
          </Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Print coming soon"
        accessibilityState={{ disabled: true }}
        disabled
        className="flex-row items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2.5"
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
