export const canvas = (p) => {
    let bg = "#191919"
    let fill = "#444"
    let textSize = 12
    let noiseLevel = 255
    let noiseScale = 0.007
    const noiseChars = [".", ":", "-", "=", "+", "*", "#", "%"]

    let h
    let w
    let h_half
    let w_half
    let h_top_offset
    let w_left_offset
    let x_fade = []
    let y_fade = []

    const updateDimensions = () => {
        w = window.innerWidth
        h = window.innerHeight

        h_half = h / 2
        w_half = w / 2

        let h_leftover = h - (Math.floor(h / textSize) * textSize)
        h_top_offset = h_leftover / 2

        let w_leftover = w - (Math.floor(w / textSize) * textSize)
        w_left_offset = w_leftover / 2

        y_fade = []
        for (let y = h_top_offset; y < h + textSize; y += textSize) {
            y_fade.push(1 - Math.abs(y - h_half) / h_half)
        }

        x_fade = []
        for (let x = 0; x < w + w_left_offset; x += textSize) {
            x_fade.push(1 - Math.abs(x - w_half) / w_half)
        }
    }

    p.setup = () => {
        p.textSize(textSize)
        p.textAlign(p.CENTER, p.CENTER)
        p.fill(fill)
        updateDimensions()        
        p.createCanvas(w, h)

        console.log('p5.js setup function executed.' + h_top_offset + ' ' + h)
    }

    p.draw = () => {
        // Clear the frame
        p.background(bg)
        const nt = noiseScale * p.frameCount

        for (let y = h_top_offset, yi = 0; y < h+textSize; y += textSize, yi++) {
            let ny = noiseScale * y
            let fy = y_fade[yi]

            for (let x = 0, xi = 0; x < w+w_left_offset; x += textSize, xi++) {
                let nx = noiseScale * x

                // Compute the noise value.
                let n = noiseLevel * p.noise(nx, ny, nt)
                let letterIndex = n < 50
                    ? 0
                    : Math.min(noiseChars.length - 1, Math.floor((n - 50) / 20) + 1)
                let letter = noiseChars[letterIndex]

                let fx = x_fade[xi]
                let f = 255 * (fy + fx) / 2

                p.fill(68, 68, 68, f)
                p.text(letter, x, y)
            }
        }
    }

    p.windowResized = () => {
        updateDimensions()
        p.resizeCanvas(w, h)
    }
}
