import {vec2} from 'gl-matrix';

//https://en.wikipedia.org/wiki/Quadtree

export class AABB {
  constructor(readonly center: vec2, public halfDimension: vec2) {}

  get xmin(): number {
    return this.center[0] - this.halfDimension[0];
  }

  get xmax(): number {
    return this.center[0] + this.halfDimension[0];
  }

  get ymin(): number {
    return this.center[1] - this.halfDimension[1];
  }

  get ymax(): number {
    return this.center[1] + this.halfDimension[1];
  }

  contains(p: vec2): boolean {
    return p[0] >= this.xmin && p[0] < this.xmax && p[1] >= this.ymin && p[1] < this.ymax;
  }

  intersects(other: AABB): boolean {
    return !(this.xmax <= other.xmin || this.xmin > other.xmax || this.ymax <= other.ymin || this.ymin > other.ymax);
  }
}

enum Quad {
  NW = 0,
  NE = 1,
  SW = 2,
  SE = 3
}

const DEFAULT_BOUNDARY = new AABB([0, 0], [1, 1]);

export class QuadTree {
  private readonly points: vec2[] = [];
  children?: QuadTree[];

  /**
   * @param boundary Axis-aligned bounding box stored as a center with half-dimensions to represent the boundaries of this quad tree
   * @param nodeCapacity constant to indicate how many elements can be stored in this quad tree node
   */
  constructor(readonly boundary: AABB = DEFAULT_BOUNDARY, readonly nodeCapacity = 4) {}

  insert(point: vec2): boolean {
    // Ignore objects that do not belong in this quad tree
    if (!this.boundary.contains(point)) return false;

    // If there is space in this quad tree and if doesn't have subdivisions, add the object here
    if (this.points.length < this.nodeCapacity && this.children === undefined) {
      this.points.push(vec2.clone(point));
      return true;
    }

    // Otherwise, subdivide and then add the point to whichever node will accept it
    if (this.children === undefined) this.children = this.split();

    //We have to add the points/data contained into this quad array to the new quads if we only want
    //the last node to hold the data
    for (const child of this.children) {
      if (child.insert(point)) return true;
    }

    // Otherwise, the point cannot be inserted for some unknown reason (this should never happen)
    throw new Error('Can not insert ' + point);
  }

  query(range: AABB = this.boundary): vec2[] {
    const res: vec2[] = [];

    // Automatically abort if the range does not intersect this quad
    if (!this.boundary.intersects(range)) return res; // empty list

    // Check objects at this quad level
    this.points.filter(p => range.contains(p)).forEach(p => res.push(p));

    // Terminate here, if there are no children
    if (this.children === undefined) return res;

    for (const child of this.children) {
      res.push(...child.query(range));
    }

    return res;
  }

  contains(range: AABB = this.boundary): boolean {
    // Automatically abort if the range does not intersect this quad
    if (!this.boundary.intersects(range)) return false;

    // Check objects at this quad level
    if (this.points.some(p => range.contains(p))) return true;

    // Terminate here, if there are no children
    if (this.children === undefined) return false;

    return this.children.some(c => c.contains(range));
  }

  private split(): QuadTree[] {
    const hhd: vec2 = [this.boundary.halfDimension[0] / 2, this.boundary.halfDimension[1] / 2];
    const left = this.boundary.center[0] - hhd[0];
    const right = this.boundary.center[0] + hhd[0];
    const top = this.boundary.center[1] - hhd[1];
    const bottom = this.boundary.center[1] + hhd[1];
    const children: QuadTree[] = new Array(4);
    children[Quad.NW] = new QuadTree(new AABB([left, top], hhd));
    children[Quad.NE] = new QuadTree(new AABB([right, top], hhd));
    children[Quad.SW] = new QuadTree(new AABB([left, bottom], hhd));
    children[Quad.SE] = new QuadTree(new AABB([right, bottom], hhd));
    return children;
  }
}
