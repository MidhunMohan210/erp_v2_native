import { Download, Printer, Share2 } from "lucide-react-native";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type PrintPreviewActionsProps = {
  pdfUri?: string;
  isDownloading?: boolean;
  isSharing?: boolean;
  canPrint?: boolean;
  isPrinting?: boolean;
  printerName?: string;
  onDownload: () => void;
  onShare: () => void;
  onPrint?: () => void;
  onChangePrinter?: () => void;
};

export function PrintPreviewActions({
  pdfUri,
  isDownloading = false,
  isSharing = false,
  canPrint = false,
  isPrinting = false,
  printerName,
  onDownload,
  onShare,
  onPrint,
  onChangePrinter,
}: PrintPreviewActionsProps) {
  const insets = useSafeAreaInsets();
  const isDownloadReady = Boolean(pdfUri);
  const isActionProcessing = isDownloading || isSharing || isPrinting;
  const isDownloadDisabled = !isDownloadReady || isActionProcessing;
  const isShareDisabled = !isDownloadReady || isActionProcessing;
  const isPrintDisabled = !canPrint || isActionProcessing || !onPrint;
  const canChangePrinter = Boolean(canPrint && onChangePrinter);

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

      {canChangePrinter ? (
        <View className="flex-row items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
          <View className="min-w-0 flex-1 pr-3">
            <Text className="text-[10px] font-bold uppercase tracking-[0.6px] text-slate-400">
              Printer
            </Text>
            <Text
              numberOfLines={1}
              className="mt-0.5 text-[12px] font-extrabold text-slate-700"
            >
              {printerName || "No printer selected"}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change thermal printer"
            disabled={isActionProcessing}
            onPress={onChangePrinter}
            className={`rounded-xl border border-[#134074] bg-white px-3 py-2 ${
              isActionProcessing ? "opacity-60" : ""
            }`}
          >
            <Text className="text-[11px] font-extrabold text-[#134074]">
              Change
            </Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={canPrint ? "Print thermal receipt" : "Print coming soon"}
        accessibilityState={{ disabled: isPrintDisabled, busy: isPrinting }}
        disabled={isPrintDisabled}
        onPress={onPrint}
        className={`flex-row items-center justify-center rounded-2xl border px-3 py-2.5 ${
          canPrint
            ? "border-[#134074] bg-[#134074]"
            : "border-slate-200 bg-slate-100"
        } ${isPrintDisabled && canPrint ? "opacity-60" : ""}`}
      >
        {isPrinting ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Printer
            color={canPrint ? "#ffffff" : "#94a3b8"}
            size={17}
            strokeWidth={2.2}
          />
        )}
        <View className="ml-2">
          <Text
            className={`text-[13px] font-extrabold ${
              canPrint ? "text-white" : "text-slate-400"
            }`}
          >
            {isPrinting ? "Printing..." : "Print"}
          </Text>
          <Text
            className={`text-[9px] font-bold uppercase tracking-[0.5px] ${
              canPrint ? "text-white/80" : "text-slate-400"
            }`}
          >
            {canPrint ? "Bluetooth thermal" : "Coming soon"}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
