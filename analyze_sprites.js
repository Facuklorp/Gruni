// analyze_sprites.js - Analiza los sprites pixel a pixel para encontrar los bounds exactos
const fs = require('fs');
const { PNG } = require('pngjs');

function analyzePNG(filename) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        const stream = fs.createReadStream(filename);
        stream.pipe(new PNG({ filterType: 4 }))
            .on('parsed', function() {
                const w = this.width;
                const h = this.height;
                const data = this.data;
                
                // Find non-transparent, non-pink pixels
                // Pink = approximately R>200, G<100, B>200
                const isPink = (r, g, b, a) => a < 10 || (r > 200 && g < 80 && b > 150);
                
                // Divide into a grid and find which cells have content
                const gridX = 4;
                const gridY = 8;
                const cellW = Math.floor(w / gridX);
                const cellH = Math.floor(h / gridY);
                
                console.log(`\n${filename}: ${w}x${h}`);
                console.log(`Cell size: ${cellW}x${cellH}`);
                
                for (let gy = 0; gy < gridY; gy++) {
                    for (let gx = 0; gx < gridX; gx++) {
                        let hasContent = false;
                        let minX = cellW, maxX = 0, minY = cellH, maxY = 0;
                        
                        for (let y = gy * cellH; y < (gy + 1) * cellH; y++) {
                            for (let x = gx * cellW; x < (gx + 1) * cellW; x++) {
                                const idx = (y * w + x) * 4;
                                const r = data[idx], g = data[idx+1], b = data[idx+2], a = data[idx+3];
                                if (!isPink(r, g, b, a)) {
                                    hasContent = true;
                                    const lx = x - gx * cellW;
                                    const ly = y - gy * cellH;
                                    if (lx < minX) minX = lx;
                                    if (lx > maxX) maxX = lx;
                                    if (ly < minY) minY = ly;
                                    if (ly > maxY) maxY = ly;
                                }
                            }
                        }
                        
                        if (hasContent) {
                            const absx = gx * cellW + minX;
                            const absy = gy * cellH + minY;
                            const width = maxX - minX;
                            const height = maxY - minY;
                            console.log(`  Cell [${gx},${gy}] (px ${gx*cellW},${gy*cellH}): content at local (${minX},${minY}) size ${width}x${height}  -> abs(${absx},${absy})`);
                        }
                    }
                }
                resolve();
            })
            .on('error', reject);
    });
}

async function main() {
    const pngjs = require('pngjs');
    await analyzePNG('assets/Sprite gruni basicas.png');
    await analyzePNG('assets/Sprite gruni acciones.png');
}

main().catch(console.error);
