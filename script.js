let pencilMode = false;        // global toggle for pencil mode
let helpMode = true;           // global toggle for red wrong cells
let currentPuzzle = null;      // stores current puzzle grid
let currentSolution = null;    // stores full solved grid for checks and hints
let solvedAnimationActive = false; // prevent repeated solved animation

// =======================
// Board fill / puzzles
// =======================

function fillBoard(puzzle) {
  const rowDivs = document.querySelectorAll(".board .row");

  if (rowDivs.length !== 9) {
    console.error("Expected 9 rows but found", rowDivs.length);
    return;
  }

  for (let row = 0; row < 9; row++) {
    const inputs = rowDivs[row].querySelectorAll("input");

    if (inputs.length !== 9) {
      console.error(`Row ${row} expected 9 inputs but found`, inputs.length);
      continue;
    }

    for (let col = 0; col < 9; col++) {
      const value = puzzle[row][col];
      const cell = inputs[col];

      // coordinates for checking + hints
      cell.dataset.row = row;
      cell.dataset.col = col;

      // reset any classes when loading a new puzzle
      cell.classList.remove("highlight", "pencil", "given", "wrong", "hint");

      if (value === 0) {
        cell.value = "";
        cell.readOnly = false;   // user can edit blanks
      } else {
        cell.value = value;
        cell.readOnly = true;    // given clues are locked
        cell.classList.add("given");
      }
    }
  }
}

function loadPuzzle(difficulty) {
  try {
    // clear solved state
    solvedAnimationActive = false;
    const board = document.querySelector(".board");
    if (board) {
      board.classList.remove("solved");
    }
    const banner = document.getElementById("puzzle-solved-overlay");
    if (banner) {
      banner.style.display = "none";
    }

    // generatePuzzle returns { puzzle, solution } from engine.js
    const result = generatePuzzle(difficulty);
    const puzzle = result.puzzle;
    const solution = result.solution;

    currentPuzzle = puzzle;
    currentSolution = solution;

    fillBoard(puzzle);
    setActiveDifficulty(difficulty);
  } catch (err) {
    console.error("Failed to load puzzle:", err);
  }
}

function setActiveDifficulty(difficulty) {
  const buttons = document.querySelectorAll(".difficulty-btn");
  buttons.forEach((btn) => {
    const diff = btn.getAttribute("data-diff");
    if (diff === difficulty) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

// =======================
// Movement / navigation
// =======================

function moveFocusFromCell(currentInput, dRow, dCol) {
  const rowDivs = document.querySelectorAll(".board .row");
  if (rowDivs.length !== 9) return null;

  let currentRowIndex = -1;
  let currentColIndex = -1;

  // Find current cell's row and column
  for (let r = 0; r < 9; r++) {
    const inputs = rowDivs[r].querySelectorAll("input");
    for (let c = 0; c < inputs.length; c++) {
      if (inputs[c] === currentInput) {
        currentRowIndex = r;
        currentColIndex = c;
        break;
      }
    }
    if (currentRowIndex !== -1) break;
  }

  if (currentRowIndex === -1 || currentColIndex === -1) return null;

  let newRow = currentRowIndex + dRow;
  let newCol = currentColIndex + dCol;

  // Clamp to 0..8 so we don't go off the board
  newRow = Math.max(0, Math.min(8, newRow));
  newCol = Math.max(0, Math.min(8, newCol));

  const newInputs = rowDivs[newRow].querySelectorAll("input");
  if (newInputs.length === 9) {
    const nextCell = newInputs[newCol];
    nextCell.focus();
    return nextCell;
  }
  return null;
}

// =======================
// Help mode / wrong cells
// =======================

function checkCellCorrect(input) {
  // No solution yet, or this is a given cell, or help off, or pencil notes
  if (
    !currentSolution ||
    input.readOnly ||
    !helpMode ||
    input.classList.contains("pencil")
  ) {
    input.classList.remove("wrong");
    return;
  }

  const row = Number(input.dataset.row);
  const col = Number(input.dataset.col);

  if (Number.isNaN(row) || Number.isNaN(col)) {
    input.classList.remove("wrong");
    return;
  }

  const expected = String(currentSolution[row][col]);
  const value = input.value.trim();

  if (value === "" || value === expected) {
    input.classList.remove("wrong");
  } else {
    input.classList.add("wrong");
  }
}

// =======================
// Puzzle solved check
// =======================

function checkPuzzleSolved() {
  if (!currentSolution) return;

  const rowDivs = document.querySelectorAll(".board .row");
  if (rowDivs.length !== 9) return;

  for (let r = 0; r < 9; r++) {
    const inputs = rowDivs[r].querySelectorAll("input");
    if (inputs.length !== 9) return;

    for (let c = 0; c < 9; c++) {
      const cell = inputs[c];
      const val = cell.value.trim();
      const expected = String(currentSolution[r][c]);

      if (val === "" || val !== expected) {
        return; // not solved
      }
    }
  }

  // If we reached here, every cell matches the solution
  showPuzzleSolvedAnimation();
}

function showPuzzleSolvedAnimation() {
  if (solvedAnimationActive) return;
  solvedAnimationActive = true;

  const board = document.querySelector(".board");
  if (board) {
    board.classList.add("solved");
  }

  let banner = document.getElementById("puzzle-solved-overlay");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "puzzle-solved-overlay";
    banner.textContent = "Puzzle Solved!!";
    document.body.appendChild(banner);
  }
  banner.style.display = "block";

  setTimeout(() => {
    if (board) {
      board.classList.remove("solved");
    }
    banner.style.display = "none";
    solvedAnimationActive = false;
  }, 2000);
}

// =======================
// Manual highlight dragging (Shift + drag) with add/remove mode
// =======================

function setCellHighlighted(input, highlighted) {
  if (!input) return;
  if (highlighted) {
    input.classList.add("highlight");
  } else {
    input.classList.remove("highlight");
  }
}

function setupHighlightDrag() {
  const board = document.querySelector(".board");
  if (!board) return;

  let isMouseDown = false;
  let isShiftHeld = false;
  // "add" = only add highlights while dragging
  // "remove" = only remove highlights while dragging
  let dragHighlightMode = null;

  board.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "INPUT") {
      isMouseDown = true;
      isShiftHeld = e.shiftKey;

      if (isShiftHeld) {
        const alreadyHighlighted = e.target.classList.contains("highlight");
        dragHighlightMode = alreadyHighlighted ? "remove" : "add";

        // Apply mode to the starting cell
        if (dragHighlightMode === "add") {
          setCellHighlighted(e.target, true);
        } else {
          setCellHighlighted(e.target, false);
        }
      } else {
        // Regular click just focuses the cell
        dragHighlightMode = null;
        e.target.focus();
      }

      e.preventDefault();
    }
  });

  board.addEventListener("mouseover", (e) => {
    if (isMouseDown && isShiftHeld && e.target.tagName === "INPUT") {
      if (dragHighlightMode === "add") {
        setCellHighlighted(e.target, true);
      } else if (dragHighlightMode === "remove") {
        setCellHighlighted(e.target, false);
      }
    }
  });

  document.addEventListener("mouseup", () => {
    isMouseDown = false;
    isShiftHeld = false;
    dragHighlightMode = null;
  });
}

function clearAllHighlights() {
  const inputs = document.querySelectorAll(".board input.highlight");
  inputs.forEach((input) => input.classList.remove("highlight"));
}

// =======================
// Pencil notes (max 3 digits per cell)
// =======================

function updatePencilNotes(input, digit) {
  // strip everything to just digits
  let currentDigits = input.value.replace(/\D/g, ""); // e.g. "137"
  let arr = currentDigits ? currentDigits.split("") : [];

  const alreadyHas = arr.includes(digit);

  if (!alreadyHas && arr.length >= 3) {
    // max 3 notes – do nothing if trying to add a 4th
    return;
  }

  if (alreadyHas) {
    // remove this digit
    arr = arr.filter((d) => d !== digit);
  } else {
    // add this digit
    arr.push(digit);
  }

  // unique, sorted, and capped at 3 for safety
  const uniqueSorted = Array.from(new Set(arr))
    .filter((d) => d !== "0")
    .sort()
    .slice(0, 3);

  const spaced = uniqueSorted.join(" ");

  input.value = spaced;

  if (uniqueSorted.length === 0) {
    input.classList.remove("pencil");
  } else {
    input.classList.add("pencil");
  }

  // pencil notes never show as wrong
  input.classList.remove("wrong");
}

// =======================
// Hint
// =======================

function giveHint() {
  if (!currentSolution) return;

  const rowDivs = document.querySelectorAll(".board .row");
  const candidates = [];

  for (let r = 0; r < 9; r++) {
    const inputs = rowDivs[r].querySelectorAll("input");
    for (let c = 0; c < 9; c++) {
      const cell = inputs[c];

      // Skip given cells and already readOnly cells
      if (cell.readOnly) continue;

      const correct = String(currentSolution[r][c]);
      const value = cell.value.trim();

      // Candidate if empty or wrong
      if (value !== correct) {
        candidates.push(cell);
      }
    }
  }

  if (candidates.length === 0) {
    alert("No cells available for a hint!");
    return;
  }

  const cell = candidates[Math.floor(Math.random() * candidates.length)];
  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);

  // Fill with correct value
  cell.value = String(currentSolution[row][col]);
  cell.classList.remove("pencil", "wrong");

  // Mark as a hint visually
  cell.classList.add("hint");

  // Make this cell non-editable from now on
  cell.readOnly = true;

  checkPuzzleSolved();
}

// =======================
// Cell handlers
// =======================

function attachCellHandlers() {
  const inputs = document.querySelectorAll(".board input");

  inputs.forEach((input) => {
    input.addEventListener("keydown", (e) => {
      const key = e.key;

      // --- Toggle pencil mode with E ---
      if (key === "e" || key === "E") {
        pencilMode = !pencilMode;
        const pencilBtn = document.getElementById("pencil-mode-btn");
        if (pencilBtn) {
          pencilBtn.classList.toggle("active", pencilMode);
        }
        e.preventDefault();
        return;
      }

      // --- WASD navigation (works even on readOnly cells) ---
      if (
        key === "w" || key === "W" ||
        key === "a" || key === "A" ||
        key === "s" || key === "S" ||
        key === "d" || key === "D"
      ) {
        const isShift = e.shiftKey;

        // If Shift is held, highlight the current cell before moving
        if (isShift) {
          input.classList.add("highlight");
        }

        let dRow = 0;
        let dCol = 0;
        if (key === "w" || key === "W") dRow = -1;
        if (key === "s" || key === "S") dRow = 1;
        if (key === "a" || key === "A") dCol = -1;
        if (key === "d" || key === "D") dCol = 1;

        const nextCell = moveFocusFromCell(input, dRow, dCol);

        // If Shift is held, also highlight the new cell we moved to
        if (isShift && nextCell) {
          nextCell.classList.add("highlight");
        }

        e.preventDefault();
        return;
      }

      // --- From here down, handle values only for non-readOnly cells ---
      if (input.readOnly) {
        e.preventDefault();
        return;
      }

      // Allow navigation arrows and Tab to behave normally
      const navKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"];
      if (navKeys.includes(key)) {
        return;
      }

      // Digit 1–9
      if (key >= "1" && key <= "9") {
        input.classList.remove("given");

        if (pencilMode) {
          // toggle this digit inside notes (max 3)
          updatePencilNotes(input, key);
        } else {
          // Final answer mode: single digit
          input.value = key;
          input.classList.remove("pencil");
          checkCellCorrect(input);
          checkPuzzleSolved();
        }

        e.preventDefault();  // stop default typing behavior
        return;
      }

      // 0, Backspace, Delete → clear cell
      if (key === "0" || key === "Backspace" || key === "Delete") {
        input.value = "";
        input.classList.remove("pencil");
        input.classList.remove("given");
        input.classList.remove("wrong");
        e.preventDefault();
        return;
      }

      // Anything else: ignore
      e.preventDefault();
    });

    // Input event: handles paste / weird input, keeps cells sane
    input.addEventListener("input", () => {
      if (input.readOnly) {
        input.value = input.value; // do nothing
        return;
      }

      const digits = input.value.replace(/\D/g, "");

      if (pencilMode) {
        // interpret typed digits as notes, capped at 3
        const uniqueSorted = Array.from(new Set(digits.split("")))
          .filter((d) => d !== "0")
          .sort()
          .slice(0, 3);

        const spaced = uniqueSorted.join(" ");
        input.value = spaced;

        if (uniqueSorted.length === 0) {
          input.classList.remove("pencil");
        } else {
          input.classList.add("pencil");
        }

        input.classList.remove("wrong");
      } else {
        // Final answer mode
        if (digits.length === 0 || digits[0] === "0") {
          input.value = "";
          input.classList.remove("pencil");
          input.classList.remove("given");
          input.classList.remove("wrong");
        } else {
          const key = digits[0];
          input.value = key;
          input.classList.remove("pencil");
          input.classList.remove("given");
          checkCellCorrect(input);
          checkPuzzleSolved();
        }
      }
    });
  });
}

// =======================
// Bootstrapping
// =======================

window.addEventListener("DOMContentLoaded", () => {
  // Attach key handlers once the DOM exists
  attachCellHandlers();

  // Setup Shift+drag highlight behavior
  setupHighlightDrag();

  // Default difficulty: medium
  loadPuzzle("m");

  const buttons = document.querySelectorAll(".difficulty-btn");
  buttons.forEach((btn) => {
    const diff = btn.getAttribute("data-diff");
    btn.addEventListener("click", () => {
      loadPuzzle(diff);
    });
  });

  // Side buttons
  const clearBtn = document.getElementById("clear-highlights-btn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      clearAllHighlights();
    });
  }

  const pencilBtn = document.getElementById("pencil-mode-btn");
  if (pencilBtn) {
    pencilBtn.addEventListener("click", () => {
      pencilMode = !pencilMode;
      pencilBtn.classList.toggle("active", pencilMode);
    });
  }

  const hintBtn = document.getElementById("hint-btn");
  if (hintBtn) {
    hintBtn.addEventListener("click", giveHint);
  }

  // Help mode button toggles red wrong cells on or off
  const helpBtn = document.getElementById("help-mode-btn");
  if (helpBtn) {
    helpBtn.classList.toggle("active", helpMode);
    helpBtn.addEventListener("click", () => {
      helpMode = !helpMode;
      helpBtn.classList.toggle("active", helpMode);

      const cells = document.querySelectorAll(".board input");
      if (!helpMode) {
        // Turning help off removes all red
        cells.forEach((cell) => cell.classList.remove("wrong"));
      } else {
        // Turning help on recheck current filled non-pencil cells
        cells.forEach((cell) => checkCellCorrect(cell));
      }
    });
  }
});
