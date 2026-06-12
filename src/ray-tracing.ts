export type RayTracingPoint = {
  x: number;
  y: number;
};

export type RayTracingBounds = {
  height: number;
  width: number;
  x?: number;
  y?: number;
};

export type RayTracingSegment = {
  from: RayTracingPoint;
  to: RayTracingPoint;
};

export type RayTracingPolygon = readonly RayTracingPoint[];

export type RayTracingHit = RayTracingPoint & {
  angle: number;
  distance: number;
};

const rayAngleEpsilon = 0.00001;
const pointComparisonEpsilon = 0.0001;

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
  polygon: RayTracingPolygon
): RayTracingSegment[] =>
  polygon.map((point, index) => ({
    from: point,
    to: polygon[(index + 1) % polygon.length] ?? point,
  }));

export const getRayTracingSegments = (
  bounds: RayTracingBounds,
  occluders: readonly RayTracingPolygon[] = []
): RayTracingSegment[] => [
  ...getRayTracingPolygonSegments(createRayTracingBoundsPolygon(bounds)),
  ...occluders.flatMap((occluder) => getRayTracingPolygonSegments(occluder)),
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
  occluders: readonly RayTracingPolygon[] = []
): RayTracingHit[] => {
  const vertices = [
    ...createRayTracingBoundsPolygon(bounds),
    ...occluders.flatMap((occluder) => [...occluder]),
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
