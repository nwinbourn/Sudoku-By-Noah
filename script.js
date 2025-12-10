let pencilMode = false; // global toggle for pencil mode

// Fill the board from a 2D array of numbers
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

      // reset any extra classes when loading a new puzzle
      cell.classList.remove("highlight", "pencil", "given");

      if (value === 0) {
        cell.value = "";
        cell.readOnly = false;  // user can edit blanks
      } else {
        cell.value = value;
        cell.readOnly = true;   // given clues are locked
        cell.classList.add("given"); // mark this as a starter/given cell
      }
    }
  }
}

function loadPuzzle(difficulty) {
  try {
    const puzzle = generatePuzzle(difficulty); // comes from engine.js
    fillBoard(puzzle);
    setActiveDifficulty(difficulty);
  } catch (err) {
    console.error("Failed to load puzzle:", err);
  }
}


// Helper to toggle .active on buttons
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

// Move focus from a given cell by (dRow, dCol) using WASD
// Now returns the NEW cell we moved to (or null)
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

// Attach numeric-only behavior + WASD nav to all cells
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
      if (key === "w" || key === "W" ||
          key === "a" || key === "A" ||
          key === "s" || key === "S" ||
          key === "d" || key === "D") {

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
        // Don't let any other keys affect given cells
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
        input.classList.remove("given"); // this is now a user cell
        if (pencilMode) {
          input.value = key;
          input.classList.add("pencil");
        } else {
          input.value = key;
          input.classList.remove("pencil");
        }
        e.preventDefault();  // stop default typing behavior
        return;
      }

      // 0, Backspace, Delete → clear cell
      if (key === "0" || key === "Backspace" || key === "Delete") {
        input.value = "";
        input.classList.remove("pencil");
        input.classList.remove("given");
        e.preventDefault();
        return;
      }

      // Anything else: ignore
      e.preventDefault();
    });

    // Input event: handles paste / weird input, just in case
    input.addEventListener("input", () => {
      if (input.readOnly) {
        input.value = input.value; // do nothing
        return;
      }
      // Strip non-digits, keep at most one digit 1–9
      const digits = input.value.replace(/\D/g, "");
      if (digits.length === 0 || digits[0] === "0") {
        input.value = "";
        input.classList.remove("pencil");
        input.classList.remove("given");
      } else {
        const key = digits[0];
        input.classList.remove("given");
        if (pencilMode) {
          input.value = key;
          input.classList.add("pencil");
        } else {
          input.value = key;
          input.classList.remove("pencil");
        }
      }
    });
  });
}

// Helper: mark/unmark a single cell as highlighted
function setCellHighlighted(input, highlighted) {
  if (!input) return;
  if (highlighted) {
    input.classList.add("highlight");
  } else {
    input.classList.remove("highlight");
  }
}

// Setup Shift + left-click drag to highlight cells, with toggle mode,
// and require Shift to stay held the whole time
function setupHighlightDrag() {
  let isDragging = false;
  let dragMode = null; // "add" or "erase"
  let shiftHeld = false;

  // Track when Shift is held
  document.addEventListener("keydown", (e) => {
    if (e.key === "Shift") {
      shiftHeld = true;
    }
  });

  document.addEventListener("keyup", (e) => {
    if (e.key === "Shift") {
      shiftHeld = false;
      isDragging = false;
      dragMode = null;
    }
  });

  // When mouse goes down on a cell, only start drag if Shift is held
  document.addEventListener("mousedown", (e) => {
    // Only left click
    if (e.button !== 0) return;

    const target = e.target;
    if (!target.matches(".board input")) return;

    // If Shift is not held, this is a normal click for typing
    if (!shiftHeld) {
      return; // let normal focus / input happen
    }

    // Shift is held: start highlight drag
    isDragging = true;

    // Decide whether we're adding or erasing based on initial cell state
    if (target.classList.contains("highlight")) {
      dragMode = "erase";
      setCellHighlighted(target, false);
    } else {
      dragMode = "add";
      setCellHighlighted(target, true);
    }

    // Prevent text selection / caret flicker for highlight mode
    e.preventDefault();
  });

  // While dragging over cells, apply the chosen mode
  document.addEventListener("mouseover", (e) => {
    // Require dragging AND Shift still held
    if (!isDragging || !dragMode || !shiftHeld) return;

    const target = e.target;
    if (target.matches(".board input")) {
      if (dragMode === "add") {
        setCellHighlighted(target, true);
      } else if (dragMode === "erase") {
        setCellHighlighted(target, false);
      }
    }
  });

  // On mouse up anywhere, stop dragging
  document.addEventListener("mouseup", (e) => {
    if (e.button === 0) {
      isDragging = false;
      dragMode = null;
    }
  });
}

// Clear all highlights on the board
function clearAllHighlights() {
  const inputs = document.querySelectorAll(".board input.highlight");
  inputs.forEach((input) => input.classList.remove("highlight"));
}

// Wire everything up
window.addEventListener("DOMContentLoaded", () => {
  // Attach key handlers once the DOM exists
  attachCellHandlers();

  // Setup Shift+drag highlight behavior
  setupHighlightDrag();

  // Default difficulty: medium
  loadPuzzle("m");  // this will call setActiveDifficulty("m") when done

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
});
