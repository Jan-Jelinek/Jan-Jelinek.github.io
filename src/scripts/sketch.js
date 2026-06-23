export const canvas = (p) => {

    // Config ---------------------------------------
    const BG = "#0b0d10";
    // const CHAR_RGB = [250, 250, 251];
    const CHAR_RGB = [60, 60, 62];
    // const CHAR_RGB = [67, 67, 67];
    const MIN_TEXT_SIZE = 12;
    const NOISE_SCALE = 0.004;
    const NOISE_LEVEL = 255;
    const NOISE_OCTAVES = 8; // p5 default is 4; 2 ~halves noise cost
    const CULL_THRESHOLD = 0.06; // skip glyphs that end up almost fully faded
    // const noiseChars = [".", ":", "-", "=", "+", "*", "#", "%"];
    // const noiseChars = [" ", ".", ":", "-", "=", "+", "*", "#", "%", "@"];
    // const noiseChars = [" ", ".", "·", "•", "●", "⬤"];
    const noiseChars = [" ", " ", ".", ",", ":", "-", "+", "="];
    // const noiseChars = ["=", "+", "*", "x", "X", "#", "%", "@"];

    // Device heuristics ---------------------------------------
    const lowPower =
        (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
        (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
        (window.matchMedia && matchMedia("(pointer: coarse)").matches);

    const reducedMotion =
        window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

    const TARGET_FPS = lowPower ? 16 : 24;
    const DENSITY = lowPower ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    const CELL_SCALE = lowPower ? 1.4 : 1; // bigger cells => fewer glyphs

    // State ---------------------------------------
    let w, h, w_half, h_half, textSize, h_top_offset;
    let cols, rows;
    const x_fade = [];
    const y_fade = [];
    let fadeLayer = null; // pre-rendered static vignette
    const timeScale = NOISE_SCALE / 25; // keeps speed independent of FPS
    let resizeTimer = null;

    const computeDims = () => {
        w = window.innerWidth
        h = window.innerHeight
        h_half = h / 2
        w_half = w / 2
        textSize = Math.max(MIN_TEXT_SIZE, Math.floor(h / 75) * CELL_SCALE)

        const h_leftover = h - (Math.floor(h / textSize) * textSize)
        h_top_offset = h_leftover / 2

        y_fade.length = 0;
        for (let y = h_top_offset; y < h + textSize; y += textSize) {
            y_fade.push(1 - Math.abs(y - h_half) / h_half);
        }
        x_fade.length = 0;
        for (let x = 0; x < w + textSize; x += textSize) {
            x_fade.push(1 - Math.abs(x - w_half) / w_half);
        }
        rows = y_fade.length;
        cols = x_fade.length;
    }

    const buildFadeLayer = () => {
        if (fadeLayer) fadeLayer.remove();
        fadeLayer = p.createGraphics(w, h);
        fadeLayer.pixelDensity(DENSITY);
        fadeLayer.noStroke();
        const half = textSize / 2;
        for (let yi = 0; yi < rows; yi++) {
            const yy = h_top_offset + yi * textSize;
            const fy = y_fade[yi];
            for (let xi = 0; xi < cols; xi++) {
                const v = 1 - (fy + x_fade[xi]) / 2; // edge -> 1 (opaque), centre -> 0
                if (v <= 0) continue;
                fadeLayer.fill(25, 25, 25, Math.min(255, v * 255));
                fadeLayer.rect(xi * textSize - half, yy - half, textSize + 1, textSize + 1);
            }
        }
    };

    const renderFrame = () => {
        p.background(BG);

        // Use the raw 2D context in the hot loop to skip p5's per-call overhead.
        // background() may have touched these, so set them once per frame.
        const ctx = p.drawingContext;
        ctx.fillStyle = `rgb(${CHAR_RGB[0]},${CHAR_RGB[1]},${CHAR_RGB[2]})`;
        ctx.font = `${textSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const nt = timeScale * p.millis();
        for (let yi = 0; yi < rows; yi++) {
            const fy = y_fade[yi];
            const y = h_top_offset + yi * textSize;
            const ny = NOISE_SCALE * y;
            for (let xi = 0; xi < cols; xi++) {
                if (fy + x_fade[xi] < CULL_THRESHOLD) continue; // near-invisible corner
                const x = xi * textSize;
                const n = NOISE_LEVEL * p.noise(NOISE_SCALE * x, ny, nt);
                // const idx = Math.min(noiseChars.length - 1, Math.floor((n / 256) * noiseChars.length));
                const idx = n < 50 ? 0 : Math.min(7, (((n - 50) / 20) | 0) + 1);
                ctx.fillText(noiseChars[idx], x, y);
            }
        }

        // One composite for the whole vignette instead of 10k per-glyph alphas.
        // p.image(fadeLayer, 0, 0, w, h);
    };

    p.setup = () => {
        computeDims();
        p.pixelDensity(DENSITY);
        p.createCanvas(w, h);
        p.frameRate(TARGET_FPS);
        p.noiseDetail(NOISE_OCTAVES, 0.5);
        buildFadeLayer();

        if (reducedMotion) {
            renderFrame(); // a single static frame
            p.noLoop();
        }
    }

    p.draw = () => {
        renderFrame();
    }

    p.windowResized = () => {
        // resizeCanvas + layer rebuild are expensive; debounce the drag storm.
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            computeDims();
            p.resizeCanvas(w, h);
            buildFadeLayer();
            if (reducedMotion) renderFrame();
        }, 150);
    };

    // Stop all work when the tab is hidden (rAF throttles, this guarantees it).
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) p.noLoop();
        else if (!reducedMotion) p.loop();
    });
}
