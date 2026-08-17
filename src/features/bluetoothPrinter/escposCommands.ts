export type EscPosAlignment = "left" | "center" | "right";

export type FixedWidthColumn = {
  text: string;
  width: number;
  align?: EscPosAlignment;
};

const ESC = "\x1B";
const GS = "\x1D";

export const ESC_POS_COMMANDS = {
  initialize: ESC + "@",
  alignLeft: ESC + "a" + "\x00",
  alignCenter: ESC + "a" + "\x01",
  alignRight: ESC + "a" + "\x02",
  boldOn: ESC + "E" + "\x01",
  boldOff: ESC + "E" + "\x00",
  fontA: ESC + "M" + "\x00",
  fontB: ESC + "M" + "\x01",
  normalSize: GS + "!" + "\x00",
  doubleSize: GS + "!" + "\x11",
};

export function lineFeed(count = 1): string {
  return "\r\n".repeat(Math.max(0, count));
}

export function createSeparator(width: number, character = "-"): string {
  return character.repeat(Math.max(0, width));
}

export function truncateText(text: string, width: number): string {
  if (width <= 0) return "";
  return text.length > width ? text.slice(0, width) : text;
}

export function padEndText(text: string, width: number): string {
  return truncateText(text, width).padEnd(width, " ");
}

export function padStartText(text: string, width: number): string {
  return truncateText(text, width).padStart(width, " ");
}

export function centerText(text: string, width: number): string {
  const clippedText = truncateText(text, width);
  const leftPadding = Math.floor((width - clippedText.length) / 2);
  return `${" ".repeat(Math.max(0, leftPadding))}${clippedText}`.padEnd(
    width,
    " ",
  );
}

export function wrapText(text: string, width: number): string[] {
  if (width <= 0) return [""];
  if (!text) return [""];

  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    if (word.length > width) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = "";
      }

      for (let index = 0; index < word.length; index += width) {
        lines.push(word.slice(index, index + width));
      }
      return;
    }

    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length > width) {
      lines.push(currentLine);
      currentLine = word;
      return;
    }

    currentLine = nextLine;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length ? lines : [""];
}

export function createFixedWidthLine(columns: FixedWidthColumn[]): string {
  return columns
    .map((column) => {
      if (column.align === "right") {
        return padStartText(column.text, column.width);
      }

      if (column.align === "center") {
        return centerText(column.text, column.width);
      }

      return padEndText(column.text, column.width);
    })
    .join("");
}
