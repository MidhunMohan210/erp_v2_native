import { PermissionsAndroid, Platform } from "react-native";
import RNBluetoothClassic from "react-native-bluetooth-classic";
import type { BluetoothDevice } from "react-native-bluetooth-classic";

export type BluetoothWriteEncoding =
  | "utf-8"
  | "ascii"
  | "utf8"
  | "utf16le"
  | "ucs2"
  | "ucs-2"
  | "base64"
  | "latin1"
  | "binary"
  | "hex";

export async function requestBluetoothPrinterPermission(): Promise<boolean> {
  if (Platform.OS !== "android") {
    return false;
  }

  if (Platform.Version >= 31) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    );

    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  return true;
}

export async function isBluetoothPrinterEnabled(): Promise<boolean> {
  return RNBluetoothClassic.isBluetoothEnabled();
}

export async function getBondedBluetoothPrinterDevices(): Promise<
  BluetoothDevice[]
> {
  return RNBluetoothClassic.getBondedDevices();
}

export async function isBluetoothPrinterConnected(
  device: BluetoothDevice,
): Promise<boolean> {
  return device.isConnected();
}

export async function connectBluetoothPrinter(
  device: BluetoothDevice,
): Promise<boolean> {
  const alreadyConnected = await isBluetoothPrinterConnected(device);

  if (alreadyConnected) {
    return true;
  }

  return device.connect();
}

export async function writeBluetoothPrinterData(
  device: BluetoothDevice,
  data: string,
  encoding?: BluetoothWriteEncoding,
): Promise<boolean> {
  return device.write(data, encoding);
}

export async function disconnectBluetoothPrinter(
  device: BluetoothDevice,
): Promise<boolean> {
  const connected = await isBluetoothPrinterConnected(device);

  if (!connected) {
    return true;
  }

  return device.disconnect();
}
