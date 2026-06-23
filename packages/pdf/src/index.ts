export type PdfPlaceholder = Readonly<{
  packageName: "@termopane/pdf";
  status: "placeholder";
  bindsToQuoteVersion: true;
}>;

export function getPdfPlaceholder(): PdfPlaceholder {
  return Object.freeze({
    packageName: "@termopane/pdf",
    status: "placeholder",
    bindsToQuoteVersion: true,
  });
}
