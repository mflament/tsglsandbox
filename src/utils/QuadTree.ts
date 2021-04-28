import { vec2 } from 'gl-matrix';

//https://en.wikipedia.org/wiki/Quadtree

export class AABB {
  constructor(readonly center: vec2, public halfDimension: number) {}

  get xmin(): number {
    return this.center[0] - this.halfDimension;
  }

  get xmax(): number {
    return this.center[0] + this.halfDimension;
  }

  get ymin(): number {
    return this.center[1] - this.halfDimension;
  }

  get ymax(): number {
    return this.center[1] + this.halfDimension;
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

const DEFAULT_BOUNDARY = new AABB([0, 0], 1);

export class QuadTreeNode {
  private readonly points: vec2[] = [];
  children?: QuadTreeNode[];

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
      this.points.push(point);
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

  private split(): QuadTreeNode[] {
    const hhd = this.boundary.halfDimension / 2;
    const left = this.boundary.center[0] - hhd;
    const top = this.boundary.center[1] - hhd;
    const right = this.boundary.center[0] + hhd;
    const bottom = this.boundary.center[1] + hhd;
    const children: QuadTreeNode[] = new Array(4);
    children[Quad.NW] = new QuadTreeNode(new AABB([left, top], hhd));
    children[Quad.NE] = new QuadTreeNode(new AABB([right, top], hhd));
    children[Quad.SW] = new QuadTreeNode(new AABB([left, bottom], hhd));
    children[Quad.SE] = new QuadTreeNode(new AABB([right, bottom], hhd));
    return children;
  }
}
