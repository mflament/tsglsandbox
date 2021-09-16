export type VertexIndexLookup = (face: number, row: number, col: number) => number;

export function vertexIndexLookup(resolution: number): VertexIndexLookup {
  const faceSize = resolution - 1;
  const sideSize = resolution - 2;
  const mainVertices = resolution * faceSize;
  const sideVertices = sideSize * sideSize;
  const sideBoundaries = mainVertices * 4;

  function mainFaceVertexIndex(face: number, row: number, col: number) {
    const res = face * mainVertices + row * resolution + col;
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
    if (row === faceSize) return mainFaceVertexIndex(2, faceSize - col, 0);
    if (col === 0) return mainFaceVertexIndex(3, faceSize - row, 0);
    if (col === faceSize) return mainFaceVertexIndex(1, row, 0);
    return sideBoundaries + (row - 1) * sideSize + col - 1;
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
    if (row === 0) return mainFaceVertexIndex(0, faceSize - col, faceSize);
    if (row === faceSize) return mainFaceVertexIndex(2, col, faceSize);
    if (col === 0) return mainFaceVertexIndex(1, row, faceSize);
    if (col === faceSize) return mainFaceVertexIndex(3, faceSize - row, faceSize);
    return sideBoundaries + sideVertices + (row - 1) * sideSize + col - 1;
  }

  return (face: number, row: number, col: number): number => {
    if (row < 0 || row > faceSize) throw new Error('Invalid row index ' + row + ' must be [0,' + faceSize + ']');
    if (col < 0 || col > faceSize) throw new Error('Invalid col index ' + row + ' must be [0,' + faceSize + ']');
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
