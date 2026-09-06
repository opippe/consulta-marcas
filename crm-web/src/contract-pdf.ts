import {
  PDFDocument,
  PageSizes,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

export type ContractPdfInput = {
  number: number;
  title: string;
  content: string;
  contactName: string;
  brandName: string;
  segment: string;
  totalCents: number;
  validUntil: string;
  createdAt?: Date | string | null;
};

const pageMargin = 64;
const ink = rgb(0.12, 0.12, 0.12);
const mutedInk = rgb(0.38, 0.38, 0.38);
const rule = rgb(0.72, 0.72, 0.72);

function sanitizeText(value: string) {
  return value
    .replace(/[—–]/g, "-")
    .replace(/×/g, "x")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, "...")
    .replace(/•/g, "-")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
    .replace(/[^\u0009\u000A\u000D\u0020-\u00FF]/g, "");
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDate(value: string | Date) {
  const date =
    typeof value === "string"
      ? value.includes("T")
        ? new Date(value)
        : new Date(`${value}T12:00:00Z`)
      : new Date(value);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function widthOf(text: string, font: PDFFont, size: number) {
  return font.widthOfTextAtSize(sanitizeText(text), size);
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
) {
  const normalized = sanitizeText(text).trim();
  if (!normalized) return [""];

  const words = normalized.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (widthOf(candidate, font, size) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) lines.push(current);

    if (widthOf(word, font, size) <= maxWidth) {
      current = word;
      continue;
    }

    let chunk = "";
    for (const character of word) {
      const candidateChunk = `${chunk}${character}`;
      if (widthOf(candidateChunk, font, size) > maxWidth && chunk) {
        lines.push(chunk);
        chunk = character;
      } else {
        chunk = candidateChunk;
      }
    }
    current = chunk;
  }

  if (current) lines.push(current);
  return lines;
}

function drawRightAligned(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  right: number,
  y: number,
  color = ink,
) {
  const safeText = sanitizeText(text);
  page.drawText(safeText, {
    x: right - widthOf(safeText, font, size),
    y,
    font,
    size,
    color,
  });
}

function drawCentered(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  y: number,
  color = ink,
) {
  const safeText = sanitizeText(text);
  page.drawText(safeText, {
    x: (page.getWidth() - widthOf(safeText, font, size)) / 2,
    y,
    font,
    size,
    color,
  });
}

export async function createContractPdf(input: ContractPdfInput) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(sanitizeText(input.title));
  pdf.setSubject(`Contrato C-${String(input.number).padStart(6, "0")}`);
  pdf.setAuthor("55 Marcas");
  pdf.setCreator("55 Marcas");
  const roman = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const italic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);

  const pages: PDFPage[] = [];
  const pageWidth = PageSizes.A4[0];
  const pageHeight = PageSizes.A4[1];
  const contentWidth = pageWidth - pageMargin * 2;
  let page = pdf.addPage(PageSizes.A4);
  pages.push(page);
  let cursorY = pageHeight - 52;

  const drawFooter = (targetPage: PDFPage, number: number) => {
    targetPage.drawLine({
      start: { x: pageMargin, y: 42 },
      end: { x: pageWidth - pageMargin, y: 42 },
      thickness: 0.5,
      color: rule,
    });
    targetPage.drawText("55 Marcas - Contrato de prestação de serviços", {
      x: pageMargin,
      y: 27,
      font: sans,
      size: 7.5,
      color: mutedInk,
    });
    drawRightAligned(
      targetPage,
      `Pagina ${number}`,
      sans,
      7.5,
      pageWidth - pageMargin,
      27,
      mutedInk,
    );
  };

  const drawContinuationHeader = (targetPage: PDFPage) => {
    targetPage.drawText("55 MARCAS", {
      x: pageMargin,
      y: pageHeight - 42,
      font: bold,
      size: 9,
      color: ink,
    });
    drawRightAligned(
      targetPage,
      `Contrato C-${String(input.number).padStart(6, "0")}`,
      sans,
      8,
      pageWidth - pageMargin,
      pageHeight - 42,
      mutedInk,
    );
    targetPage.drawLine({
      start: { x: pageMargin, y: pageHeight - 54 },
      end: { x: pageWidth - pageMargin, y: pageHeight - 54 },
      thickness: 0.6,
      color: rule,
    });
  };

  const addPage = () => {
    page = pdf.addPage(PageSizes.A4);
    pages.push(page);
    cursorY = pageHeight - 76;
    drawContinuationHeader(page);
  };

  const ensureSpace = (height: number) => {
    if (cursorY - height < 62) addPage();
  };

  page.drawText("55 MARCAS", {
    x: pageMargin,
    y: cursorY,
    font: bold,
    size: 12,
    color: ink,
  });
  drawRightAligned(
    page,
    `Contrato C-${String(input.number).padStart(6, "0")}`,
    sans,
    9,
    pageWidth - pageMargin,
    cursorY + 1,
    mutedInk,
  );
  cursorY -= 18;
  page.drawLine({
    start: { x: pageMargin, y: cursorY },
    end: { x: pageWidth - pageMargin, y: cursorY },
    thickness: 1,
    color: ink,
  });
  cursorY -= 38;

  const titleLines = wrapText(
    input.title.toUpperCase(),
    bold,
    15,
    contentWidth,
  );
  for (const line of titleLines) {
    drawCentered(page, line, bold, 15, cursorY);
    cursorY -= 18;
  }
  cursorY -= 2;
  drawCentered(
    page,
    "Prestação de serviços para registro de marca",
    italic,
    10,
    cursorY,
    mutedInk,
  );
  cursorY -= 28;
  page.drawLine({
    start: { x: pageMargin, y: cursorY },
    end: { x: pageWidth - pageMargin, y: cursorY },
    thickness: 0.6,
    color: rule,
  });
  cursorY -= 24;

  const summaryRows = [
    ["Contratante", input.contactName],
    ["Marca", input.brandName],
    ["Segmento", input.segment],
    ["Valor total", formatMoney(input.totalCents)],
    ["Validade da condição comercial", formatDate(input.validUntil)],
    ...(input.createdAt
      ? [["Data de emissão", formatDate(input.createdAt)]]
      : []),
  ];
  for (const [label, value] of summaryRows) {
    ensureSpace(16);
    page.drawText(`${sanitizeText(label)}:`, {
      x: pageMargin,
      y: cursorY,
      font: bold,
      size: 9,
      color: ink,
    });
    page.drawText(sanitizeText(value), {
      x: pageMargin + 142,
      y: cursorY,
      font: roman,
      size: 9,
      color: ink,
    });
    cursorY -= 15;
  }
  cursorY -= 18;

  const lines = input.content.split(/\r?\n/);
  lines.forEach((rawLine, index) => {
    const normalized = sanitizeText(rawLine).trim();
    if (index === 0 && /^CONTRATO DE PRESTA/i.test(normalized)) {
      cursorY -= 4;
      return;
    }
    if (!normalized) {
      cursorY -= 8;
      return;
    }

    const isNumberedHeading =
      /^\d+\.\s/.test(normalized) && normalized === normalized.toUpperCase();
    const isHeading =
      isNumberedHeading ||
      /^(CONTRATANTE|CONTRATADA|ASSINATURAS|CONTRATO DE)/i.test(normalized);
    const font = isHeading ? bold : roman;
    const size = isHeading ? 10.5 : 10;
    const lineHeight = isHeading ? 16 : 14.5;
    const wrapped = wrapText(normalized, font, size, contentWidth);
    for (const line of wrapped) {
      ensureSpace(lineHeight);
      page.drawText(line, {
        x: pageMargin,
        y: cursorY,
        font,
        size,
        color: ink,
      });
      cursorY -= lineHeight;
    }
  });

  ensureSpace(150);
  cursorY -= 14;
  drawCentered(page, "ASSINATURAS", bold, 11, cursorY);
  cursorY -= 24;

  page.drawText("Local e data: ________________________________________________", {
    x: pageMargin,
    y: cursorY,
    font: roman,
    size: 9,
    color: ink,
  });
  cursorY -= 31;

  const signatureGap = 28;
  const signatureWidth = (contentWidth - signatureGap) / 2;
  const rightSignatureX = pageMargin + signatureWidth + signatureGap;
  const signatureLineY = cursorY - 18;
  page.drawLine({
    start: { x: pageMargin, y: signatureLineY },
    end: { x: pageMargin + signatureWidth, y: signatureLineY },
    thickness: 0.7,
    color: ink,
  });
  page.drawLine({
    start: { x: rightSignatureX, y: signatureLineY },
    end: { x: pageWidth - pageMargin, y: signatureLineY },
    thickness: 0.7,
    color: ink,
  });
  page.drawText("CONTRATANTE", {
    x: pageMargin,
    y: signatureLineY - 15,
    font: bold,
    size: 8.5,
    color: ink,
  });
  page.drawText("CONTRATADA - 55 MARCAS", {
    x: rightSignatureX,
    y: signatureLineY - 15,
    font: bold,
    size: 8.5,
    color: ink,
  });

  pages.forEach((targetPage, index) => drawFooter(targetPage, index + 1));
  return pdf.save();
}

export async function downloadContractPdf(
  input: ContractPdfInput,
  filename: string,
) {
  const bytes = await createContractPdf(input);
  const blobBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(blobBuffer).set(bytes);
  const blob = new Blob([blobBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
