export function mainFaceVertices(resolution: number): number {
  return (resolution + 1) * resolution;
}

export function sideFaceVertices(resolution: number): number {
  return (resolution - 1) * (resolution - 1);
}

export function vertexCount(resolution: number): number {
  let res = mainFaceVertices(resolution) * 4;
  res += sideFaceVertices(resolution) * 2;
  return res;
}

export function planetCells(resolution: number): number {
  return resolution * resolution * 6;
}

export function planetTriangles(resolution: number): number {
  return planetCells(resolution) * 2;
}

export function indexCount(resolution: number, trianglesStrip: boolean): number {
  if (trianglesStrip) {
    const indexPerRow = (resolution + 1) * 2 + 1; // index per row + separator
    return indexPerRow * resolution * 6;
  }
  return planetTriangles(resolution) * 3;
}
