export type DrawingPlaceholder = Readonly<{
  packageName: "@termopane/drawing";
  status: "placeholder";
  supportedOutputs: readonly string[];
}>;

export function getDrawingPlaceholder(): DrawingPlaceholder {
  return Object.freeze({
    packageName: "@termopane/drawing",
    status: "placeholder",
    supportedOutputs: Object.freeze([]),
  });
}
