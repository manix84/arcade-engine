import type { Coordinates } from "./types.js";

export interface DistanceGainOptions {
  distance: number;
  maxDistance: number;
  minDistance?: number;
  rolloff?: number;
}

export interface SpatialAudioMixOptions {
  listener?: Coordinates;
  listenerRange: number;
  maxDistance: number;
  minDistance?: number;
  rolloff?: number;
  source: Coordinates;
}

export interface SpatialAudioMix {
  distance: number;
  gain: number;
  pan: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const getDistanceGain = ({
  distance,
  maxDistance,
  minDistance = 0,
  rolloff = 1,
}: DistanceGainOptions): number => {
  if (maxDistance <= minDistance) {
    throw new Error("Max distance must be greater than min distance.");
  }

  const progress = clamp(
    (distance - minDistance) / (maxDistance - minDistance),
    0,
    1
  );

  return (1 - progress) ** rolloff;
};

export const getSpatialAudioMix = ({
  listener = { posX: 0, posY: 0 },
  listenerRange,
  maxDistance,
  minDistance,
  rolloff,
  source,
}: SpatialAudioMixOptions): SpatialAudioMix => {
  if (listenerRange <= 0) {
    throw new Error("Listener range must be greater than 0.");
  }

  const dx = source.posX - listener.posX;
  const dy = source.posY - listener.posY;
  const distance = Math.hypot(dx, dy);

  return {
    distance,
    gain: getDistanceGain({ distance, maxDistance, minDistance, rolloff }),
    pan: clamp(dx / listenerRange, -1, 1),
  };
};
