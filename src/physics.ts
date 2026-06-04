export interface PhysicsBody2D {
  posX: number;
  posY: number;
  velocityX?: number;
  velocityY?: number;
}

export interface PhysicsBody3D extends PhysicsBody2D {
  posZ: number;
  velocityZ?: number;
}

export interface GravityOptions {
  bounce?: number;
  delta: number;
  floorY?: number;
  gravity: number;
  maxFallSpeed?: number;
}

export interface RagdollPoint2D {
  id: string;
  pinned?: boolean;
  posX: number;
  posY: number;
  previousX?: number;
  previousY?: number;
}

export interface RagdollPoint3D extends RagdollPoint2D {
  posZ: number;
  previousZ?: number;
}

export interface RagdollConstraint {
  a: string;
  b: string;
  length: number;
}

export interface Ragdoll2D {
  constraints: readonly RagdollConstraint[];
  points: readonly RagdollPoint2D[];
}

export interface Ragdoll3D {
  constraints: readonly RagdollConstraint[];
  points: readonly RagdollPoint3D[];
}

export interface RagdollStepOptions {
  damping?: number;
  delta: number;
  floorY?: number;
  gravity?: number;
  iterations?: number;
}

export interface RagdollFactoryOptions {
  pinnedHead?: boolean;
  scale?: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const applyGravity2D = <T extends PhysicsBody2D>(
  body: T,
  options: GravityOptions
): T => {
  const bounce = options.bounce ?? 0;
  const velocityY = clamp(
    (body.velocityY ?? 0) + options.gravity * options.delta,
    Number.NEGATIVE_INFINITY,
    options.maxFallSpeed ?? Number.POSITIVE_INFINITY
  );
  const next: T = {
    ...body,
    posX: body.posX + (body.velocityX ?? 0) * options.delta,
    posY: body.posY + velocityY * options.delta,
    velocityY,
  };

  if (options.floorY !== undefined && next.posY > options.floorY) {
    return {
      ...next,
      posY: options.floorY,
      velocityY: -Math.abs(velocityY) * bounce,
    };
  }

  return next;
};

export const applyGravity3D = <T extends PhysicsBody3D>(
  body: T,
  options: GravityOptions
): T => {
  const next = applyGravity2D(body, options);

  return {
    ...next,
    posZ: body.posZ + (body.velocityZ ?? 0) * options.delta,
  };
};

export const createRagdoll2D = (
  origin: { posX: number; posY: number },
  options: RagdollFactoryOptions = {}
): Ragdoll2D => {
  const scale = options.scale ?? 1;
  const point = (id: string, x: number, y: number): RagdollPoint2D => ({
    id,
    pinned: id === "head" ? options.pinnedHead : undefined,
    posX: origin.posX + x * scale,
    posY: origin.posY + y * scale,
  });
  const points = [
    point("head", 0, -42),
    point("chest", 0, -18),
    point("hip", 0, 8),
    point("leftHand", -26, -8),
    point("rightHand", 26, -8),
    point("leftFoot", -16, 42),
    point("rightFoot", 16, 42),
  ];
  const constraints: RagdollConstraint[] = [
    { a: "head", b: "chest", length: 24 * scale },
    { a: "chest", b: "hip", length: 26 * scale },
    { a: "chest", b: "leftHand", length: 30 * scale },
    { a: "chest", b: "rightHand", length: 30 * scale },
    { a: "hip", b: "leftFoot", length: 38 * scale },
    { a: "hip", b: "rightFoot", length: 38 * scale },
    { a: "leftHand", b: "rightHand", length: 52 * scale },
    { a: "leftFoot", b: "rightFoot", length: 32 * scale },
  ];

  return { constraints, points };
};

export const createRagdoll3D = (
  origin: { posX: number; posY: number; posZ: number },
  options: RagdollFactoryOptions = {}
): Ragdoll3D => {
  const ragdoll = createRagdoll2D(origin, options);

  return {
    constraints: ragdoll.constraints,
    points: ragdoll.points.map((point, index) => ({
      ...point,
      posZ: origin.posZ + (index % 2 === 0 ? -8 : 8) * (options.scale ?? 1),
    })),
  };
};

const satisfy2D = (
  points: Map<string, RagdollPoint2D>,
  constraint: RagdollConstraint
): void => {
  const a = points.get(constraint.a);
  const b = points.get(constraint.b);

  if (!a || !b) {
    return;
  }

  const dx = b.posX - a.posX;
  const dy = b.posY - a.posY;
  const distance = Math.hypot(dx, dy) || 1;
  const difference = (distance - constraint.length) / distance;
  const offsetX = dx * difference * 0.5;
  const offsetY = dy * difference * 0.5;

  if (!a.pinned) {
    a.posX += offsetX;
    a.posY += offsetY;
  }

  if (!b.pinned) {
    b.posX -= offsetX;
    b.posY -= offsetY;
  }
};

const satisfy3D = (
  points: Map<string, RagdollPoint3D>,
  constraint: RagdollConstraint
): void => {
  const a = points.get(constraint.a);
  const b = points.get(constraint.b);

  if (!a || !b) {
    return;
  }

  const dx = b.posX - a.posX;
  const dy = b.posY - a.posY;
  const dz = b.posZ - a.posZ;
  const distance = Math.hypot(dx, dy, dz) || 1;
  const difference = (distance - constraint.length) / distance;
  const offsetX = dx * difference * 0.5;
  const offsetY = dy * difference * 0.5;
  const offsetZ = dz * difference * 0.5;

  if (!a.pinned) {
    a.posX += offsetX;
    a.posY += offsetY;
    a.posZ += offsetZ;
  }

  if (!b.pinned) {
    b.posX -= offsetX;
    b.posY -= offsetY;
    b.posZ -= offsetZ;
  }
};

const clampFloor2D = (
  points: Iterable<RagdollPoint2D>,
  floorY: number | undefined
): void => {
  if (floorY === undefined) {
    return;
  }

  for (const point of points) {
    if (point.posY > floorY) {
      point.posY = floorY;
    }
  }
};

export const stepRagdoll2D = (
  ragdoll: Ragdoll2D,
  options: RagdollStepOptions
): Ragdoll2D => {
  const damping = options.damping ?? 0.98;
  const gravity = options.gravity ?? 0;
  const points = ragdoll.points.map((point) => {
    if (point.pinned) {
      return { ...point };
    }

    const previousX = point.previousX ?? point.posX;
    const previousY = point.previousY ?? point.posY;
    const velocityX = (point.posX - previousX) * damping;
    const velocityY = (point.posY - previousY) * damping + gravity * options.delta * options.delta;
    const next = {
      ...point,
      posX: point.posX + velocityX,
      posY: point.posY + velocityY,
      previousX: point.posX,
      previousY: point.posY,
    };

    if (options.floorY !== undefined && next.posY > options.floorY) {
      next.posY = options.floorY;
    }

    return next;
  });
  const pointMap = new Map(points.map((point) => [point.id, point]));

  for (let iteration = 0; iteration < (options.iterations ?? 4); iteration++) {
    ragdoll.constraints.forEach((constraint) => satisfy2D(pointMap, constraint));
    clampFloor2D(pointMap.values(), options.floorY);
  }

  clampFloor2D(pointMap.values(), options.floorY);

  return { constraints: ragdoll.constraints, points: [...pointMap.values()] };
};

export const stepRagdoll3D = (
  ragdoll: Ragdoll3D,
  options: RagdollStepOptions
): Ragdoll3D => {
  const damping = options.damping ?? 0.98;
  const gravity = options.gravity ?? 0;
  const points = ragdoll.points.map((point) => {
    if (point.pinned) {
      return { ...point };
    }

    const previousX = point.previousX ?? point.posX;
    const previousY = point.previousY ?? point.posY;
    const previousZ = point.previousZ ?? point.posZ;
    const velocityX = (point.posX - previousX) * damping;
    const velocityY = (point.posY - previousY) * damping + gravity * options.delta * options.delta;
    const velocityZ = (point.posZ - previousZ) * damping;
    const next = {
      ...point,
      posX: point.posX + velocityX,
      posY: point.posY + velocityY,
      posZ: point.posZ + velocityZ,
      previousX: point.posX,
      previousY: point.posY,
      previousZ: point.posZ,
    };

    if (options.floorY !== undefined && next.posY > options.floorY) {
      next.posY = options.floorY;
    }

    return next;
  });
  const pointMap = new Map(points.map((point) => [point.id, point]));

  for (let iteration = 0; iteration < (options.iterations ?? 4); iteration++) {
    ragdoll.constraints.forEach((constraint) => satisfy3D(pointMap, constraint));
    clampFloor2D(pointMap.values(), options.floorY);
  }

  clampFloor2D(pointMap.values(), options.floorY);

  return { constraints: ragdoll.constraints, points: [...pointMap.values()] };
};
