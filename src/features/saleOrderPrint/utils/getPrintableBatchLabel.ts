/**
 * The saved document has a batch name, not a separate primary-batch flag.
 * Keep the conventional primary values out of printouts, but retain every
 * meaningful alternate batch so identical products remain distinguishable.
 */
export function getPrintableBatchLabel(batch?: string | null): string | null {
  const value = batch?.trim();

  if (!value || /^(primary|primary batch)$/i.test(value)) {
    return null;
  }

  return `Batch: ${value}`;
}
