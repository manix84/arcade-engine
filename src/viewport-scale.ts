export interface ViewportScaleOptions {
  maxScale?: number;
  minScale?: number;
  referenceHeight?: number;
  referenceWidth?: number;
}

export interface ManualViewportScaleOptions extends ViewportScaleOptions {
  manualScale?: number;
}

export const defaultZoomMinPercent = 25;
export const defaultZoomMaxPercent = 250;
export const defaultZoomPercent = 100;
export const defaultZoomStepPercent = 5;

const defaultReferenceWidth = 800;
const defaultReferenceHeight = 600;

export const clampZoomPercent = (
  value: number,
  minPercent = defaultZoomMinPercent,
  maxPercent = defaultZoomMaxPercent
): number => Math.max(minPercent, Math.min(maxPercent, value));

export const getZoomScale = (
  percent: number,
  minPercent = defaultZoomMinPercent,
  maxPercent = defaultZoomMaxPercent
): number => clampZoomPercent(percent, minPercent, maxPercent) / 100;

export const getSteppedZoomPercent = (
  value: number,
  stepPercent = defaultZoomStepPercent,
  minPercent = defaultZoomMinPercent,
  maxPercent = defaultZoomMaxPercent
): number => {
  const stepped = Math.round(value / stepPercent) * stepPercent;

  return clampZoomPercent(stepped, minPercent, maxPercent);
};

export const formatZoomPercent = (percent: number): string =>
  `${Math.round(percent)}%`;

export const getViewportScale = (
  width: number,
  height: number,
  options: ViewportScaleOptions = {}
): number => {
  const referenceWidth = options.referenceWidth ?? defaultReferenceWidth;
  const referenceHeight = options.referenceHeight ?? defaultReferenceHeight;
  const minScale = options.minScale ?? 0;
  const maxScale = options.maxScale ?? Number.POSITIVE_INFINITY;
  const scale = Math.min(width / referenceWidth, height / referenceHeight);

  return Math.max(minScale, Math.min(maxScale, scale));
};

export const getManualViewportScale = (
  width: number,
  height: number,
  options: ManualViewportScaleOptions = {}
): number => getViewportScale(width, height, options) * (options.manualScale ?? 1);
