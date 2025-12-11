// engine.js
// Sudoku generator + solver with UNIQUE-solution puzzles.

/* =========================
   Basic helpers
   ========================= */

const ROWS = 9;
const COLS = 9;

// Deep copy a 9x9 board
function cloneBoard(board) {
  const copy = [];
  for (let r = 0; r < ROWS; r++) {
    copy[r] = board[r].slice();
  }
  return copy;
}

// Create a blank 9x9 puzzle filled with 0s
function createBlankBoard() {
  const board = [];
  for (let r = 0; r < ROWS; r++) {
    const row = new Array(COLS).fill(0);
    board.push(row);
  }
  return board;
}

/* =========================
   Validity checks
   ========================= */

// Check if placing num at (row, col) is valid
function isSafe(board, row, col, num) {
  // Row
  for (let c = 0; c < COLS; c++) {
    if (board[row][c] === num) return false;
  }

  // Column
  for (let r = 0; r < ROWS; r++) {
    if (board[r][col] === num) return false;
  }

  // 3x3 box
  const boxRowStart = Math.floor(row / 3) * 3;
  const boxColStart = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (board[boxRowStart + r][boxColStart + c] === num) return false;
    }
  }

  return true;
}

/* =========================
   Backtracking solver
   ========================= */

// Solve a board in place, stop at the first solution
function solveBoard(board) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (board[row][col] === 0) {
        // Try digits 1-9
        const nums = shuffleArray([1,2,3,4,5,6,7,8,9]);
        for (let i = 0; i < nums.length; i++) {
          const num = nums[i];
          if (isSafe(board, row, col, num)) {
            board[row][col] = num;
            if (solveBoard(board)) {
              return true;
            }
            board[row][col] = 0;
          }
        }
        return false; // no number works here
      }
    }
  }
  // No empty cells, solved
  return true;
}

// Count how many solutions the board has, up to a limit.
// If solutions reach `limit`, we stop and return at least that many.
function countSolutions(board, limit) {
  let solutions = 0;

  function backtrack() {
    if (solutions >= limit) return; // already enough

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (board[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isSafe(board, row, col, num)) {
              board[row][col] = num;
              backtrack();
              board[row][col] = 0;

              if (solutions >= limit) return;
            }
          }
          return; // no number works here, backtrack
        }
      }
    }
    // No empty cells, found a complete solution
    solutions += 1;
  }

  backtrack();
  return solutions;
}

/* =========================
   Generation helpers
   ========================= */

// Fisher Yates shuffle for small arrays
function shuffleArray(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

// Generate a fully solved valid Sudoku board
function generateFullSolution() {
  const board = createBlankBoard();

  // Fill diagonal 3x3 boxes first
  for (let box = 0; box < 3; box++) {
    fillBox(board, box * 3, box * 3);
  }

  // Then solve the rest
  solveBoard(board);
  return board;
}

// Fill a 3x3 box starting at (rowStart, colStart) with random 1-9
function fillBox(board, rowStart, colStart) {
  const nums = shuffleArray([1,2,3,4,5,6,7,8,9]);
  let idx = 0;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      board[rowStart + r][colStart + c] = nums[idx++];
    }
  }
}

/* =========================
   Remove cells while keeping uniqueness
   ========================= */

// Remove up to `blanksTarget` cells, ensuring the puzzle has a unique solution.
// If uniqueness would be broken, we undo that removal.
function removeCellsWithUniqueness(puzzle, blanksTarget) {
  const coords = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      coords.push({ r, c });
    }
  }

  // Randomize order in which we try removing
  const shuffled = shuffleArray(coords);
  let blanks = 0;

  for (let i = 0; i < shuffled.length && blanks < blanksTarget; i++) {
    const { r, c } = shuffled[i];
    if (puzzle[r][c] === 0) continue;

    const backup = puzzle[r][c];
    puzzle[r][c] = 0;

    const testBoard = cloneBoard(puzzle);
    const numSolutions = countSolutions(testBoard, 2);

    // If not exactly one solution, revert
    if (numSolutions !== 1) {
      puzzle[r][c] = backup;
    } else {
      blanks += 1;
    }
  }
}

/* =========================
   Main API
   ========================= */

// difficulty: "e", "m", or "h"
function generatePuzzle(difficulty) {
  // 1) Generate a fully solved board
  const solution = generateFullSolution();

  // 2) Clone it for the puzzle
  const puzzle = cloneBoard(solution);

  // 3) Decide how many blanks to aim for
  let blanks;
  if (difficulty === "h") {
    blanks = 50;
  } else if (difficulty === "m") {
    blanks = 40;
  } else {
    blanks = 30; // easy by default
  }

  // 4) Remove cells but keep a unique solution
  removeCellsWithUniqueness(puzzle, blanks);

  // 5) Return both puzzle and full solution to script.js
  return {
    puzzle,
    solution
  };
}
