import {PlanetIndices} from "./Planet";
import {Triangles} from "./Triangles";
import {DrawMode} from "gl";
import {
  PlanetIndicesGenerator,
  planetTriangles,
} from "./PlanetGenerator";

export class TrianglesPlanetIndicesGenerator implements PlanetIndicesGenerator {
  generate(resolution: number, indices?: PlanetIndices): PlanetIndices {
    const trianglesCount = planetTriangles(resolution);
    // const vertexCount = planetVertices(resolution);
    const indicesCount = trianglesCount * 3;
    let array = indices?.array;
    if (!array || array.length < indicesCount) {
      array = new Uint32Array(indicesCount);
    }

    const triangles = new Triangles(array);
    const squarePerRow = (resolution - 1);
    const mainRows = squarePerRow * 4;
    let vertexOffset, a, b, c, d;

    for (let row = 0; row < mainRows; row++) {
      vertexOffset = row * resolution;
      for (let col = 0; col < squarePerRow; col++) {
        a = vertexOffset + col;
        b = a + 1;
        c = row < mainRows - 1 ? a + resolution : col;
        d = c + 1;
        triangles.push(a, c, b);
        triangles.push(c, d, b);
      }
    }

    // if (resolution === 2) {
    //   a = 0;
    //   b = a+resolution;
    //   c = vertexCount - resolution;
    //   d = c - resolution;
    //   triangles.push(a, c, d);
    //   triangles.push(a, d, b);
    // }

    // const startVertex = 0;
    // const faceVertex = mainRows * resolution;
    // for (let row = 0; row < squarePerRow; row++) {
    //   for (let col = 0; col < squarePerRow; col++) {
    //     if (row === 0) {
    //       a = startVertex + resolution * col;
    //       b = a + resolution;
    //     } else {
    //       a = col === 0 ? vertexCount - (row + 1) * resolution : faceVertex + row * (resolution - 2);
    //       b = col === squarePerRow - 1 ? startVertex + squarePerRow * resolution + row * resolution : faceVertex ;
    //     }
    //     if (col === 0) {
    //       a = startVertex;
    //     } else if (row === 0) {
    //
    //     } else {
    //       a = faceVertex + (col - 1);
    //     }
    //   }
    // }

    return {array: array, count: indicesCount, mode: DrawMode.TRIANGLES};
  }
}
