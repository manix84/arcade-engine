export type RayTracingPoint = {
  x: number;
  y: number;
};

export type RayTracingBounds = {
  height: number;
  surfaceColor?: string;
  width: number;
  x?: number;
  y?: number;
};

export type RayTracingSegment = {
  from: RayTracingPoint;
  surfaceColor?: string;
  to: RayTracingPoint;
};

export type RayTracingPolygon = readonly RayTracingPoint[];

export type RayTracingSurface = {
  polygon: RayTracingPolygon;
  surfaceColor?: string;
};

export type RayTracingHit = RayTracingPoint & {
  angle: number;
  distance: number;
  segment: RayTracingSegment;
};

export type RayTracingBounce = {
  color?: string;
  hits: RayTracingHit[];
  intensity: number;
  level: number;
  origin: RayTracingPoint;
};

export type RayTracingBounceOptions = {
  attenuation?: number;
  bounces?: number;
  lightColor?: string;
  maxOriginsPerBounce?: number;
  surfaceColorMix?: number;
  surfaceOffset?: number;
};

const rayAngleEpsilon = 0.00001;
const pointComparisonEpsilon = 0.0001;
const maxRayTracingBounces = 3;
const hexColorPattern = /^#?([\da-f]{3}|[\da-f]{6})$/i;

const normalizeHexColor = (color: string): string | undefined => {
  const match = hexColorPattern.exec(color.trim());
  const value = match?.[1];

  if (!value) {
    return undefined;
  }

  if (value.length === 3) {
    return `#${value
      .split("")
      .map((part) => part + part)
      .join("")}`;
  }

  return `#${value}`;
};

const parseRayTracingHexColor = (color: string): [number, number, number] | undefined => {
  const normalized = normalizeHexColor(color);

  if (!normalized) {
    return undefined;
  }

  const value = Number.parseInt(normalized.slice(1), 16);

  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const toRayTracingHexColor = ([red, green, blue]: [number, number, number]): string =>
  `#${[red, green, blue]
    .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0"))
    .join("")}`;

const mixRayTracingColors = (
  baseColor: string | undefined,
  surfaceColor: string | undefined,
  surfaceMix: number
): string | undefined => {
  if (!baseColor || !surfaceColor) {
    return baseColor ?? surfaceColor;
  }

  const base = parseRayTracingHexColor(baseColor);
  const surface = parseRayTracingHexColor(surfaceColor);

  if (!base || !surface) {
    return baseColor;
  }

  const mix = Math.max(0, Math.min(1, surfaceMix));

  return toRayTracingHexColor([
    base[0] * (1 - mix) + surface[0] * mix,
    base[1] * (1 - mix) + surface[1] * mix,
    base[2] * (1 - mix) + surface[2] * mix,
  ]);
};

export const createRayTracingRectangle = (
  x: number,
  y: number,
  width: number,
  height: number
): RayTracingPolygon => [
  { x, y },
  { x: x + width, y },
  { x: x + width, y: y + height },
  { x, y: y + height },
];

export const createRayTracingBoundsPolygon = (
  bounds: RayTracingBounds
): RayTracingPolygon => {
  const x = bounds.x ?? 0;
  const y = bounds.y ?? 0;

  return createRayTracingRectangle(x, y, bounds.width, bounds.height);
};

export const getRayTracingPolygonSegments = (
  polygon: RayTracingPolygon,
  surfaceColor?: string
): RayTracingSegment[] =>
  polygon.map((point, index) => ({
    from: point,
    surfaceColor,
    to: polygon[(index + 1) % polygon.length] ?? point,
  }));

const isRayTracingSurface = (
  occluder: RayTracingPolygon | RayTracingSurface
): occluder is RayTracingSurface => !Array.isArray(occluder);

const getRayTracingOccluderPolygon = (
  occluder: RayTracingPolygon | RayTracingSurface
): RayTracingPolygon => isRayTracingSurface(occluder) ? occluder.polygon : occluder;

const getRayTracingOccluderSurfaceColor = (
  occluder: RayTracingPolygon | RayTracingSurface
): string | undefined => isRayTracingSurface(occluder) ? occluder.surfaceColor : undefined;

export const getRayTracingSegments = (
  bounds: RayTracingBounds,
  occluders: readonly (RayTracingPolygon | RayTracingSurface)[] = []
): RayTracingSegment[] => [
  ...getRayTracingPolygonSegments(createRayTracingBoundsPolygon(bounds), bounds.surfaceColor),
  ...occluders.flatMap((occluder) =>
    getRayTracingPolygonSegments(
      getRayTracingOccluderPolygon(occluder),
      getRayTracingOccluderSurfaceColor(occluder)
    )
  ),
];

export const traceRay = (
  origin: RayTracingPoint,
  angle: number,
  segments: readonly RayTracingSegment[]
): RayTracingHit | undefined => {
  const rayDirection = {
    x: Math.cos(angle),
    y: Math.sin(angle),
  };
  let nearest: RayTracingHit | undefined;

  segments.forEach((segment) => {
    const segmentDirection = {
      x: segment.to.x - segment.from.x,
      y: segment.to.y - segment.from.y,
    };
    const determinant =
      rayDirection.x * segmentDirection.y - rayDirection.y * segmentDirection.x;

    if (Math.abs(determinant) < Number.EPSILON) {
      return;
    }

    const delta = {
      x: segment.from.x - origin.x,
      y: segment.from.y - origin.y,
    };
    const rayDistance =
      (delta.x * segmentDirection.y - delta.y * segmentDirection.x) / determinant;
    const segmentDistance =
      (delta.x * rayDirection.y - delta.y * rayDirection.x) / determinant;

    if (rayDistance < 0 || segmentDistance < 0 || segmentDistance > 1) {
      return;
    }

    if (!nearest || rayDistance < nearest.distance) {
      nearest = {
        angle,
        distance: rayDistance,
        segment,
        x: origin.x + rayDirection.x * rayDistance,
        y: origin.y + rayDirection.y * rayDistance,
      };
    }
  });

  return nearest;
};

export const traceVisibilityPolygon = (
  origin: RayTracingPoint,
  bounds: RayTracingBounds,
  occluders: readonly (RayTracingPolygon | RayTracingSurface)[] = []
): RayTracingHit[] => {
  const vertices = [
    ...createRayTracingBoundsPolygon(bounds),
    ...occluders.flatMap((occluder) => [...getRayTracingOccluderPolygon(occluder)]),
  ];
  const segments = getRayTracingSegments(bounds, occluders);
  const angles = vertices.flatMap((vertex) => {
    const angle = Math.atan2(vertex.y - origin.y, vertex.x - origin.x);

    return [angle - rayAngleEpsilon, angle, angle + rayAngleEpsilon];
  });
  const hits = angles
    .map((angle) => traceRay(origin, angle, segments))
    .filter((hit): hit is RayTracingHit => Boolean(hit))
    .sort((a, b) => a.angle - b.angle);
  const uniqueHits: RayTracingHit[] = [];

  hits.forEach((hit) => {
    const previous = uniqueHits[uniqueHits.length - 1];

    if (
      previous &&
      Math.abs(previous.x - hit.x) < pointComparisonEpsilon &&
      Math.abs(previous.y - hit.y) < pointComparisonEpsilon
    ) {
      return;
    }

    uniqueHits.push(hit);
  });

  return uniqueHits;
};

const clampBounceCount = (bounces: number): number =>
  Math.max(0, Math.min(maxRayTracingBounces, Math.floor(bounces)));

const getBounceNormal = (
  origin: RayTracingPoint,
  hit: RayTracingHit
): RayTracingPoint => {
  const segmentDirection = {
    x: hit.segment.to.x - hit.segment.from.x,
    y: hit.segment.to.y - hit.segment.from.y,
  };
  const length = Math.hypot(segmentDirection.x, segmentDirection.y) || 1;
  const normal = {
    x: -segmentDirection.y / length,
    y: segmentDirection.x / length,
  };
  const toOrigin = {
    x: origin.x - hit.x,
    y: origin.y - hit.y,
  };
  const dot = normal.x * toOrigin.x + normal.y * toOrigin.y;

  return dot >= 0 ? normal : { x: -normal.x, y: -normal.y };
};

const getBounceOrigins = (
  origin: RayTracingPoint,
  color: string | undefined,
  hits: readonly RayTracingHit[],
  maxOrigins: number,
  surfaceOffset: number,
  surfaceColorMix: number
): Array<RayTracingPoint & { color?: string }> => {
  const step = Math.max(1, Math.floor(hits.length / Math.max(1, maxOrigins)));

  return hits
    .filter((_, index) => index % step === 0)
    .slice(0, maxOrigins)
    .map((hit) => {
      const normal = getBounceNormal(origin, hit);

      return {
        color: mixRayTracingColors(color, hit.segment.surfaceColor, surfaceColorMix),
        x: hit.x + normal.x * surfaceOffset,
        y: hit.y + normal.y * surfaceOffset,
      };
    });
};

export const traceLightBounces = (
  origin: RayTracingPoint,
  bounds: RayTracingBounds,
  occluders: readonly (RayTracingPolygon | RayTracingSurface)[] = [],
  options: RayTracingBounceOptions = {}
): RayTracingBounce[] => {
  const bounceCount = clampBounceCount(options.bounces ?? 0);
  const attenuation = options.attenuation ?? 0.32;
  const maxOriginsPerBounce = Math.max(1, Math.floor(options.maxOriginsPerBounce ?? 8));
  const surfaceOffset = options.surfaceOffset ?? 0.75;
  const surfaceColorMix = options.surfaceColorMix ?? 0.35;
  const layers: RayTracingBounce[] = [
    {
      color: options.lightColor,
      hits: traceVisibilityPolygon(origin, bounds, occluders),
      intensity: 1,
      level: 0,
      origin,
    },
  ];

  for (let level = 1; level <= bounceCount; level += 1) {
    const previous = layers.filter((layer) => layer.level === level - 1);
    const nextOrigins = previous.flatMap((layer) =>
      getBounceOrigins(
        layer.origin,
        layer.color,
        layer.hits,
        maxOriginsPerBounce,
        surfaceOffset,
        surfaceColorMix
      )
    );

    nextOrigins.forEach((bounceOrigin) => {
      layers.push({
        color: bounceOrigin.color,
        hits: traceVisibilityPolygon(bounceOrigin, bounds, occluders),
        intensity: Math.pow(attenuation, level),
        level,
        origin: bounceOrigin,
      });
    });
  }

  return layers;
};
