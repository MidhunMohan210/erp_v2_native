import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Pdf from "react-native-pdf";

import { PageError } from "@/components/feedback/PageError";
import { PageLoader } from "@/components/feedback/PageLoader";
import type { SaleOrderPrintFormat } from "@/types/saleOrderPrint";

type SaleOrderPrintPreviewProps = {
  format?: SaleOrderPrintFormat;
  pdfUri?: string;
  isLoading: boolean;
  isGeneratingPdf: boolean;
  isError: boolean;
  pdfError?: string;
  onRetry: () => void;
  onRetryPdfGeneration: () => void;
};

function getFormatLabel(format?: SaleOrderPrintFormat): string {
  if (format === "a4") return "A4 Document";
  if (format === "thermal80") return "80 mm Thermal";
  if (format === "thermal58") return "58 mm Thermal";
  return "Unknown format";
}

export function SaleOrderPrintPreview({
  format,
  pdfUri,
  isLoading,
  isGeneratingPdf,
  isError,
  pdfError,
  onRetry,
  onRetryPdfGeneration,
}: SaleOrderPrintPreviewProps) {
  const [viewerKey, setViewerKey] = useState(0);
  const [scale, setScale] = useState(1);
  const [hasViewerError, setHasViewerError] = useState(false);

  const resetView = () => {
    setScale(1);
    setHasViewerError(false);
    // Recreating Pdf restores react-native-pdf's initial fit-to-page position.
    setViewerKey((currentKey) => currentKey + 1);
  };

  const retryPdf = () => {
    setHasViewerError(false);
    onRetryPdfGeneration();
  };

  return (
    <View className="flex-1 bg-slate-100">
      <View className="border-b border-slate-200 bg-white px-4 py-3">
        <Text className="text-[10px] font-bold uppercase tracking-[1px] text-slate-400">
          Selected format
        </Text>
        <Text className="mt-1 text-[15px] font-extrabold text-[#134074]">
          {getFormatLabel(format)}
        </Text>
      </View>

      {format === "thermal80" || format === "thermal58" ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-[15px] font-bold text-slate-700">
            Thermal preview will be added in a later phase.
          </Text>
        </View>
      ) : isLoading ? (
        <PageLoader message="Preparing A4 preview..." />
      ) : isError ? (
        <PageError
          title="Could not load print preview"
          description="The sale order, company, or print configuration could not be loaded."
          onRetry={onRetry}
        />
      ) : isGeneratingPdf ? (
        <View className="flex-1 items-center justify-center bg-slate-200 px-6">
          <ActivityIndicator color="#134074" size="large" />
          <Text className="mt-3 text-center text-[13px] font-semibold text-slate-600">
            Generating A4 PDF...
          </Text>
        </View>
      ) : pdfError || hasViewerError || !pdfUri ? (
        <PageError
          title="Could not display A4 PDF"
          description={pdfError || "The generated PDF could not be rendered."}
          onRetry={retryPdf}
        />
      ) : (
        <View className="flex-1 bg-slate-200 p-3">
          <View
            className="flex-1 overflow-hidden bg-slate-200"
            style={{
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.16,
              shadowRadius: 5,
              elevation: 4,
            }}
          >
            <Pdf
              key={`${pdfUri}-${viewerKey}`}
              source={{ uri: pdfUri, cache: false }}
              fitPolicy={2}
              minScale={1}
              maxScale={4}
              enableDoubleTapZoom
              scrollEnabled
              onScaleChanged={setScale}
              onError={() => setHasViewerError(true)}
              style={{ flex: 1, backgroundColor: "#e2e8f0" }}
            />
          </View>

          <View className="mt-3 flex-row items-center justify-between">
            <Text className="text-[12px] font-semibold text-slate-600">
              Pinch to zoom · {Math.round(scale * 100)}%
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset PDF view"
              onPress={resetView}
              className="rounded-xl border border-[#134074] bg-white px-3 py-2"
            >
              <Text className="text-[12px] font-extrabold text-[#134074]">
                Reset View
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
