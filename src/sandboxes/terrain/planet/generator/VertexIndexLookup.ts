import { mainFaceVertices, sideFaceVertices } from './PlanetUtils';

export type VertexIndexLookup = (face: number, row: number, col: number) => number;

export function vertexIndexLookup(resolution: number): VertexIndexLookup {
  const mainVertices = mainFaceVertices(resolution);
  const sideVertices = sideFaceVertices(resolution);
  const sideBoundaries = mainVertices * 4;

  function mainFaceVertexIndex(face: number, row: number, col: number) {
    const res = face * mainVertices + row * (resolution + 1) + col;
    return res < sideBoundaries ? res : res - sideBoundaries;
  }

  /**
   *              (0,0)     face 0   (r-1,0)
   *     (r-1,0)  |-------------------|  (0,0)
   *     face 3   |                   |  face 1
   *     (0,0)    |-------------------|  (r-1,0)
   *            (r-1,0)    face 2  (0,0)
   */
  function leftFaceVertexIndex(row: number, col: number) {
    if (row === 0) return mainFaceVertexIndex(0, col, 0);
    if (row === resolution) return mainFaceVertexIndex(2, resolution - col, 0);
    if (col === 0) return mainFaceVertexIndex(3, resolution - row, 0);
    if (col === resolution) return mainFaceVertexIndex(1, row, 0);
    return sideBoundaries + (row - 1) * (resolution - 1) + col - 1;
  }

  /**
   *            (r-1, r-1)   face 0   (0, r-1)
   *     (0, r-1)  |-------------------|  (r-1, r-1)
   *     face 1    |                   |  face 3
   *    (r-1, r-1) |-------------------|  (0, r-1)
   *          (0, r-1)   face 2   (r-1, r-1)
   *
   */
  function rightFaceVertexIndex(row: number, col: number) {
    if (row === 0) return mainFaceVertexIndex(0, resolution - col, resolution);
    if (row === resolution) return mainFaceVertexIndex(2, col, resolution);
    if (col === 0) return mainFaceVertexIndex(1, row, resolution);
    if (col === resolution) return mainFaceVertexIndex(3, resolution - row, resolution);
    return sideBoundaries + sideVertices + (row - 1) * (resolution - 1) + col - 1;
  }

  return (face: number, row: number, col: number): number => {
    if (row < 0 || row > resolution) throw new Error('Invalid row index ' + row + ' must be [0,' + resolution + ']');
    if (col < 0 || col > resolution) throw new Error('Invalid col index ' + row + ' must be [0,' + resolution + ']');

    if (face >= 0 && face < 4) {
      return mainFaceVertexIndex(face, row, col);
    } else if (face === 4) {
      return leftFaceVertexIndex(row, col);
    } else if (face === 5) {
      return rightFaceVertexIndex(row, col);
    } else {
      throw new Error('Invalid face ' + face);
    }
  };
}
