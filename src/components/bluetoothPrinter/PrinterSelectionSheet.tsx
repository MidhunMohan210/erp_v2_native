import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Bluetooth, CheckCircle2, RefreshCcw, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BluetoothDevice } from "react-native-bluetooth-classic";

import {
  connectBluetoothPrinter,
  getBondedBluetoothPrinterDevices,
  isBluetoothPrinterConnected,
  isBluetoothPrinterEnabled,
  requestBluetoothPrinterPermission,
} from "@/services/bluetoothPrinter.service";

const PRINTER_SHEET_SNAP_POINTS = ["82%"];

type PrinterSelectionSheetProps = {
  visible: boolean;
  onClose: () => void;
  onPrinterConnected: (device: BluetoothDevice) => void;
};

function getDeviceLabel(device: BluetoothDevice): string {
  return device.name || "Unknown printer";
}

function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Could not complete Bluetooth printer setup.";
  }

  const message = error.message.toLowerCase();

  if (
    message.includes("socket") ||
    message.includes("timeout") ||
    message.includes("read failed") ||
    message.includes("connection")
  ) {
    return "Unable to connect to the printer. Check that it is turned on and nearby, then try again.";
  }

  if (message.includes("permission")) {
    return "Bluetooth permission is required to print.";
  }

  if (message.includes("bluetooth") && message.includes("off")) {
    return "Bluetooth is turned off. Turn on Bluetooth and try again.";
  }

  return "Could not complete Bluetooth printer setup. Please try again.";
}

export function PrinterSelectionSheet({
  visible,
  onClose,
  onPrinterConnected,
}: PrinterSelectionSheetProps) {
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);
  const isPresentedRef = useRef(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [connectingDeviceAddress, setConnectingDeviceAddress] = useState("");
  const [connectedDeviceAddress, setConnectedDeviceAddress] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadBondedDevices = async () => {
    try {
      setIsLoadingDevices(true);
      setErrorMessage("");

      const permissionGranted = await requestBluetoothPrinterPermission();

      if (!permissionGranted) {
        setDevices([]);
        setErrorMessage("Bluetooth permission is required to print.");
        return;
      }

      const bluetoothEnabled = await isBluetoothPrinterEnabled();

      if (!bluetoothEnabled) {
        setDevices([]);
        setErrorMessage("Bluetooth is turned off. Turn on Bluetooth and try again.");
        return;
      }

      const bondedDevices = await getBondedBluetoothPrinterDevices();
      setDevices(bondedDevices);

      if (bondedDevices.length === 0) {
        setErrorMessage("No paired Bluetooth devices were found.");
      }
    } catch (error) {
      setDevices([]);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoadingDevices(false);
    }
  };

  useEffect(() => {
    if (visible) {
      isPresentedRef.current = true;
      sheetRef.current?.present();
      void loadBondedDevices();
      return;
    }

    if (isPresentedRef.current) {
      isPresentedRef.current = false;
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  const closeSheet = () => {
    isPresentedRef.current = false;
    sheetRef.current?.dismiss();
  };

  const handleDismiss = () => {
    isPresentedRef.current = false;
    onClose();
  };

  const connectToDevice = async (device: BluetoothDevice) => {
    try {
      setConnectingDeviceAddress(device.address);
      setErrorMessage("");

      const alreadyConnected = await isBluetoothPrinterConnected(device);
      const connected = alreadyConnected || (await connectBluetoothPrinter(device));

      if (!connected) {
        setErrorMessage(
          "Unable to connect to the printer. Check that it is turned on and nearby, then try again.",
        );
        return;
      }

      setConnectedDeviceAddress(device.address);
      onPrinterConnected(device);
      closeSheet();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setConnectingDeviceAddress("");
    }
  };

  const renderListHeader = () => (
    <View>
      <View className="mb-5 flex-row items-start">
        <View className="flex-1 pr-4">
          <Text className="text-[19px] font-extrabold text-slate-900">
            Select printer
          </Text>
          <Text className="mt-1 text-[12px] leading-5 text-slate-500">
            Choose a paired Bluetooth thermal printer.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close printer selection"
          hitSlop={8}
          onPress={closeSheet}
          className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
        >
          <X color="#475569" size={19} strokeWidth={2.2} />
        </Pressable>
      </View>

      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-[11px] font-bold uppercase tracking-[0.8px] text-slate-400">
          Paired devices
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh paired printers"
          disabled={isLoadingDevices || Boolean(connectingDeviceAddress)}
          onPress={() => void loadBondedDevices()}
          className="flex-row items-center rounded-xl border border-[#134074] bg-white px-3 py-2"
        >
          {isLoadingDevices ? (
            <ActivityIndicator color="#134074" size="small" />
          ) : (
            <RefreshCcw color="#134074" size={14} strokeWidth={2.4} />
          )}
          <Text className="ml-1.5 text-[11px] font-extrabold text-[#134074]">
            Refresh
          </Text>
        </Pressable>
      </View>

      {errorMessage ? (
        <View className="mb-3 rounded-2xl border border-rose-100 bg-rose-50 p-3">
          <Text className="text-[12px] font-semibold text-rose-700">
            {errorMessage}
          </Text>
        </View>
      ) : null}
    </View>
  );

  const renderEmptyList = () => {
    if (isLoadingDevices) {
      return (
        <View className="items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8">
          <ActivityIndicator color="#134074" size="small" />
          <Text className="mt-2 text-[12px] font-semibold text-slate-500">
            Loading paired devices...
          </Text>
        </View>
      );
    }

    if (errorMessage) return null;

    return (
      <View className="items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8">
        <Text className="text-center text-[12px] font-semibold text-slate-500">
          No paired Bluetooth devices were found.
        </Text>
      </View>
    );
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      enablePanDownToClose
      enableDynamicSizing={false}
      onDismiss={handleDismiss}
      snapPoints={PRINTER_SHEET_SNAP_POINTS}
      handleIndicatorStyle={{ backgroundColor: "#cbd5e1", width: 40 }}
      backgroundStyle={{ backgroundColor: "#ffffff", borderRadius: 28 }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.4}
          pressBehavior="close"
        />
      )}
    >
      <BottomSheetFlatList
        data={isLoadingDevices ? [] : devices}
        keyExtractor={(device) => device.address}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmptyList}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 20,
          paddingTop: 8,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        renderItem={({ item: device }) => {
          const isConnecting = connectingDeviceAddress === device.address;
          const isConnected = connectedDeviceAddress === device.address;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Connect to ${getDeviceLabel(device)}`}
              accessibilityState={{ busy: isConnecting }}
              disabled={Boolean(connectingDeviceAddress)}
              onPress={() => void connectToDevice(device)}
              className="mb-3 flex-row items-center rounded-2xl border border-slate-200 bg-white p-4"
            >
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-[#134074]/[0.08]">
                {isConnected ? (
                  <CheckCircle2 color="#15803d" size={21} strokeWidth={2.2} />
                ) : (
                  <Bluetooth color="#134074" size={21} strokeWidth={2.2} />
                )}
              </View>

              <View className="ml-3 min-w-0 flex-1">
                <Text
                  numberOfLines={1}
                  className="text-[14px] font-extrabold text-slate-900"
                >
                  {getDeviceLabel(device)}
                </Text>
                <Text
                  numberOfLines={1}
                  className="mt-1 text-[11px] font-semibold text-slate-500"
                >
                  {device.address}
                </Text>
              </View>

              {isConnecting ? (
                <ActivityIndicator color="#134074" size="small" />
              ) : (
                <Text className="ml-3 text-[12px] font-extrabold text-[#134074]">
                  Connect
                </Text>
              )}
            </Pressable>
          );
        }}
      />
    </BottomSheetModal>
  );
}
