import { vertexIndexLookup } from 'sandboxes/terrain/planet/generator/VertexIndexLookup';

describe('test lookup resolution 1', () => {
  testAll(1, [
    // face 0
    [0, 0, 0, 0],
    [0, 0, 1, 1],
    [0, 1, 0, 2],
    [0, 1, 1, 3],
    // face 1
    [1, 0, 0, 2],
    [1, 0, 1, 3],
    [1, 1, 0, 4],
    [1, 1, 1, 5],
    // face 2
    [2, 0, 0, 4],
    [2, 0, 1, 5],
    [2, 1, 0, 6],
    [2, 1, 1, 7],
    // face 3
    [3, 0, 0, 6],
    [3, 0, 1, 7],
    [3, 1, 0, 0],
    [3, 1, 1, 1],
    // face 4 (left)
    [4, 0, 0, 0],
    [4, 0, 1, 2],
    [4, 1, 0, 6],
    [4, 1, 1, 4],
    // face 5 (right)
    [5, 0, 0, 3],
    [5, 0, 1, 1],
    [5, 1, 0, 5],
    [5, 1, 1, 7]
  ]);
});

describe('test lookup resolution 2', () => {
  testAll(2, [
    // face 0
    [0, 0, 0, 0],
    [0, 0, 1, 1],
    [0, 0, 2, 2],
    [0, 1, 0, 3],
    [0, 1, 1, 4],
    [0, 1, 2, 5],
    [0, 2, 0, 6],
    [0, 2, 1, 7],
    [0, 2, 2, 8],
    // face 1
    [1, 0, 0, 6],
    [1, 0, 1, 7],
    [1, 0, 2, 8],
    [1, 1, 0, 9],
    [1, 1, 1, 10],
    [1, 1, 2, 11],
    [1, 2, 0, 12],
    [1, 2, 1, 13],
    [1, 2, 2, 14],
    // face 2
    [2, 0, 0, 12],
    [2, 0, 1, 13],
    [2, 0, 2, 14],
    [2, 1, 0, 15],
    [2, 1, 1, 16],
    [2, 1, 2, 17],
    [2, 2, 0, 18],
    [2, 2, 1, 19],
    [2, 2, 2, 20],
    // face 3
    [3, 0, 0, 18],
    [3, 0, 1, 19],
    [3, 0, 2, 20],
    [3, 1, 0, 21],
    [3, 1, 1, 22],
    [3, 1, 2, 23],
    [3, 2, 0, 0],
    [3, 2, 1, 1],
    [3, 2, 2, 2],
    // face 4
    [4, 0, 0, 0],
    [4, 0, 1, 3],
    [4, 0, 2, 6],
    [4, 1, 0, 21],
    [4, 1, 1, 24],
    [4, 1, 2, 9],
    [4, 2, 0, 18],
    [4, 2, 1, 15],
    [4, 2, 2, 12],
    // face 5
    [5, 0, 0, 8],
    [5, 0, 1, 5],
    [5, 0, 2, 2],
    [5, 1, 0, 11],
    [5, 1, 1, 25],
    [5, 1, 2, 23],
    [5, 2, 0, 14],
    [5, 2, 1, 17],
    [5, 2, 2, 20]
  ]);
});

describe('test lookup resolution 3', () => {
  const sidesStart = 4 * 3 * 4;
  const sidesVertex = 2 * 2;
  testAll(3, [
    [4, 0, 0, 0],
    [4, 0, 1, 4],
    [4, 1, 1, sidesStart],
    [4, 1, 2, sidesStart + 1],
    [4, 1, 3, 16],
    [4, 2, 1, sidesStart + 2],
    [4, 2, 2, sidesStart + 3],
    [4, 2, 3, 20],
    [5, 0, 0, 15],
    [5, 0, 1, 11],
    [5, 1, 1, sidesStart + sidesVertex],
    [5, 1, 2, sidesStart + sidesVertex + 1],
    [5, 1, 3, 47],
    [5, 2, 1, sidesStart + sidesVertex + 2],
    [5, 2, 2, sidesStart + sidesVertex + 3],
    [5, 2, 3, 43]
  ]);
});

function testAll(resolution: number, testCases: [face: number, row: number, col: number, index: number][]): void {
  const lookup = vertexIndexLookup(resolution);
  test.each(testCases)('vertex index at face %i row %i column %i should be %i', (face, row, col, expected) => {
    const index = lookup(face, row, col);
    expect(index).toBe(expected);
  });
}
