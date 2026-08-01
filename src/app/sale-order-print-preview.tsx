import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as Print from "expo-print";
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import * as Sharing from "expo-sharing";
import { toast } from "sonner-native";

import { PrintPreviewActions } from "@/components/saleOrderPrint/PrintPreviewActions";
import { SaleOrderPrintPreview } from "@/components/saleOrderPrint/SaleOrderPrintPreview";
import { ScreenHeader } from "@/components/ScreenHeader";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { createA4SaleOrderHtml } from "@/features/saleOrderPrint/templates/createA4SaleOrderHtml";
import { useCompanySettingsQuery } from "@/hooks/queries/companySettingsQueries";
import { usePrintConfigurationQuery } from "@/hooks/queries/printConfigurationQueries";
import { useSaleOrderDetailQuery } from "@/hooks/queries/saleOrderQueries";
import { companyService } from "@/services/company.service";
import { useAppSelector } from "@/store/hooks";
import type { SaleOrderPrintFormat } from "@/types/saleOrderPrint";

// Stores the input that has already started PDF generation, including in React Strict Mode.
type PdfGenerationRequest = {
  key: string;
};

// expo-print defaults to US Letter; these 72 PPI dimensions generate real A4 pages.
const A4_PORTRAIT_WIDTH = 595;
const A4_PORTRAIT_HEIGHT = 842;

function getPdfErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "The A4 PDF could not be generated. Please try again.";
}

export default function SaleOrderPrintPreviewScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    format?: SaleOrderPrintFormat;
  }>();
  const selectedCompany = useAppSelector(
    (state) => state.company.selectedCompany,
  );
  const companyId = selectedCompany?._id ?? "";
  const isA4 = params.format === "a4";
  const canLoadA4 = Boolean(isA4 && params.id && companyId);
  const [pdfUri, setPdfUri] = useState<string>();
  const [pdfError, setPdfError] = useState<string>();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [generationAttempt, setGenerationAttempt] = useState(0);
  const latestGenerationRef = useRef<PdfGenerationRequest | undefined>(
    undefined,
  );

  const saleOrderQuery = useSaleOrderDetailQuery(
    params.id ?? "",
    companyId,
    canLoadA4,
  );
  const companyQuery = useQuery({
    queryKey: [...QUERY_KEYS.companies, "detail", companyId],
    queryFn: () => companyService.getCompanyById(companyId),
    enabled: canLoadA4,
    staleTime: 60_000,
  });
  const configurationQuery = usePrintConfigurationQuery(
    companyId,
    "sale_order",
    canLoadA4,
  );
  const companySettingsQuery = useCompanySettingsQuery(
    companyId,
    canLoadA4,
  );

  const html = useMemo(() => {
    if (
      !isA4 ||
      !saleOrderQuery.data ||
      !companyQuery.data ||
      !configurationQuery.data?.config ||
      companySettingsQuery.isLoading
    ) {
      return undefined;
    }

    return createA4SaleOrderHtml({
      saleOrder: saleOrderQuery.data,
      company: companyQuery.data,
      configuration: configurationQuery.data.config,
      companySettings: companySettingsQuery.data,
    });
  }, [
    companyQuery.data,
    companySettingsQuery.data,
    companySettingsQuery.isLoading,
    configurationQuery.data?.config,
    isA4,
    saleOrderQuery.data,
  ]);

  const isLoading =
    isA4 &&
    canLoadA4 &&
    (saleOrderQuery.isLoading ||
      companyQuery.isLoading ||
      configurationQuery.isLoading ||
      companySettingsQuery.isLoading);
  const isError =
    (isA4 && !canLoadA4) ||
    saleOrderQuery.isError ||
    companyQuery.isError ||
    configurationQuery.isError ||
    companySettingsQuery.isError;

  useEffect(() => {
    if (!html) {
      setPdfUri(undefined);
      setPdfError(undefined);
      setIsGeneratingPdf(false);
      return;
    }

    const generationKey = `${generationAttempt}:${html}`;
    if (latestGenerationRef.current?.key === generationKey) return;

    latestGenerationRef.current = { key: generationKey };
    setPdfUri(undefined);
    setPdfError(undefined);
    setIsGeneratingPdf(true);

    void Print.printToFileAsync({
      html,
      width: A4_PORTRAIT_WIDTH,
      height: A4_PORTRAIT_HEIGHT,
    })
      .then((result) => {
        if (latestGenerationRef.current?.key !== generationKey) return;
        setPdfUri(result.uri);
      })
      .catch((error: unknown) => {
        if (latestGenerationRef.current?.key !== generationKey) return;
        setPdfError(getPdfErrorMessage(error));
      })
      .finally(() => {
        if (latestGenerationRef.current?.key === generationKey) {
          setIsGeneratingPdf(false);
        }
      });
  }, [generationAttempt, html]);

  const retryPreview = () => {
    if (!isA4) return;
    void Promise.all([
      saleOrderQuery.refetch(),
      companyQuery.refetch(),
      configurationQuery.refetch(),
      companySettingsQuery.refetch(),
    ]);
  };

  const retryPdfGeneration = () => {
    setGenerationAttempt((currentAttempt) => currentAttempt + 1);
  };

  const downloadPdf = async () => {
    if (!pdfUri) return;

    try {
      if (!(await Sharing.isAvailableAsync())) {
        toast.error("Saving PDF is not available on this device");
        return;
      }

      // Share the displayed temporary file so download never creates a second layout.
      await Sharing.shareAsync(pdfUri, {
        mimeType: "application/pdf",
        dialogTitle: "Download Sale Order PDF",
      });
    } catch {
      toast.error("Could not download the PDF");
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader title="Print Preview" />

      <SaleOrderPrintPreview
        format={params.format}
        isLoading={isLoading}
        isError={isError}
        isGeneratingPdf={isGeneratingPdf}
        pdfUri={pdfUri}
        pdfError={pdfError}
        onRetry={retryPreview}
        onRetryPdfGeneration={retryPdfGeneration}
      />

      <PrintPreviewActions pdfUri={pdfUri} onDownload={downloadPdf} />
    </View>
  );
}
