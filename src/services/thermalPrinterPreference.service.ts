import * as SecureStore from "expo-secure-store";

export type SavedThermalPrinter = {
  name: string;
  address: string;
};

const DEFAULT_THERMAL_PRINTER_KEY = "defaultThermalPrinter";

function parseSavedThermalPrinter(value: string): SavedThermalPrinter | undefined {
  try {
    const parsed = JSON.parse(value) as Partial<SavedThermalPrinter>;

    if (typeof parsed.address !== "string" || !parsed.address) {
      return undefined;
    }

    return {
      name: typeof parsed.name === "string" ? parsed.name : "Saved printer",
      address: parsed.address,
    };
  } catch {
    return undefined;
  }
}

export async function getDefaultThermalPrinter(): Promise<
  SavedThermalPrinter | undefined
> {
  const savedPrinter = await SecureStore.getItemAsync(DEFAULT_THERMAL_PRINTER_KEY);

  if (!savedPrinter) return undefined;

  return parseSavedThermalPrinter(savedPrinter);
}

export async function saveDefaultThermalPrinter(
  printer: SavedThermalPrinter,
): Promise<void> {
  await SecureStore.setItemAsync(
    DEFAULT_THERMAL_PRINTER_KEY,
    JSON.stringify(printer),
  );
}
