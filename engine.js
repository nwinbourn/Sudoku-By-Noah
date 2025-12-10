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

// Check if a value is valid at (row, col) in a puzzle
function checkValue(value, row, col, puzzle) {
  // Row check
  for (let c = 0; c < COLS; c++) {
    if (puzzle[row][c] === value) {
      return false;
    }
  }

  // Column check
  for (let r = 0; r < ROWS; r++) {
    if (puzzle[r][col] === value) {
      return false;
    }
  }

  // 3x3 box check
  const boxRowStart = Math.floor(row / 3) * 3;
  const boxColStart = Math.floor(col / 3) * 3;

  for (let r = boxRowStart; r < boxRowStart + 3; r++) {
    for (let c = boxColStart; c < boxColStart + 3; c++) {
      if (puzzle[r][c] === value) {
        return false;
      }
    }
  }

  return true;
}

// Fisher–Yates shuffle for an array
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = array[i];
    array[i] = array[j];
    array[j] = tmp;
  }
}

// Recursive function to fill the board with a valid solution
function fillCell(row, col, puzzle, values) {
  if (row === ROWS) {
    return true; // Reached past last row → solved
  }

  let nextRow = row;
  let nextCol = col + 1;
  if (nextCol === COLS) {
    nextRow++;
    nextCol = 0;
  }

  // If this cell is already filled, skip to next
  if (puzzle[row][col] !== 0) {
    return fillCell(nextRow, nextCol, puzzle, values);
  }

  // Try shuffled 1–9
  shuffle(values);
  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    if (checkValue(val, row, col, puzzle)) {
      puzzle[row][col] = val;

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
   Solver logic (for checking solvability)
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

  return false; // no value worked
}

/* =========================
   Cell-removal logic
   ========================= */

// Remove a value from the board at (row, col) and check uniqueness
// We'll adapt your Java "removeCells" approach: try removing cells while
// making sure the puzzle still has at least one solution.
function removeCellsWithGuarantee(puzzle, blanksToRemove) {
  let attempts = blanksToRemove;

  while (attempts > 0) {
    const row = Math.floor(Math.random() * ROWS);
    const col = Math.floor(Math.random() * COLS);

    if (puzzle[row][col] === 0) {
      continue; // already blank
    }

    const backup = puzzle[row][col];
    puzzle[row][col] = 0;

    // Check if puzzle is still solvable
    const valid = isSolvable(puzzle);
    if (!valid) {
      // revert if unsolvable
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
  const solution = createPuzzle();

  // 2) Clone solution to make a puzzle we can punch holes in
  const puzzle = clonePuzzle(solution);

  // 3) Decide how many blanks based on difficulty
  let blanks;
  if (difficulty === "h") {
    blanks = 50;
  } else if (difficulty === "m") {
    blanks = 40;
  } else {
    blanks = 30; // default easy
  }

  // 4) Remove cells, but keep puzzle solvable
  removeCellsWithGuarantee(puzzle, blanks);

  // 5) Return both puzzle and full solution to script.js
  return { puzzle, solution };
}
