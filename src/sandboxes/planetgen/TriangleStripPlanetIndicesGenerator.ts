import {PlanetIndices} from "./Planet";
import {DrawMode} from "../../gl/buffers/BufferEnums";
import {PlanetIndicesGenerator} from "./PlanetGenerator";

export class TriangleStripPlanetIndicesGenerator implements PlanetIndicesGenerator {
  generate(resolution: number, indices?: PlanetIndices): PlanetIndices {
    const indicesCount = 5 * (resolution * 2 + 1) + resolution * 2;
    let array = indices?.array;
    if (!array || array.length < indicesCount) {
      array = new Uint32Array(indicesCount);
    }

    const mainRows = (resolution - 1) * 4;
    let vertexOffset;
    let indexOffset = 0;

    for (let row = 0; row < mainRows; row++) {
      vertexOffset = row * resolution;
      array[indexOffset++] = vertexOffset;
      array[indexOffset++] = row < mainRows - 1 ? vertexOffset + resolution : 0;
      for (let col = 1; col < resolution; col++) {
        array[indexOffset++] = vertexOffset + col;
        array[indexOffset++] = row < mainRows - 1 ? vertexOffset + resolution + col : col;
      }
      array[indexOffset++] = 0xFFFFFFFF;
    }

    // if (indexOffset < indicesCount)
    //   throw new Error("Missing some indices");

    return {array: array, count: indicesCount, mode: DrawMode.TRIANGLE_STRIP};
  }
}
