// Draws the grid (plus an optional brush preview) to a canvas.

export class Renderer {
  constructor(canvas, game, cellSize = 8) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.cellSize = cellSize;
    this.color = '#00e0ff';
  }

  setCellSize(size) {
    this.cellSize = size;
  }

  draw(brush = null) {
    const { ctx, game, cellSize } = this;

    // Background.
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Live cells.
    ctx.fillStyle = this.color;
    for (let y = 0; y < game.rows; y++) {
      for (let x = 0; x < game.cols; x++) {
        if (game.get(x, y) === 1) {
          ctx.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);
        }
      }
    }

    // Brush preview ghost.
    if (brush && brush.matrix && brush.x != null) {
      const w = brush.matrix[0].length;
      const h = brush.matrix.length;
      const ox = brush.x - Math.floor(w / 2);
      const oy = brush.y - Math.floor(h / 2);
      ctx.fillStyle = 'rgba(255, 215, 0, 0.55)';
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (brush.matrix[y][x]) {
            const gx = x + ox;
            const gy = y + oy;
            if (gx >= 0 && gx < game.cols && gy >= 0 && gy < game.rows) {
              ctx.fillRect(gx * cellSize, gy * cellSize, cellSize - 1, cellSize - 1);
            }
          }
        }
      }
    }
  }
}

// Render a small icon of a pattern matrix into a canvas element.
export function drawPatternIcon(canvas, matrix, color = '#00e0ff') {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  ctx.clearRect(0, 0, size, size);
  const w = matrix[0].length;
  const h = matrix.length;
  const cell = Math.max(1, Math.floor(Math.min(size / (w + 1), size / (h + 1))));
  const offX = Math.floor((size - cell * w) / 2);
  const offY = Math.floor((size - cell * h) / 2);
  ctx.fillStyle = color;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (matrix[y][x]) {
        ctx.fillRect(offX + x * cell, offY + y * cell, cell, cell);
      }
    }
  }
}
