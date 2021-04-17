export class PoissonDiscSampler {
  private constructor() {
    // I am invisible
  }

  static samples(max: number, radius = 0.01, k = 30): Point[] {
    const cellSize = radius / Math.sqrt(2);
    const gridSize = Math.ceil(1 / cellSize);
    const grid: number[] = new Array(gridSize * gridSize);
    const points: Point[] = [];
    const spawnPoints: Point[] = [{ x: 0.5, y: 0.5 }];

    function isValid(candidate: Point, gridPosition: Point): boolean {
      if (
        candidate.x > cellSize &&
        candidate.x < 1 - cellSize &&
        candidate.y > cellSize &&
        candidate.y < 1 - cellSize
      ) {
        const xstart = Math.max(0, gridPosition.x - 2);
        const xend = Math.min(gridSize - 1, gridPosition.x + 2);
        const ystart = Math.max(0, gridPosition.y - 2);
        const yend = Math.min(gridSize - 1, gridPosition.y + 2);
        for (let y = ystart; y <= yend; y++) {
          for (let x = xstart; x <= xend; x++) {
            const gridIndex = y * gridSize + x;
            if (grid[gridIndex] !== undefined) {
              const sqrdst = squareDistance(candidate, points[grid[gridIndex]]);
              if (sqrdst < radius * radius) return false;
            }
          }
        }
        return true;
      }
      return false;
    }

    while (spawnPoints.length > 0 && points.length < max) {
      const spwanIndex = Math.floor(Math.random() * spawnPoints.length);
      const spawnCenter = spawnPoints[spwanIndex];
      let accepted = false;
      for (let i = 0; i < k; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dir = { x: Math.sin(angle), y: Math.cos(angle) };
        const length = randomRange(radius, 2 * radius);
        const candidate = {
          x: spawnCenter.x + dir.x * length,
          y: spawnCenter.y + dir.y * length
        };
        const gridPosition = {
          x: Math.floor(candidate.x / cellSize),
          y: Math.floor(candidate.y / cellSize)
        };
        const gridIndex = gridPosition.y * gridSize + gridPosition.x;
        if (isValid(candidate, gridPosition)) {
          points.push(candidate);
          spawnPoints.push(candidate);
          grid[gridIndex] = points.length - 1;
          accepted = true;
          break;
        }
      }
      if (!accepted) {
        spawnPoints.splice(spwanIndex, 1);
      }
    }
    return points;
  }
}

type Point = { x: number; y: number };

export function randomRange(a = 0, b = 1): number {
  return a + Math.random() * (b - a);
}

function squareDistance(p0: Point, p1: Point): number {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  return dx * dx + dy * dy;
}
