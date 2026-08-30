const lines = [
  "please do not feed the algorithm.",
  "the microwave clock is still wrong.",
  "anyway, here's a small sentence.",
  "there is no hidden meaning. Or is there. No, there isn't.",
  "somebody has definitely thought about this before.",
  "nothing strange here.",
  "one of these days.",
  "have you tried refreshing the page?",
  "you wanna chat?",
  "I was going to put something meaningful here.",
  "this is still here.",
  "home sweet home.",
  "I use arch, btw.",
  "I miss when websites had weird little corners.",
  "hello"
];

const glyphs = {
  A: ["01110","10001","10001","11111","10001","10001","10001"],
  B: ["11110","10001","10001","11110","10001","10001","11110"],
  C: ["01111","10000","10000","10000","10000","10000","01111"],
  D: ["11110","10001","10001","10001","10001","10001","11110"],
  E: ["11111","10000","10000","11110","10000","10000","11111"],
  F: ["11111","10000","10000","11110","10000","10000","10000"],
  G: ["01111","10000","10000","10111","10001","10001","01111"],
  H: ["10001","10001","10001","11111","10001","10001","10001"],
  I: ["11111","00100","00100","00100","00100","00100","11111"],
  J: ["00111","00010","00010","00010","10010","10010","01100"],
  K: ["10001","10010","10100","11000","10100","10010","10001"],
  L: ["10000","10000","10000","10000","10000","10000","11111"],
  M: ["10001","11011","10101","10101","10001","10001","10001"],
  N: ["10001","11001","10101","10011","10001","10001","10001"],
  O: ["01110","10001","10001","10001","10001","10001","01110"],
  P: ["11110","10001","10001","11110","10000","10000","10000"],
  Q: ["01110","10001","10001","10001","10101","10010","01101"],
  R: ["11110","10001","10001","11110","10100","10010","10001"],
  S: ["01111","10000","10000","01110","00001","00001","11110"],
  T: ["11111","00100","00100","00100","00100","00100","00100"],
  U: ["10001","10001","10001","10001","10001","10001","01110"],
  V: ["10001","10001","10001","10001","10001","01010","00100"],
  W: ["10001","10001","10001","10101","10101","11011","10001"],
  X: ["10001","10001","01010","00100","01010","10001","10001"],
  Y: ["10001","10001","01010","00100","00100","00100","00100"],
  Z: ["11111","00001","00010","00100","01000","10000","11111"]
};

function createLetter(char, flicker = false, index = 0) {
  const letter = document.createElement("div");
  letter.className = "letter";

  if (flicker) {
    letter.dataset.flickerIndex = index;
    letter.dataset.flickerChar = char;
  }

  glyphs[char].forEach(row => {
    [...row].forEach(cell => {
      const pixel = document.createElement("div");

      if (cell === "1") {
        pixel.className = "pixel";
      }

      letter.appendChild(pixel);
    });
  });

  return letter;
}

function createSpace() {
  const space = document.createElement("div");
  space.className = "letter";
  return space;
}

function renderName(name) {
  const container = document.getElementById("pixelName");
  let letterIndex = 0;

  [...name.toUpperCase()].forEach(char => {
    if (char === " ") {
      container.appendChild(createSpace());
    } else if (glyphs[char]) {
      // SINGH: G is index 15, H is index 16.
      const shouldFlicker = letterIndex === 15 || letterIndex === 16;
      container.appendChild(createLetter(char, shouldFlicker, letterIndex));
      letterIndex++;
    }
  });
}

function startFlicker() {
  const flickerLetters = [
    ...document.querySelectorAll(".letter[data-flicker-index]")
  ];

  /*
    Explicit pixel mask for the diagonal fault.

    The diagonal cutoff runs exactly from:
      H [1,5]  ->  G [7,4]

    The right-angle corner / radial source is:
      H [7,5]

    Only illuminated ("1") pixels that fall inside that triangular
    fault region are selected. There is NO per-pixel time offset:
    every affected pixel flickers in sync. Distance from H [7,5]
    controls intensity only.
  */
  const affected = {
    // G: the fault enters at its lower-right edge and ends at G [7,4].
    15: [
      [4,5],
      [5,5],
      [6,5],
      [7,4],
      [7,5]
    ],

    // H: the fault climbs the right edge, ending at H [1,5].
    16: [
      [1,5],
      [2,5],
      [3,5],
      [4,5],
      [5,5],
      [6,5],
      [7,4],
      [7,5]
    ]
  };

  /*
    Put G and H on one continuous coordinate plane.
    Each glyph is 5 columns wide, with a 1-column visual gap.
    Therefore H begins at x = 7.

    Source = H [7,5] -> global (11,7)
    Diagonal end = G [7,4] -> global (4,7)
  */
  const letterX = {
    15: 0,
    16: 6
  };

  const source = {
    x: letterX[16] + 5,
    y: 7
  };

  const pixels = [];

  function getPixelGrid(letter) {
    const cells = [...letter.querySelectorAll(".pixel")];
    const coordinates = [];

    glyphs[letter.dataset.flickerChar].forEach((row, r) => {
      [...row].forEach((cell, c) => {
        if (cell === "1") {
          coordinates.push([r + 1, c + 1]);
        }
      });
    });

    return new Map(
      coordinates.map((coord, i) => [coord.join(","), cells[i]])
    );
  }

  flickerLetters.forEach(letter => {
    const index = Number(letter.dataset.flickerIndex);
    const grid = getPixelGrid(letter);

    affected[index].forEach(([row, col]) => {
      const pixel = grid.get(`${row},${col}`);

      if (!pixel) return;

      const x = letterX[index] + col;
      const y = row;
      const distance = Math.hypot(
        source.x - x,
        source.y - y
      );

      pixels.push({
        pixel,
        distance
      });
    });
  });

  const maxDistance = Math.max(
    ...pixels.map(item => item.distance)
  );

  /*
    One shared flicker waveform for EVERY affected pixel.
    The only per-pixel difference is how dark it gets.

    The source pixel H [7,5] is darkest.
    Intensity falls off smoothly with radial distance.
  */
  pixels.forEach(({ pixel, distance }) => {
    const radial = distance / maxDistance;

    // 0.03 at source -> 0.70 at outer edge, with a stronger curved falloff.
    const minOpacity =
      0.03 + Math.pow(radial, 1.15) * 0.67;

    pixel.style.setProperty(
      "--fault-min-opacity",
      minOpacity.toFixed(3)
    );

    pixel.classList.add("fault-pixel");
  });

  /*
    All pixels use the exact same animation clock and keyframes.
    No delay, no phase shift. Only the darkness differs spatially.
  */
  const style = document.createElement("style");

  style.textContent = `
    .fault-pixel {
      animation: electricalFault 1120ms linear 1 both;
    }

    @keyframes electricalFault {
      0%, 8% {
        opacity: 1;
      }

      11% {
        opacity: var(--fault-min-opacity);
      }

      16% {
        opacity: 1;
      }

      27% {
        opacity: 1;
      }

      29% {
        opacity: var(--fault-min-opacity);
      }

      34% {
        opacity: 1;
      }

      47% {
        opacity: 1;
      }

      49% {
        opacity: var(--fault-min-opacity);
      }

      56% {
        opacity: 1;
      }

      69% {
        opacity: 1;
      }

      70.5% {
        opacity: var(--fault-min-opacity);
      }

      74% {
        opacity: 1;
      }

      84% {
        opacity: 1;
      }

      85% {
        opacity: var(--fault-min-opacity);
      }

      88% {
        opacity: 1;
      }

      100% {
        opacity: 1;
      }
    }
  `;

  document.head.appendChild(style);

  setTimeout(() => {
    pixels.forEach(({ pixel }) => {
      pixel.classList.remove("fault-pixel");
      pixel.style.removeProperty("--fault-min-opacity");
      pixel.style.opacity = "1";
    });

    style.remove();
  }, 1200);
}

function setupContent() {
  document.getElementById("randomLine").textContent =
    lines[Math.floor(Math.random() * lines.length)];

  renderName("Asmit Pranshu Singh");
}

/*
  Wait for:
  1. The profile image
  2. The web font

  Then reveal the whole page at once.
*/
async function revealPage() {
  setupContent();

  const image = document.getElementById("profileImage");

  const imageReady = image.complete
    ? Promise.resolve()
    : new Promise(resolve => {
        image.addEventListener("load", resolve, {
          once: true
        });

        image.addEventListener("error", resolve, {
          once: true
        });
      });

  const fontReady = document.fonts
    ? document.fonts.ready
    : Promise.resolve();

  // Wait until everything is loaded
  await Promise.all([
    imageReady,
    fontReady
  ]);

  // Then wait another 250 ms every time
  await new Promise(resolve =>
    setTimeout(resolve, 250)
  );

  requestAnimationFrame(() => {
    document.body.classList.add("ready");
    scheduleFlickerWindow();
  });
}

/*
  The page starts completely normal.

  Every 5-second window gets an independent 80% chance of containing
  one flicker. If that window wins, the flicker is placed at a random
  moment somewhere inside that 5-second window.

  This makes the effect feel like an occasional fault in the page
  rather than a repeating loading animation.
*/
function scheduleFlickerWindow() {
  const chance = 0.80;
  const windowLength = 5000;

  if (Math.random() < chance) {
    const delay = Math.random() * windowLength;

    setTimeout(() => {
      startFlicker();
    }, delay);
  }

  setTimeout(
    scheduleFlickerWindow,
    windowLength
  );
}

revealPage();
