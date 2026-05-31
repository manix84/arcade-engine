export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface CubeBlock extends Vector3 {
  id: string;
  color?: string;
  size?: number;
}

export interface CubeCluster {
  blocks: CubeBlock[];
  links: PlasmaLink[];
}

export interface PlasmaLink {
  from: string;
  to: string;
  strength: number;
}

export interface CubeClusterPatternOptions {
  color?: string;
  depth?: number;
  gap?: number;
  layerGap?: number;
  origin?: Vector3;
  size?: number;
}

export interface CubeClusterBounds {
  max: Vector3;
  min: Vector3;
}

export interface ExplosionBlock extends CubeBlock {
  opacity: number;
  velocity: Vector3;
}

export interface CubeExplosionOptions {
  force?: number;
  random?: () => number;
  spin?: number;
}

export interface CubeExplosionStepOptions {
  drag?: number;
  fadeSpeed?: number;
  gravity?: number;
}

const defaultBlockSize = 1;
const defaultGap = 0.22;
const defaultLayerGap = 0.18;

const getBlockSize = (block: CubeBlock): number => block.size ?? defaultBlockSize;

const cloneVector = (vector: Vector3): Vector3 => ({
  x: vector.x,
  y: vector.y,
  z: vector.z,
});

export const createCubeClusterFromPattern = (
  layers: string[][],
  options: CubeClusterPatternOptions = {}
): CubeCluster => {
  const size = options.size ?? defaultBlockSize;
  const gap = options.gap ?? defaultGap;
  const layerGap = options.layerGap ?? defaultLayerGap;
  const depth = options.depth ?? size;
  const origin = options.origin ?? { x: 0, y: 0, z: 0 };
  const blocks: CubeBlock[] = [];

  layers.forEach((rows, layerIndex) => {
    rows.forEach((row, rowIndex) => {
      [...row].forEach((cell, columnIndex) => {
        if (cell === " " || cell === ".") {
          return;
        }

        blocks.push({
          color: options.color,
          id: `${layerIndex}:${rowIndex}:${columnIndex}`,
          size,
          x: origin.x + columnIndex * (size + gap),
          y: origin.y - rowIndex * (size + gap),
          z: origin.z + layerIndex * (depth + layerGap),
        });
      });
    });
  });

  return {
    blocks,
    links: createPlasmaLinks(blocks),
  };
};

export const createPlasmaLinks = (
  blocks: CubeBlock[],
  maxDistance?: number
): PlasmaLink[] => {
  const links: PlasmaLink[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const source = blocks[i];
    const sourceSize = getBlockSize(source);
    const distanceLimit = maxDistance ?? sourceSize * 1.45;

    for (let j = i + 1; j < blocks.length; j++) {
      const target = blocks[j];
      const distance = getVectorDistance(source, target);

      if (distance <= distanceLimit) {
        links.push({
          from: source.id,
          strength: 1 - distance / distanceLimit,
          to: target.id,
        });
      }
    }
  }

  return links;
};

export const getVectorDistance = (a: Vector3, b: Vector3): number =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

export const getCubeClusterBounds = (blocks: CubeBlock[]): CubeClusterBounds => {
  if (!blocks.length) {
    return {
      max: { x: 0, y: 0, z: 0 },
      min: { x: 0, y: 0, z: 0 },
    };
  }

  return blocks.reduce<CubeClusterBounds>(
    (bounds, block) => {
      const size = getBlockSize(block);

      bounds.min.x = Math.min(bounds.min.x, block.x);
      bounds.min.y = Math.min(bounds.min.y, block.y);
      bounds.min.z = Math.min(bounds.min.z, block.z);
      bounds.max.x = Math.max(bounds.max.x, block.x + size);
      bounds.max.y = Math.max(bounds.max.y, block.y + size);
      bounds.max.z = Math.max(bounds.max.z, block.z + size);

      return bounds;
    },
    {
      max: { x: -Infinity, y: -Infinity, z: -Infinity },
      min: { x: Infinity, y: Infinity, z: Infinity },
    }
  );
};

export const getCubeClusterCenter = (blocks: CubeBlock[]): Vector3 => {
  const bounds = getCubeClusterBounds(blocks);

  return {
    x: (bounds.min.x + bounds.max.x) / 2,
    y: (bounds.min.y + bounds.max.y) / 2,
    z: (bounds.min.z + bounds.max.z) / 2,
  };
};

export const centerCubeCluster = (blocks: CubeBlock[]): CubeBlock[] => {
  const center = getCubeClusterCenter(blocks);

  return blocks.map((block) => ({
    ...block,
    x: block.x - center.x,
    y: block.y - center.y,
    z: block.z - center.z,
  }));
};

export const createExplosionBlocks = (
  blocks: CubeBlock[],
  options: CubeExplosionOptions = {}
): ExplosionBlock[] => {
  const center = getCubeClusterCenter(blocks);
  const force = options.force ?? 1;
  const random = options.random ?? Math.random;
  const spin = options.spin ?? 0.15;

  return blocks.map((block) => {
    const direction = normalizeVector({
      x: block.x + getBlockSize(block) / 2 - center.x,
      y: block.y + getBlockSize(block) / 2 - center.y,
      z: block.z + getBlockSize(block) / 2 - center.z,
    });
    const jitter = {
      x: (random() - 0.5) * spin,
      y: (random() - 0.5) * spin,
      z: (random() - 0.5) * spin,
    };

    return {
      ...block,
      opacity: 1,
      velocity: {
        x: (direction.x + jitter.x) * force,
        y: (direction.y + jitter.y) * force,
        z: (direction.z + jitter.z) * force,
      },
    };
  });
};

export const stepExplosionBlocks = (
  blocks: ExplosionBlock[],
  delta: number,
  options: CubeExplosionStepOptions = {}
): ExplosionBlock[] => {
  const drag = options.drag ?? 0.96;
  const fadeSpeed = options.fadeSpeed ?? 0.7;
  const gravity = options.gravity ?? 0;

  return blocks.map((block) => ({
    ...block,
    opacity: Math.max(0, block.opacity - fadeSpeed * delta),
    velocity: {
      x: block.velocity.x * drag,
      y: (block.velocity.y + gravity * delta) * drag,
      z: block.velocity.z * drag,
    },
    x: block.x + block.velocity.x * delta,
    y: block.y + block.velocity.y * delta,
    z: block.z + block.velocity.z * delta,
  }));
};

export const getVisibleExplosionBlocks = (
  blocks: ExplosionBlock[]
): ExplosionBlock[] => blocks.filter((block) => block.opacity > 0);

export const normalizeVector = (vector: Vector3): Vector3 => {
  const length = Math.hypot(vector.x, vector.y, vector.z);

  if (!length) {
    return { x: 0, y: 0, z: 0 };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  };
};

export const cloneCubeBlock = (block: CubeBlock): CubeBlock => ({
  ...block,
  ...cloneVector(block),
});
