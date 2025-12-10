// engine.js
// Port of your Java Generator + Solver logic into JavaScript.

// Constants for board size
const ROWS = 9;
const COLS = 9;

/* =========================
   Core puzzle generation
   ========================= */

// Create a blank 9x9 puzzle filled with 0s
function createBlankPuzzle() {
  const board = [];
  for (let r = 0; r < ROWS; r++) {
    const row = new Array(COLS).fill(0);
    board.push(row);
  }
  return board;
}

// Check if num is allowed in given row
function checkRow(row, num, puzzle) {
  for (let c = 0; c < COLS; c++) {
    if (puzzle[row][c] === num) {
      return false;
    }
  }
  return true;
}

// Check if num is allowed in given col
function checkCol(col, num, puzzle) {
  for (let r = 0; r < ROWS; r++) {
    if (puzzle[r][col] === num) {
      return false;
    }
  }
  return true;
}

// Given row, col, return which 3x3 box (1..9) it's in
function getBox(row, col) {
  const boxRow = Math.floor(row / 3);
  const boxCol = Math.floor(col / 3);
  // boxes numbered:
  // 1 2 3
  // 4 5 6
  // 7 8 9
  return boxRow * 3 + boxCol + 1;
}

// Check if num is allowed in given 3x3 box
function checkBox(box, num, puzzle) {
  // Convert box number back to top-left row/col of that box
  const boxRowIndex = Math.floor((box - 1) / 3) * 3;
  const boxColIndex = ((box - 1) % 3) * 3;

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (puzzle[boxRowIndex + i][boxColIndex + j] === num) {
        return false;
      }
    }
  }
  return true;
}

// Combined check: row + col + box
function checkValue(num, row, col, puzzle) {
  if (!checkRow(row, num, puzzle)) return false;
  if (!checkCol(col, num, puzzle)) return false;

  const box = getBox(row, col);
  if (!checkBox(box, num, puzzle)) return false;

  return true;
}

// Shuffle the candidate values array in-place (like your swap algorithm)
function shuffleValues(values) {
  for (let i = 0; i < values.length; i++) {
    const swapSpot1 = Math.floor(Math.random() * values.length);
    const swapSpot2 = Math.floor(Math.random() * values.length);

    const hold = values[swapSpot1];
    values[swapSpot1] = values[swapSpot2];
    values[swapSpot2] = hold;
  }
}

// Recursive backtracking fill, like your fillCell in Java
function fillCell(row, col, puzzle, values) {
  if (row === ROWS) {
    // Board is full
    return true;
  }

  // Compute next row/col
  let nextRow = row;
  let nextCol = col + 1;
  if (nextCol === COLS) {
    nextRow = row + 1;
    nextCol = 0;
  }

  // Shuffle values 1–9 before trying them
  shuffleValues(values);

  for (let i = 0; i < values.length; i++) {
    const num = values[i];

    if (checkValue(num, row, col, puzzle)) {
      // Place the number
      puzzle[row][col] = num;

      // Recurse to fill next cell
      if (fillCell(nextRow, nextCol, puzzle, values)) {
        return true;
      }

      // Backtrack (0 = blank)
      puzzle[row][col] = 0;
    }
  }

  // No number worked here; signal failure to caller
  return false;
}

// Create a fully solved Sudoku puzzle (like createPuzzle in Java)
function createPuzzle() {
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const puzzle = createBlankPuzzle();
  fillCell(0, 0, puzzle, values);
  return puzzle;
}

/* =========================
   Solver logic (port of Solver.java)
   ========================= */

// Clone a 2D array
function clonePuzzle(puzzle) {
  return puzzle.map(row => row.slice());
}

// Public entry: check if puzzle is solvable
function isSolvable(puzzle) {
  const copy = clonePuzzle(puzzle);
  return solve(copy);
}

// Start solving at (0,0)
function solve(puzzle) {
  return solveCell(0, 0, puzzle);
}

// Recursive backtracking solver, like solveCell in Java
function solveCell(row, col, puzzle) {
  if (row === 9) {
    // Reached past last row → solved
    return true;
  }

  let nextRow = row;
  let nextCol = col + 1;
  if (nextCol === 9) {
    nextRow++;
    nextCol = 0;
  }

  // If cell is already filled, skip to next
  if (puzzle[row][col] !== 0) {
    return solveCell(nextRow, nextCol, puzzle);
  } else {
    // Try numbers 1–9 in this empty cell
    for (let num = 1; num <= 9; num++) {
      if (checkValue(num, row, col, puzzle)) {
        puzzle[row][col] = num;

        if (solveCell(nextRow, nextCol, puzzle)) {
          return true;
        } else {
          puzzle[row][col] = 0; // backtrack
        }
      }
    }
  }

  return false;
}

/* =========================
   Remove cells with guarantee
   ========================= */

// Remove `blanks` cells, but only keep removals that leave puzzle solvable
function removeCellsWithGuarantee(puzzle, blanks) {
  let attempts = blanks;

  while (attempts > 0) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);

    if (puzzle[row][col] === 0) {
      // Already empty, skip
      continue;
    }

    const backup = puzzle[row][col];
    puzzle[row][col] = 0;

    // If this removal makes it unsolvable, undo it
    if (!isSolvable(puzzle)) {
      puzzle[row][col] = backup;
    } else {
      attempts--;
    }
  }
}

/* =========================
   Public API for the UI: generatePuzzle(difficulty)
   ========================= */

function generatePuzzle(difficulty) {
  // 1) Build a full valid solution
  const puzzle = createPuzzle();

  // 2) Decide how many blanks based on difficulty
  let blanks;
  if (difficulty === "h") {
    blanks = 50;
  } else if (difficulty === "m") {
    blanks = 40;
  } else {
    blanks = 30; // default easy
  }

  // 3) Remove cells, but keep puzzle solvable
  removeCellsWithGuarantee(puzzle, blanks);

  // 4) Return the puzzle to script.js
  return puzzle;
}
