import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as Print from "expo-print"; //converts HTML into a PDF file.
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import * as Sharing from "expo-sharing"; //opens the device share sheet for that generated PDF.
import { toast } from "sonner-native";

import { PrintPreviewActions } from "@/components/saleOrderPrint/PrintPreviewActions";
import { SaleOrderPrintPreview } from "@/components/saleOrderPrint/SaleOrderPrintPreview";
import { ScreenHeader } from "@/components/ScreenHeader";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { createA4SaleOrderHtml } from "@/features/saleOrderPrint/templates/createA4SaleOrderHtml";
import { createThermal80SaleOrderHtml } from "@/features/saleOrderPrint/templates/createThermal80SaleOrderHtml";
import { useCompanySettingsQuery } from "@/hooks/queries/companySettingsQueries";
import { usePrintConfigurationQuery } from "@/hooks/queries/printConfigurationQueries";
import { useSaleOrderDetailQuery } from "@/hooks/queries/saleOrderQueries";
import { companyService } from "@/services/company.service";
import { useAppSelector } from "@/store/hooks";
import type { SaleOrderPrintFormat } from "@/types/saleOrderPrint";

// This stores a unique key for the PDF generation that is currently active.It is mainly used to stop the same PDF from being generated twice.
// {
//   key: "a4:0:<html>...</html>"
// }
type PdfGenerationRequest = {
  key: string;
};

// expo-print normally uses US Letter size.Therefore, you manually provide dimensions.
const A4_PORTRAIT_WIDTH = 595;
const A4_PORTRAIT_HEIGHT = 842;
const THERMAL_80_WIDTH = 227;
const THERMAL_80_HEIGHT = 595;

function getPdfErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "The A4 PDF could not be generated. Please try again.";
}

export default function SaleOrderPrintPreviewScreen() {
  // flow
  // Load sale-order data
  //         ↓
  // Create HTML
  //         ↓
  // Generate temporary PDF
  //         ↓
  // Show that PDF in preview
  //         ↓
  // User clicks Download
  //         ↓
  // Save/share the same PDF
  const params = useLocalSearchParams<{
    id?: string;
    format?: SaleOrderPrintFormat;
  }>();
  const selectedCompany = useAppSelector(
    (state) => state.company.selectedCompany,
  );
  const companyId = selectedCompany?._id ?? "";
  const isA4 = params.format === "a4";
  const isThermal80 = params.format === "thermal80";
  const isPrintableFormat = isA4 || isThermal80;
  const canLoadDocument = Boolean(isPrintableFormat && params.id && companyId);
  const [pdfUri, setPdfUri] = useState<string>(); //Stores the path of the generated temporary PDF.
  const [pdfError, setPdfError] = useState<string>(); //Stores an error message when PDF generation fails.
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false); //Tells the UI whether PDF generation is currently running.
  const [generationAttempt, setGenerationAttempt] = useState(0); //Used to manually trigger PDF generation again.
  const latestGenerationRef = useRef<PdfGenerationRequest | undefined>(
    undefined,
  ); //This stores the latest PDF generation key.

  const saleOrderQuery = useSaleOrderDetailQuery(
    params.id ?? "",
    companyId,
    canLoadDocument,
  );

  /// for getting company details
  const companyQuery = useQuery({
    queryKey: [...QUERY_KEYS.companies, "detail", companyId],
    queryFn: () => companyService.getCompanyById(companyId),
    enabled: canLoadDocument,
    staleTime: 60_000,
  });

  /// for getting print configuration for sale order printing
  const configurationQuery = usePrintConfigurationQuery(
    companyId,
    "sale_order",
    canLoadDocument,
  );

  /// for getting terms and conditions and default bank account for a4 printing
  const companySettingsQuery = useCompanySettingsQuery(
    companyId,
    isA4 && canLoadDocument,
  );

  const html = useMemo(() => {
    if (
      !isPrintableFormat ||
      !saleOrderQuery.data ||
      !companyQuery.data ||
      !configurationQuery.data?.config ||
      (isA4 && companySettingsQuery.isLoading)
    ) {
      return undefined;
    }

    if (isThermal80) {
      return createThermal80SaleOrderHtml({
        saleOrder: saleOrderQuery.data,
        company: companyQuery.data,
        configuration: configurationQuery.data.config,
      });
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
    isPrintableFormat,
    isThermal80,
    saleOrderQuery.data,
  ]);

  const isLoading =
    isPrintableFormat &&
    canLoadDocument &&
    (saleOrderQuery.isLoading ||
      companyQuery.isLoading ||
      configurationQuery.isLoading ||
      (isA4 && companySettingsQuery.isLoading));
  const isError =
    (isPrintableFormat && !canLoadDocument) ||
    saleOrderQuery.isError ||
    companyQuery.isError ||
    configurationQuery.isError ||
    (isA4 && companySettingsQuery.isError);

  ///Generating the PDF
  useEffect(() => {
    // When HTML does not exist yet, the page clears the previous PDF state.
    // This prevents the screen from showing an old PDF while new data is loading.
    if (!html) {
      setPdfUri(undefined);
      setPdfError(undefined);
      setIsGeneratingPdf(false);
      return;
    }
    //Creating a unique generation key the key contains the format, generation attempt, and HTML content. This ensures that if any of these change, a new PDF generation will be triggered.
    const generationKey = `${params.format}:${generationAttempt}:${html}`;

    //If the latest generation key is the same as the current one, the PDF is already being generated.Preventing duplicate generation
    if (latestGenerationRef.current?.key === generationKey) return;

    // On the first run,
    latestGenerationRef.current = { key: generationKey };
    //On the second run, the same key is found, so it returns without generating another PDF.

    //Before creating the new PDF:
    // Remember the active request.
    // Remove the old PDF URI.
    // Remove the previous error.
    // Show the PDF-generation loading state.
    setPdfUri(undefined);
    setPdfError(undefined);
    setIsGeneratingPdf(true);

    //printToFileAsync converts the HTML into a temporary PDF file.
    void Print.printToFileAsync({
      html,
      width: isThermal80 ? THERMAL_80_WIDTH : A4_PORTRAIT_WIDTH,
      height: isThermal80 ? THERMAL_80_HEIGHT : A4_PORTRAIT_HEIGHT,
    })
      .then((result) => {
        // Before storing the PDF URI, it checks whether this is still the latest request.
        // This protects against a race condition.
        // Example race condition
        // PDF A starts generating.
        // Data changes.
        // PDF B starts generating.
        // PDF B finishes.
        // PDF A finishes later.
        // Without the key check, the older PDF A could replace the newer PDF B.
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
  }, [generationAttempt, html, isThermal80, params.format]);

  const retryPreview = () => {
    if (!isPrintableFormat) return;
    void Promise.all([
      saleOrderQuery.refetch(),
      companyQuery.refetch(),
      configurationQuery.refetch(),
      ...(isA4 ? [companySettingsQuery.refetch()] : []),
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
