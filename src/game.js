// The Game of Life simulation core. No rendering, no DOM — just the grid.

export class GameOfLife {
  constructor(cols, rows) {
    this.cols = 0;
    this.rows = 0;
    this.grid = null;
    this.next = null;
    this.generation = 0;
    this.resize(cols, rows);
  }

  // Grow/shrink the grid, preserving any overlapping cells.
  resize(cols, rows) {
    const newGrid = new Int8Array(cols * rows);
    const newNext = new Int8Array(cols * rows);
    if (this.grid) {
      const cw = Math.min(cols, this.cols);
      const ch = Math.min(rows, this.rows);
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          newGrid[y * cols + x] = this.grid[y * this.cols + x];
        }
      }
    }
    this.cols = cols;
    this.rows = rows;
    this.grid = newGrid;
    this.next = newNext;
  }

  get(x, y) {
    return this.grid[y * this.cols + x];
  }

  set(x, y, value) {
    this.grid[y * this.cols + x] = value ? 1 : 0;
  }

  clear() {
    this.grid.fill(0);
    this.generation = 0;
  }

  randomize(density = 0.25) {
    for (let i = 0; i < this.grid.length; i++) {
      this.grid[i] = Math.random() < density ? 1 : 0;
    }
    this.generation = 0;
  }

  // Place a cell matrix centered on (cx, cy). Cells outside the grid are clipped.
  stamp(matrix, cx, cy) {
    const h = matrix.length;
    const w = matrix[0].length;
    const ox = cx - Math.floor(w / 2);
    const oy = cy - Math.floor(h / 2);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (matrix[y][x]) {
          const gx = x + ox;
          const gy = y + oy;
          if (gx >= 0 && gx < this.cols && gy >= 0 && gy < this.rows) {
            this.set(gx, gy, 1);
          }
        }
      }
    }
  }

  // Advance one generation. Edges wrap around (toroidal topology).
  step() {
    const { cols, rows, grid, next } = this;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = (x + dx + cols) % cols;
            const ny = (y + dy + rows) % rows;
            n += grid[ny * cols + nx];
          }
        }
        const alive = grid[y * cols + x];
        next[y * cols + x] =
          alive === 1 ? (n === 2 || n === 3 ? 1 : 0) : n === 3 ? 1 : 0;
      }
    }
    // Swap buffers.
    this.grid = next;
    this.next = grid;
    this.generation++;
  }
}
