import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print"; //converts HTML into a PDF file.
import { useLocalSearchParams } from "expo-router";
import { Platform, View } from "react-native";
import * as Sharing from "expo-sharing"; //opens the device share sheet for that generated PDF.
import { toast } from "sonner-native";
import type { BluetoothDevice } from "react-native-bluetooth-classic";

import { PrinterSelectionSheet } from "@/components/bluetoothPrinter/PrinterSelectionSheet";
import { PrintPreviewActions } from "@/components/saleOrderPrint/PrintPreviewActions";
import { SaleOrderPrintPreview } from "@/components/saleOrderPrint/SaleOrderPrintPreview";
import { ScreenHeader } from "@/components/ScreenHeader";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { buildSaleOrderEscPosReceipt } from "@/features/saleOrderPrint/escpos/buildSaleOrderEscPosReceipt";
import { createA4SaleOrderHtml } from "@/features/saleOrderPrint/templates/createA4SaleOrderHtml";
import { createThermal80SaleOrderHtml } from "@/features/saleOrderPrint/templates/createThermal80SaleOrderHtml";
import { buildSaleOrderThermalReceiptData } from "@/features/saleOrderPrint/utils/buildSaleOrderThermalReceiptData";
import { createSaleOrderPdfFileName } from "@/features/saleOrderPrint/utils/createSaleOrderPdfFileName";
import { useCompanySettingsQuery } from "@/hooks/queries/companySettingsQueries";
import { usePrintConfigurationQuery } from "@/hooks/queries/printConfigurationQueries";
import { useSaleOrderDetailQuery } from "@/hooks/queries/saleOrderQueries";
import {
  connectBluetoothPrinter,
  getBondedBluetoothPrinterDevices,
  isBluetoothPrinterEnabled,
  isBluetoothPrinterConnected,
  requestBluetoothPrinterPermission,
  writeBluetoothPrinterData,
} from "@/services/bluetoothPrinter.service";
import { companyService } from "@/services/company.service";
import {
  getDefaultThermalPrinter,
  saveDefaultThermalPrinter,
  type SavedThermalPrinter,
} from "@/services/thermalPrinterPreference.service";
import { useAppSelector } from "@/store/hooks";
import type { SaleOrderPrintFormat } from "@/types/saleOrderPrint";

// This stores a unique key for the PDF generation that is currently active.It is mainly used to stop the same PDF from being generated twice.
// {
//   key: "a4:0:<html>...</html>"
// }
type PdfGenerationRequest = {
  key: string;
};

type PrinterSelectionMode = "print" | "change";

// expo-print normally uses US Letter size.Therefore, you manually provide dimensions.
const A4_PORTRAIT_WIDTH = 595;
const A4_PORTRAIT_HEIGHT = 842;
const THERMAL_80_WIDTH = 227;
const THERMAL_80_HEIGHT = 595;

function getPdfErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "The A4 PDF could not be generated. Please try again.";
}

function getBluetoothDeviceName(device: BluetoothDevice): string {
  return device.name || "Bluetooth printer";
}

async function createNamedPdfCopy(
  pdfUri: string,
  fileName: string,
): Promise<string> {
  if (!FileSystem.cacheDirectory) return pdfUri;

  const namedPdfUri = `${FileSystem.cacheDirectory}${fileName}`;

  // Sharing reads the file name from its URI. This copies the existing PDF only;
  // it never creates another PDF layout or changes the previewed document.
  await FileSystem.copyAsync({ from: pdfUri, to: namedPdfUri });

  return namedPdfUri;
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
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isRestoringPrinter, setIsRestoringPrinter] = useState(false);
  const [isPrinterSelectionVisible, setIsPrinterSelectionVisible] =
    useState(false);
  const [savedPrinter, setSavedPrinter] = useState<SavedThermalPrinter>();
  const [printerSelectionMode, setPrinterSelectionMode] =
    useState<PrinterSelectionMode>();
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

  useEffect(() => {
    setIsPrinterSelectionVisible(false);
    setPrinterSelectionMode(undefined);
  }, [params.format, params.id]);

  useEffect(() => {
    let isActive = true;

    if (!isThermal80) {
      setSavedPrinter(undefined);
      setIsRestoringPrinter(false);
      return;
    }

    setIsRestoringPrinter(true);
    void getDefaultThermalPrinter()
      .then((printer) => {
        if (isActive) {
          setSavedPrinter(printer);
        }
      })
      .catch(() => {
        if (isActive) {
          toast.error("Could not restore the saved printer.");
        }
      })
      .finally(() => {
        if (isActive) {
          setIsRestoringPrinter(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [isThermal80]);

  const thermalReceiptData = useMemo(() => {
    if (
      !isThermal80 ||
      !saleOrderQuery.data ||
      !companyQuery.data ||
      !configurationQuery.data?.config
    ) {
      return undefined;
    }

    return buildSaleOrderThermalReceiptData({
      saleOrder: saleOrderQuery.data,
      company: companyQuery.data,
      configuration: configurationQuery.data.config,
    });
  }, [
    companyQuery.data,
    configurationQuery.data?.config,
    isThermal80,
    saleOrderQuery.data,
  ]);

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

  const pdfFileName = createSaleOrderPdfFileName(
    saleOrderQuery.data?.voucher_number,
    params.id,
  );

  const sharePdf = async () => {
    if (!pdfUri || isSharing || isDownloading) return;

    setIsSharing(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        toast.error("Sharing is not available on this device");
        return;
      }

      const namedPdfUri = await createNamedPdfCopy(pdfUri, pdfFileName);
      await Sharing.shareAsync(namedPdfUri, {
        mimeType: "application/pdf",
        dialogTitle: "Share Sale Order PDF",
        UTI: "com.adobe.pdf",
      });
    } catch {
      toast.error("Could not share the PDF");
    } finally {
      setIsSharing(false);
    }
  };

  const downloadPdf = async () => {
    if (!pdfUri || isDownloading || isSharing) return;

    setIsDownloading(true);
    try {
      if (Platform.OS === "android") {
        //Ask the user to choose a folder
        // The returned result may look like:
        // {
        // granted: true,
        // directoryUri: "content://..."
        //}

        const permissions =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

        // The Android folder picker returns granted: false when the user cancels.
        if (!permissions.granted) return;

        // Read the temporary PDF,The PDF already exists at pdfUri.A PDF is binary data, so it cannot safely be copied as normal text.Base64 converts the binary PDF into a text representation that can safely be read and written.
        const pdfContent = await FileSystem.readAsStringAsync(pdfUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        //This creates a new PDF file in the folder selected by the user.
        const destinationUri =
          await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            pdfFileName.replace(/\.pdf$/i, ""),
            "application/pdf",
          );

        ///This writes the Base64 PDF content into the newly created destination file.
        // Temporary PDF
        // ↓ read as Base64
        // Base64 content
        // ↓ write as Base64
        // Selected folder/new PDF file
        //The PDF shown in preview is therefore copied into the user's selected folder.It is not regenerated.

        await FileSystem.writeAsStringAsync(destinationUri, pdfContent, {
          encoding: FileSystem.EncodingType.Base64,
        });
        toast.success("PDF saved successfully");
        return;
      }

      if (!(await Sharing.isAvailableAsync())) {
        toast.error("Saving PDF is not available on this device");
        return;
      }

      // iOS exposes Save to Files from the native system sheet.
      // Create a temporary copy with a readable filename so the saved/shared PDF
      // uses the sale order filename instead of Expo's randomly generated name.
      const namedPdfUri = await createNamedPdfCopy(pdfUri, pdfFileName);

      // Open the native iOS share sheet, where the user can choose “Save to Files”
      // or share the PDF through another supported app.
      await Sharing.shareAsync(namedPdfUri, {
        mimeType: "application/pdf",
        dialogTitle: "Save Sale Order PDF",
        UTI: "com.adobe.pdf",
      });
    } catch {
      toast.error("Could not download the PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  const loadBondedDevicesForPrinting = async () => {
    const permissionGranted = await requestBluetoothPrinterPermission();

    if (!permissionGranted) {
      toast.error("Bluetooth permission is required to print.");
      return undefined;
    }

    const bluetoothEnabled = await isBluetoothPrinterEnabled();

    if (!bluetoothEnabled) {
      toast.error("Bluetooth is turned off. Turn on Bluetooth and try again.");
      return undefined;
    }

    return getBondedBluetoothPrinterDevices();
  };

  const printThermalReceipt = async (device: BluetoothDevice) => {
    if (!thermalReceiptData || isPrinting) return;

    setIsPrinting(true);
    try {
      const alreadyConnected = await isBluetoothPrinterConnected(device);
      const connected =
        alreadyConnected || (await connectBluetoothPrinter(device));

      if (!connected) {
        toast.error(
          "Unable to connect to the printer. Check that the printer is turned on and nearby, then try again.",
        );
        return;
      }

      const receipt = buildSaleOrderEscPosReceipt(thermalReceiptData);
      const printSent = await writeBluetoothPrinterData(
        device,
        receipt,
        "ascii",
      );

      if (printSent) {
        toast.success("Sale order sent to printer");
        return;
      }

      toast.error(
        "Unable to send the print job. Please check the printer connection and try again.",
      );
    } catch {
      toast.error(
        "Unable to connect to the printer. Check that the printer is turned on and nearby, then try again.",
      );
    } finally {
      setIsPrinting(false);
    }
  };

  const openPrinterSelection = (mode: PrinterSelectionMode) => {
    setPrinterSelectionMode(mode);
    setIsPrinterSelectionVisible(true);
  };

  const handlePrint = async () => {
    if (!isThermal80 || !thermalReceiptData || isPrinting) {
      return;
    }

    if (!savedPrinter) {
      openPrinterSelection("print");
      return;
    }

    const bondedDevices = await loadBondedDevicesForPrinting();

    if (!bondedDevices) return;

    const savedBondedDevice = bondedDevices.find(
      (device) => device.address === savedPrinter.address,
    );

    if (!savedBondedDevice) {
      toast.error(
        "The selected printer is no longer available. Please select another printer.",
      );
      openPrinterSelection("print");
      return;
    }

    void printThermalReceipt(savedBondedDevice);
  };

  const handleChangePrinter = () => {
    if (!isThermal80 || isPrinting || isRestoringPrinter) return;
    openPrinterSelection("change");
  };

  const handlePrinterConnected = async (device: BluetoothDevice) => {
    const nextSavedPrinter = {
      name: getBluetoothDeviceName(device),
      address: device.address,
    };

    try {
      await saveDefaultThermalPrinter(nextSavedPrinter);
    } catch {
      toast.error("Could not save the selected printer.");
      return;
    }

    setSavedPrinter(nextSavedPrinter);

    if (printerSelectionMode === "change") {
      setPrinterSelectionMode(undefined);
      toast.success(`${nextSavedPrinter.name} saved as default printer`);
      return;
    }

    setPrinterSelectionMode(undefined);
    void printThermalReceipt(device);
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

      <PrintPreviewActions
        pdfUri={pdfUri}
        isDownloading={isDownloading}
        isSharing={isSharing}
        canPrint={Boolean(
          isThermal80 && thermalReceiptData && pdfUri && !isRestoringPrinter,
        )}
        isPrinting={isPrinting}
        printerName={savedPrinter?.name}
        onChangePrinter={isThermal80 ? handleChangePrinter : undefined}
        onDownload={downloadPdf}
        onShare={sharePdf}
        onPrint={() => void handlePrint()}
      />

      <PrinterSelectionSheet
        visible={isPrinterSelectionVisible}
        onClose={() => setIsPrinterSelectionVisible(false)}
        onPrinterConnected={handlePrinterConnected}
      />
    </View>
  );
}
