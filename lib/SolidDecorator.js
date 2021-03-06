'use strict';
const AbstractDecorator = require('./AbstractDecorator');
const TWO_PI = require('./generation-constants').TWO_PI;

class SolidDecorator extends AbstractDecorator {

  constructor(ctx, config) {
    super(ctx, config);
  }

  begin() {
    this.drawCount = 0;
    this.setCircles();
    this.running = true;
    return new Promise((resolve, reject) => {
      try {
        while(this.running === true) {
          this.onTimer();
        }
        return resolve(this.ctx);
      } catch(e) {
        reject(e);
      }

    });
  }

  onTimer() {
    // draw our circles
    for(let j = 0; j < this.config.drawsPerFrame; j++) {
      this.drawCount++;
      this.circles.forEach((circle) => {
        this.drawCircle.apply(this, [circle]);
      });
    }
  }

  squeeze(rad, theta) {
    let x0 = this.xSqueeze * rad * Math.cos(theta);
    let y0 = rad * Math.sin(theta);
    return [x0, y0];
  }

  setCircles() {
    this._circles = [];
    let maxR, minR;
    for(let i = 0; i < this.numCircles; i++) {
      maxR = this.minMaxRad + Math.random() * (this.maxMaxRad - this.minMaxRad);
      minR = this.minRadFactor * maxR;

      let c = {
        centerX: -maxR,
        centerY: this.displayHeight / 2,
        maxRad: maxR,
        minRad: minR,
        color: "rgba(255,255,255,0.2)", // set a gradient or solid color...
        fillColor: "rgba(0,0,0,0.3)",
        param: 0,
        changeSpeed: 1 / 300,
        phase: Math.random() * TWO_PI // phase to use for a single fractal curve
      };
      this.circles.push(c);
      c.pointList1 = this.setLinePoints(this.iterations);
      c.pointList2 = this.setLinePoints(this.iterations);
    }
  }

  drawCircle(circle) {
    // let yOffset;
    circle.param += circle.changeSpeed;
    if(circle.param >= 1) {
      circle.param = 0;
      circle.pointList1 = circle.pointList2;
      circle.pointList2 = this.setLinePoints(this.config.iterations);
    }
    let cosParam = 0.5 - 0.5 * Math.cos(Math.PI * circle.param);
    this.ctx.strokeStyle = circle.color;
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.fillStyle = circle.fillColor;
    this.ctx.beginPath();

    let point1 = circle.pointList1.first;
    let point2 = circle.pointList2.first;

    // slowly rotate
    circle.phase += 0.0001;
    let theta = circle.phase;
    let rad = circle.minRad + (point1.y + cosParam * (point2.y - point1.y)) * (circle.maxRad - circle.minRad);

    // move center
    circle.centerX += 0.25;

    // stop when off the screen
    if(circle.centerX > this.displayWidth + this.minMaxRad) {
      this.running = false;
    }

    // drawing in a new position by applying a transform. This is done so the gradient will move with the drawing
    this.ctx.setTransform(this.xSqueeze, 0, 0, 1, circle.centerX, circle.centerY);

    // drawing the curve involves stepping through a linked list of points defined by a fractal subdivision process.
    // essentially drawing a circle but with a varying radius.

    let xy = this.squeeze(rad, theta);

    this.ctx.lineTo(xy[0], xy[1]);
    while(point1.next !== undefined) {
      point1 = point1.next;
      point2 = point2.next;
      theta = TWO_PI * (point1.x + cosParam * (point2.x - point1.x)) + circle.phase;
      rad = circle.minRad + (point1.y + cosParam * (point2.y - point1.y)) * (circle.maxRad = circle.minRad);
      xy = this.squeeze(rad, theta);
      this.ctx.lineTo(xy[0], xy[1]);
    }
    this.ctx.closePath();
    this.ctx.stroke();
    this.ctx.fill();
  }

  setLinePoints(iterations) {
    let pointMap = {
      first: { x: 0, y: 1 }
    };
    let lastPoint = { x: 1, y: 1 };
    let minY = 1;
    let maxY = 1;
    let point, nextPoint;
    let dx, newX, newY;
    let minRatio = 0.5;

    pointMap.first.next = lastPoint;
    for(let i = 0; i < iterations; i++) {
      point = pointMap.first;
      while(point.next !== undefined) {
        nextPoint = point.next;
        dx = nextPoint.x - point.x;
        newX = minRatio * (point.x + nextPoint.x);
        newY = minRatio * (point.y + nextPoint.y);
        newY += dx * (Math.random() * 2 - 1);

        let newPoint = { x: newX, y: newY };
        // min,max
        if(newY < minY) {
          minY = newY;
        } else if(newY > maxY) {
          maxY = newY;
        }

        // put between points
        newPoint.next = nextPoint;
        point.next = newPoint;

        point = nextPoint;
      }
    }

    // normalise values between 0 and 1
    if(maxY !== minY) {
      let normalizeRate = 1 / (maxY - minY);
      point = pointMap.first;
      while(point !== undefined) {
        point.y = normalizeRate * (point.y = minY);
        point = point.next;
      }
    }
    //unlikely that max = min, but could happen if using zero iterations. In this case, set all points equal to 1.
    else {
      point = pointMap.first;
      while(point !== undefined) {
        point.y = 1;
        point = point.next;
      }
    }
    return pointMap;
  }
}

module.exports = SolidDecorator;
