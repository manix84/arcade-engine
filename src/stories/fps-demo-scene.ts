export type FpsDemoSceneTheme = "sciFi" | "concrete" | "industrial";

export type FpsDemoSceneOptions = {
  height: number;
  intensity?: number;
  pixelScale?: number;
  routeSpeed?: number;
  showGun?: boolean;
  showReticle?: boolean;
  theme?: FpsDemoSceneTheme;
  timeMs: number;
  width: number;
};

type FpsDemoPoint = {
  x: number;
  y: number;
};

type RayHit = {
  distance: number;
  side: 0 | 1;
  tile: string;
  wallX: number;
};

type RouteSegment = {
  from: FpsDemoPoint;
  length: number;
  to: FpsDemoPoint;
};

const fpsDemoMap = [
  "###################",
  "#D......L........D#",
  "#.###############.#",
  "#.#D....#....L..#.#",
  "#.#.##..#..##...#.#",
  "#.#.##..#..##...#.#",
  "#.#.....#......D#.#",
  "#.###############.#",
  "#D.......T.......L#",
  "###################",
];

const fpsDemoRoute: FpsDemoPoint[] = [
  { x: 1.5, y: 1.5 },
  { x: 17.5, y: 1.5 },
  { x: 17.5, y: 8.5 },
  { x: 1.5, y: 8.5 },
];

const fpsDemoSegments: RouteSegment[] = fpsDemoRoute.map((from, index) => {
  const to = fpsDemoRoute[(index + 1) % fpsDemoRoute.length];

  return {
    from,
    length: Math.hypot(to.x - from.x, to.y - from.y),
    to,
  };
});

const fpsDemoRouteLength = fpsDemoSegments.reduce(
  (total, segment) => total + segment.length,
  0
);

let lowResolutionCanvas: HTMLCanvasElement | undefined;
let weaponSpriteImage: HTMLImageElement | undefined;

export const drawFpsDemoScene = (
  context: CanvasRenderingContext2D,
  options: FpsDemoSceneOptions
): void => {
  const pixelScale = Math.max(2, Math.round(options.pixelScale ?? 3));
  const lowWidth = Math.max(1, Math.floor(options.width / pixelScale));
  const lowHeight = Math.max(1, Math.floor(options.height / pixelScale));
  const internalCanvas = getLowResolutionCanvas(lowWidth, lowHeight);
  const internalContext = internalCanvas.getContext("2d");

  if (!internalContext) {
    return;
  }

  internalContext.imageSmoothingEnabled = false;
  renderFpsDemoScene(internalContext, {
    ...options,
    height: lowHeight,
    width: lowWidth,
  });

  context.save();
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, options.width, options.height);
  context.drawImage(internalCanvas, 0, 0, options.width, options.height);
  context.restore();
};

const getLowResolutionCanvas = (
  width: number,
  height: number
): HTMLCanvasElement => {
  lowResolutionCanvas ??= document.createElement("canvas");
  lowResolutionCanvas.width = width;
  lowResolutionCanvas.height = height;

  return lowResolutionCanvas;
};

const renderFpsDemoScene = (
  context: CanvasRenderingContext2D,
  options: FpsDemoSceneOptions
): void => {
  const width = Math.max(1, Math.floor(options.width));
  const height = Math.max(1, Math.floor(options.height));
  const theme = options.theme ?? "sciFi";
  const intensity = Math.max(0, Math.min(1, options.intensity ?? 1));
  const routeSpeed = Math.max(0.1, options.routeSpeed ?? 1.45);
  const distance = ((options.timeMs / 1000) * routeSpeed) % fpsDemoRouteLength;
  const camera = getRoutePoint(distance);
  const lookAhead = getRoutePoint(distance + 0.88);
  const yaw = Math.atan2(lookAhead.y - camera.y, lookAhead.x - camera.x);
  const walk = (options.timeMs / 1000) * routeSpeed;
  const bob = Math.round(Math.sin(walk * Math.PI * 2.2) * 2);
  const sway = Math.sin(walk * Math.PI * 1.4) * 1.4;
  const horizon = Math.round(height * 0.48 + bob);

  drawCeilingAndFloor(context, width, height, horizon, theme);
  drawRaycastWalls(context, width, height, horizon, camera, yaw, theme, intensity);
  drawFpsVignetteAndFrame(context, width, height);

  if (options.showReticle ?? true) {
    drawFpsReticle(context, width, height);
  }

  if (options.showGun ?? true) {
    drawFpsGun(context, width, height, bob, sway, theme);
  }
};

const getRoutePoint = (distance: number): FpsDemoPoint => {
  let remaining =
    ((distance % fpsDemoRouteLength) + fpsDemoRouteLength) % fpsDemoRouteLength;

  for (const segment of fpsDemoSegments) {
    if (remaining <= segment.length) {
      const progress = segment.length <= 0 ? 0 : remaining / segment.length;

      return {
        x: segment.from.x + (segment.to.x - segment.from.x) * progress,
        y: segment.from.y + (segment.to.y - segment.from.y) * progress,
      };
    }

    remaining -= segment.length;
  }

  return fpsDemoSegments[0].from;
};

const drawCeilingAndFloor = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  horizon: number,
  theme: FpsDemoSceneTheme
): void => {
  const ceilingBase = theme === "concrete" ? [18, 22, 24] : [5, 13, 18];
  const floorBase = theme === "industrial" ? [30, 25, 20] : [22, 18, 15];
  const rowStep = 3;

  context.fillStyle = rgb(5, 7, 10);
  context.fillRect(0, 0, width, height);

  for (let y = 0; y < height; y += rowStep) {
    if (y < horizon) {
      const shade = 0.42 + (y / Math.max(1, horizon)) * 0.42;

      context.fillStyle = rgb(
        ceilingBase[0] * shade,
        ceilingBase[1] * shade,
        ceilingBase[2] * shade
      );
    } else {
      const depth = (y - horizon) / Math.max(1, height - horizon);
      const shade = 0.74 - depth * 0.42;

      context.fillStyle = rgb(
        floorBase[0] * shade,
        floorBase[1] * shade,
        floorBase[2] * shade
      );
    }

    context.fillRect(0, y, width, rowStep);
  }

  context.fillStyle = "rgba(109, 146, 154, 0.12)";
  context.fillRect(0, horizon, width, 1);

  for (let y = Math.max(0, horizon - 58); y < horizon; y += 16) {
    context.fillStyle = "rgba(0, 0, 0, 0.18)";
    context.fillRect(0, y, width, 2);
  }

  for (let y = horizon + 12; y < height; y += 17) {
    const depth = (y - horizon) / Math.max(1, height - horizon);

    context.fillStyle = `rgba(3, 6, 8, ${0.18 + depth * 0.18})`;
    context.fillRect(0, y, width, 2);
  }
};

const drawRaycastWalls = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  horizon: number,
  camera: FpsDemoPoint,
  yaw: number,
  theme: FpsDemoSceneTheme,
  intensity: number
): void => {
  const fieldOfView = Math.PI / 3.25;
  const planeX = -Math.sin(yaw) * Math.tan(fieldOfView / 2);
  const planeY = Math.cos(yaw) * Math.tan(fieldOfView / 2);
  const directionX = Math.cos(yaw);
  const directionY = Math.sin(yaw);
  const columnWidth = 2;

  for (let screenX = 0; screenX < width; screenX += columnWidth) {
    const cameraX = (2 * (screenX + columnWidth / 2)) / width - 1;
    const rayX = directionX + planeX * cameraX;
    const rayY = directionY + planeY * cameraX;
    const hit = castFpsRay(camera, rayX, rayY);
    const distance = Math.max(0.08, hit.distance);
    const wallHeight = Math.min(height * 2, Math.round(height / distance));
    const top = Math.round(horizon - wallHeight * 0.52);
    const bottom = Math.round(horizon + wallHeight * 0.48);
    const shade = Math.max(0.18, 1 - distance * 0.09);
    const sideShade = hit.side === 1 ? 0.76 : 1;

    context.fillStyle = getWallColor(theme, shade * sideShade, hit.tile);
    context.fillRect(screenX, top, columnWidth, bottom - top);
    drawWallDetail(
      context,
      screenX,
      columnWidth,
      top,
      bottom,
      hit,
      shade,
      intensity
    );

    if (distance > 3.8) {
      context.fillStyle = `rgba(2, 6, 10, ${Math.min(0.5, (distance - 3.8) * 0.09)})`;
      context.fillRect(screenX, top, columnWidth, bottom - top);
    }
  }
};

const castFpsRay = (
  camera: FpsDemoPoint,
  rayX: number,
  rayY: number
): RayHit => {
  let mapX = Math.floor(camera.x);
  let mapY = Math.floor(camera.y);
  const deltaX = Math.abs(1 / (rayX === 0 ? 0.0001 : rayX));
  const deltaY = Math.abs(1 / (rayY === 0 ? 0.0001 : rayY));
  const stepX = rayX < 0 ? -1 : 1;
  const stepY = rayY < 0 ? -1 : 1;
  let sideDistanceX =
    rayX < 0 ? (camera.x - mapX) * deltaX : (mapX + 1 - camera.x) * deltaX;
  let sideDistanceY =
    rayY < 0 ? (camera.y - mapY) * deltaY : (mapY + 1 - camera.y) * deltaY;
  let side: 0 | 1 = 0;

  for (let step = 0; step < 48; step += 1) {
    if (sideDistanceX < sideDistanceY) {
      sideDistanceX += deltaX;
      mapX += stepX;
      side = 0;
    } else {
      sideDistanceY += deltaY;
      mapY += stepY;
      side = 1;
    }

    const tile = getFpsDemoTile(mapX, mapY);
    if (isWallTile(tile)) {
      const distance =
        side === 0
          ? (mapX - camera.x + (1 - stepX) / 2) / rayX
          : (mapY - camera.y + (1 - stepY) / 2) / rayY;
      const wallHit =
        side === 0 ? camera.y + distance * rayY : camera.x + distance * rayX;

      return {
        distance: Math.max(0.08, distance),
        side,
        tile,
        wallX: wallHit - Math.floor(wallHit),
      };
    }
  }

  return {
    distance: 16,
    side,
    tile: "#",
    wallX: 0.5,
  };
};

const drawWallDetail = (
  context: CanvasRenderingContext2D,
  x: number,
  width: number,
  top: number,
  bottom: number,
  hit: RayHit,
  shade: number,
  intensity: number
): void => {
  const wallHeight = bottom - top;

  if (hit.tile === "L" && hit.wallX > 0.22 && hit.wallX < 0.78) {
    context.fillStyle = `rgba(255, 174, 54, ${0.7 * shade * intensity})`;
    context.fillRect(
      x,
      top + Math.round(wallHeight * 0.22),
      width,
      Math.max(1, Math.round(wallHeight * 0.08))
    );
    context.fillStyle = `rgba(255, 174, 54, ${0.22 * shade * intensity})`;
    context.fillRect(x, top, width, wallHeight);
    return;
  }

  if (hit.tile === "D") {
    if (hit.wallX > 0.16 && hit.wallX < 0.84) {
      context.fillStyle = `rgba(14, 22, 27, ${0.5 * shade})`;
      context.fillRect(x, top + Math.round(wallHeight * 0.18), width, Math.round(wallHeight * 0.72));
    }

    if (hit.wallX < 0.18 || hit.wallX > 0.82) {
      context.fillStyle = `rgba(116, 147, 153, ${0.32 * shade})`;
      context.fillRect(x, top + Math.round(wallHeight * 0.14), width, Math.round(wallHeight * 0.78));
    }

    return;
  }

  if (hit.wallX < 0.04 || hit.wallX > 0.96) {
    context.fillStyle = `rgba(124, 162, 169, ${0.26 * shade})`;
    context.fillRect(x, top, width, wallHeight);
  }

  if (hit.wallX > 0.48 && hit.wallX < 0.52) {
    context.fillStyle = `rgba(5, 11, 15, ${0.42 * shade})`;
    context.fillRect(x, top, width, wallHeight);
  }

  if (hit.wallX > 0.12 && hit.wallX < 0.88) {
    const upper = top + Math.round(wallHeight * 0.28);
    const lower = top + Math.round(wallHeight * 0.72);

    context.fillStyle = `rgba(4, 9, 12, ${0.2 * shade})`;
    context.fillRect(x, upper, width, Math.max(1, Math.round(wallHeight * 0.025)));
    context.fillRect(x, lower, width, Math.max(1, Math.round(wallHeight * 0.025)));
  }

  if (hit.wallX > 0.1 && hit.wallX < 0.32) {
    const ventTop = top + Math.round(wallHeight * 0.72);

    context.fillStyle = `rgba(3, 8, 11, ${0.32 * shade})`;
    context.fillRect(x, ventTop, width, Math.max(1, Math.round(wallHeight * 0.14)));
  }
};

const drawFpsReticle = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number
): void => {
  const x = Math.round(width / 2);
  const y = Math.round(height / 2);

  context.fillStyle = "rgba(79, 209, 197, 0.42)";
  context.fillRect(x - 3, y, 2, 1);
  context.fillRect(x + 2, y, 2, 1);
  context.fillRect(x, y - 3, 1, 2);
  context.fillRect(x, y + 2, 1, 2);
};

const drawFpsGun = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  bob: number,
  sway: number,
  _theme: FpsDemoSceneTheme
): void => {
  const sprite = getFpsWeaponSpriteImage();

  if (!sprite.complete || sprite.naturalWidth <= 0 || sprite.naturalHeight <= 0) {
    return;
  }

  const spriteWidth = Math.round(width * 0.54);
  const spriteHeight = Math.round(spriteWidth * (sprite.naturalHeight / sprite.naturalWidth));
  const leftOffset = Math.round(width * 0.11);
  const x = Math.round(
    width - spriteWidth - leftOffset + Math.max(-2, Math.min(2, sway))
  );
  const y = Math.round(height - spriteHeight + 8 + Math.max(-4, Math.min(4, bob)));

  context.save();
  context.imageSmoothingEnabled = false;
  context.drawImage(sprite, x, y, spriteWidth, spriteHeight);
  context.restore();
};

const drawFpsVignetteAndFrame = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number
): void => {
  const edge = Math.max(5, Math.round(width * 0.035));

  context.fillStyle = "rgba(0, 0, 0, 0.34)";
  context.fillRect(0, 0, width, edge);
  context.fillRect(0, height - edge, width, edge);
  context.fillRect(0, 0, edge, height);
  context.fillRect(width - edge, 0, edge, height);

  context.fillStyle = "rgba(97, 124, 132, 0.42)";
  context.fillRect(3, 3, width - 6, 1);
  context.fillRect(3, height - 4, width - 6, 1);
  context.fillRect(3, 3, 1, height - 6);
  context.fillRect(width - 4, 3, 1, height - 6);
};

const getFpsWeaponSpriteImage = (): HTMLImageElement => {
  if (!weaponSpriteImage) {
    weaponSpriteImage = new Image();
    weaponSpriteImage.decoding = "async";
    weaponSpriteImage.src = "fps-weapon.png";
  }

  return weaponSpriteImage;
};

const getFpsDemoTile = (x: number, y: number): string => {
  if (y < 0 || y >= fpsDemoMap.length) {
    return "#";
  }

  return fpsDemoMap[y][x] ?? "#";
};

const isWallTile = (tile: string): boolean => tile !== "." && tile !== "T";

const getWallColor = (
  theme: FpsDemoSceneTheme,
  shade: number,
  tile: string
): string => {
  const base =
    theme === "concrete"
      ? [72, 76, 78]
      : theme === "industrial"
        ? [68, 62, 51]
        : [48, 78, 88];
  const detailBoost = tile === "D" ? 0.75 : tile === "L" ? 1.14 : 1;

  return rgb(base[0] * shade * detailBoost, base[1] * shade * detailBoost, base[2] * shade * detailBoost);
};

const rgb = (red: number, green: number, blue: number): string =>
  `rgb(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)})`;
