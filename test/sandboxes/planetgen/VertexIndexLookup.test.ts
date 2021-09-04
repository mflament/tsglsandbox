import {vertexIndexLookup} from "../../../src/sandboxes/planetgen/VertexIndexLookup";

test('test lookup resolution 2', () => {
  const lookup = vertexIndexLookup(2);
  expect(lookup(0, 0, 0)).toBe(0);
  expect(lookup(0, 0, 1)).toBe(1);
  expect(lookup(0, 1, 0)).toBe(2);
  expect(lookup(0, 1, 1)).toBe(3);

  expect(lookup(1, 0, 0)).toBe(lookup(0, 1, 0));
  expect(lookup(1, 0, 1)).toBe(lookup(0, 1, 1));

  expect(lookup(2, 0, 0)).toBe(lookup(1, 1, 0));
  expect(lookup(2, 0, 1)).toBe(lookup(1, 1, 1));

  expect(lookup(3, 0, 0)).toBe(lookup(2, 1, 0));
  expect(lookup(3, 0, 1)).toBe(lookup(2, 1, 1));
  expect(lookup(3, 1, 0)).toBe(lookup(0, 0, 0));
  expect(lookup(3, 1, 1)).toBe(lookup(0, 0, 1));

  expect(lookup(1, 0, 1)).toBe(3);
  expect(lookup(3, 0, 0)).toBe(6);
  expect(lookup(3, 0, 1)).toBe(7);

  expect(lookup(0, 1, 0)).toBe(lookup(1, 0, 0));
  expect(lookup(3, 1, 0)).toBe(lookup(0, 0, 0));

  expect(lookup(4, 0, 0)).toBe(lookup(0, 0, 0));
  expect(lookup(4, 0, 1)).toBe(lookup(1, 0, 0));
  expect(lookup(4, 1, 0)).toBe(lookup(3, 0, 0));
  expect(lookup(4, 1, 1)).toBe(lookup(2, 0, 0));

  expect(lookup(5, 0, 0)).toBe(lookup(1, 0, 1));
  expect(lookup(5, 0, 1)).toBe(lookup(0, 0, 1));
  expect(lookup(5, 1, 0)).toBe(lookup(2, 0, 1));
  expect(lookup(5, 1, 1)).toBe(lookup(3, 0, 1));
});

test('test lookup resolution 3', () => {
  const lookup = vertexIndexLookup(3);
  expect(lookup(0, 0, 0)).toBe(0);
  expect(lookup(0, 0, 1)).toBe(1);
  expect(lookup(0, 0, 2)).toBe(2);
  expect(lookup(0, 1, 0)).toBe(3);

  expect(lookup(1, 0, 0)).toBe(lookup(0, 2, 0));
  expect(lookup(1, 0, 1)).toBe(lookup(0, 2, 1));
  expect(lookup(1, 0, 2)).toBe(lookup(0, 2, 2));

  expect(lookup(4, 0, 0)).toBe(lookup(0, 0, 0));
  expect(lookup(4, 0, 1)).toBe(lookup(0, 1, 0));
  expect(lookup(4, 0, 2)).toBe(lookup(1, 0, 0));
  expect(lookup(4, 1, 0)).toBe(lookup(3, 1, 0));
  expect(lookup(4, 1, 1)).toBe(3 * 2 * 4);
  expect(lookup(4, 1, 2)).toBe(lookup(1, 1, 0));
  expect(lookup(4, 2, 0)).toBe(lookup(3, 0, 0));
  expect(lookup(4, 2, 1)).toBe(lookup(2, 1, 0));
  expect(lookup(4, 2, 2)).toBe(lookup(2, 0, 0));


  expect(lookup(5, 0, 0)).toBe(lookup(1, 0, 2));
  expect(lookup(5, 0, 1)).toBe(lookup(0, 1, 2));
  expect(lookup(5, 0, 2)).toBe(lookup(0, 0, 2));
  expect(lookup(5, 1, 0)).toBe(lookup(1, 1, 2));
  expect(lookup(5, 1, 1)).toBe(3 * 2 * 4 + 1);
  expect(lookup(5, 1, 2)).toBe(lookup(3, 1, 2));
  expect(lookup(5, 2, 0)).toBe(lookup(2, 0, 2));
  expect(lookup(5, 2, 1)).toBe(lookup(2, 1, 2));
  expect(lookup(5, 2, 2)).toBe(lookup(3, 0, 2));
});
