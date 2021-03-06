const w = window.innerWidth;
const h = window.innerHeight;

// Set maximum frame rate
const fr = 30;

const shift_key = 16;
const S_key = 83;
const R_key = 82;

const radius = 20;
const stick_thickness = 4;

const gravity = 9.8;
const timeDelta = 0.5;

const numIterations = 20;

const cut_dist = 5;

/**
 * Class that represent a point of the mesh
 */
class Point {
  /**
   * Class contructor
   * @param {Number} x X position
   * @param {Number} y Y position
   * @param {Boolean} locked Defines if the point is locked in space or if it can move
   */
  constructor(x, y, locked = false) {
    this.position = createVector(x, y);
    this.prevPosition = createVector(x, y);
    this.locked = locked;
  }

  draw() {
    if (this.locked) {
      fill(250, 20, 20);
    } else {
      fill(250);
    }
    strokeWeight(0);
    stroke(0);
    circle(this.position.x, this.position.y, radius);
  }
}

/**
 * Class that represents a rigid stick connecting 2 points
 */
class Stick {
  /**
   * Class contructor
   * @param {Point} pointA
   * @param {Point} pointB
   */
  constructor(pointA, pointB) {
    this.pointA = pointA;
    this.pointB = pointB;
    this.length = dist(
      pointA.position.x,
      pointA.position.y,
      pointB.position.x,
      pointB.position.y
    );
  }

  draw() {
    strokeWeight(stick_thickness);
    stroke(250);
    line(
      this.pointA.position.x,
      this.pointA.position.y,
      this.pointB.position.x,
      this.pointB.position.y
    );
  }
}

/**
 * @type {Point[]}
 */
let points = [];

/**
 * @type {Stick[]}
 */
let sticks = [];

let start = false;

/**
 * P5.js setup function. Called just once at the beginning.
 */
function setup() {
  createCanvas(w, h);
  frameRate(fr);
}

let dragged_stick = false;
let cutDragged = false;
let startDrag = null;

/**
 * P5.js mouse released function.
 */
function mouseReleased() {
  const dragDist = startDrag
    ? dist(startDrag.x, startDrag.y, mouseX, mouseY)
    : 0;
  if (dragged_stick && dragDist > radius) {
    let minDist = 100000;
    let minStartPoint = null;
    for (const point of points) {
      const thisDist = dist(
        startDrag.x,
        startDrag.y,
        point.position.x,
        point.position.y
      );
      if (thisDist < minDist) {
        minDist = thisDist;
        minStartPoint = point;
      }
    }
    if (minDist > radius) {
      cutDragged = false;
      dragged_stick = false;
      return false;
    }
    minDist = 100000;
    let minEndPoint = null;
    for (const point of points) {
      const thisDist = dist(mouseX, mouseY, point.position.x, point.position.y);
      if (thisDist < minDist) {
        minDist = thisDist;
        minEndPoint = point;
      }
    }
    if (minDist > radius) {
      dragged_stick = false;
      cutDragged = false;
      return false;
    }
    sticks.push(new Stick(minStartPoint, minEndPoint));
  } else if (!cutDragged && !dragged_stick) {
    if (keyIsDown(shift_key)) {
      points.push(new Point(mouseX, mouseY, true));
    } else {
      points.push(new Point(mouseX, mouseY));
    }
  }
  dragged_stick = false;
  cutDragged = false;
  return false;
}

/**
 * P5.js function that is called upon mouse dragged.
 * @returns false to prevent default.s
 */
function mouseDragged() {
  if (keyIsDown(shift_key)) {
    cutDragged = true;
    dragged_stick = false;
    sticks = sticks.filter(
      (stick) =>
        distToSegment(
          createVector(mouseX, mouseY),
          stick.pointA.position,
          stick.pointB.position
        ) > cut_dist
    );
  } else if (!dragged_stick) {
    startDrag = createVector(mouseX, mouseY);
    dragged_stick = true;
  }
  // prevent default
  return false;
}

/**
 * P5.js draw function. This is called in a loop for every frame rendered.
 */
function draw() {
  background(50);

  textSize(20);
  fill(255);
  stroke(0);

  // Print FPS
  printFPS();

  // Print Title
  textAlign(CENTER);
  text("Verlet", w / 2, 40);

  // Print Instructions
  printInstructions();

  // Keys
  if (keyIsDown(S_key)) {
    start = true;
  }
  if (keyIsDown(R_key)) {
    start = false;
    dragged_stick = false;
    points = [];
    sticks = [];
  }

  if (start) {
    updatePositions();
  }

  if (dragged_stick) {
    strokeWeight(stick_thickness);
    stroke(250);
    line(startDrag.x, startDrag.y, mouseX, mouseY);
  }

  // Render
  for (const stick of sticks) {
    stick.draw();
  }

  for (const point of points) {
    point.draw();
  }
}

/**
 * Prints the number of frames per second.
 */
function printFPS() {
  textAlign(LEFT);
  let fps = frameRate();
  text("FPS: " + fps.toFixed(2), 20, 40);
}

/**
 *
 */
function printInstructions() {
  textAlign(LEFT);
  text("Instructions: ", 20, h - 90);
  text(
    "Mouse click => create point, Mouse click + Shift Key => create locked point, Mouse drag => connect points, Mouse drag + Shift Key => cut connections.",
    20,
    h - 60
  );
  text(
    "Press 's' => Start simulation, Press 'r': Reset simulation",
    20,
    h - 30
  );
}

/**
 * Function that computes the new position of each point and stick at each frame.
 */
function updatePositions() {
  for (const point of points) {
    if (!point.locked) {
      const positionBeforeUpdate = point.position;
      point.position = p5.Vector.add(
        point.position,
        p5.Vector.sub(point.position, point.prevPosition)
      );
      const gravity_vect = createVector(0, 1).mult(
        gravity * timeDelta * timeDelta
      );
      point.position = p5.Vector.add(point.position, gravity_vect);
      point.prevPosition = positionBeforeUpdate;
    }
  }

  for (let i = 0; i < numIterations; i++) {
    for (const stick of sticks) {
      const stickCenter = p5.Vector.add(
        stick.pointA.position,
        stick.pointB.position
      ).div(2);
      const stickDir = p5.Vector.sub(
        stick.pointA.position,
        stick.pointB.position
      )
        .normalize()
        .mult(stick.length / 2);

      if (!stick.pointA.locked) {
        stick.pointA.position = p5.Vector.add(stickCenter, stickDir);
      }
      if (!stick.pointB.locked) {
        stick.pointB.position = p5.Vector.sub(stickCenter, stickDir);
      }
    }
  }
}

// Distance point segment from: https://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segments
function sqr(x) {
  return x * x;
}
function dist2(v, w) {
  return sqr(v.x - w.x) + sqr(v.y - w.y);
}
function distToSegmentSquared(p, v, w) {
  var l2 = dist2(v, w);
  if (l2 == 0) return dist2(p, v);
  var t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist2(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
}
function distToSegment(p, v, w) {
  return Math.sqrt(distToSegmentSquared(p, v, w));
}
