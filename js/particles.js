import { CELL_SIZE, ISO_W, ISO_H } from './world.js';

export class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    update(timeOfDay) {
        const isNight = timeOfDay > 1800 || timeOfDay < 600;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life--;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            p.x += p.vx;
            p.y += p.vy;

            if (p.type === 'LEAF') {
                p.vx += (Math.random() - 0.5) * 0.1;
                p.vy += 0.05; // Gravedad
            } else if (p.type === 'FIREFLY') {
                p.vx += (Math.random() - 0.5) * 0.3;
                p.vy += (Math.random() - 0.5) * 0.3;
                p.vx *= 0.95;
                p.vy *= 0.95;
                if (!isNight) p.life -= 5;
            }
        }
    }

    spawnLeaf(x, y) {
        this.particles.push({
            type: 'LEAF',
            x, y,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 1,
            life: 100 + Math.random() * 100,
            maxLife: 200,
            color: Math.random() > 0.5 ? '#f59e0b' : '#16a34a',
            size: 1.5 + Math.random() * 2
        });
    }

    spawnFirefly(x, y) {
        this.particles.push({
            type: 'FIREFLY',
            x, y,
            vx: 0, vy: 0,
            life: 300 + Math.random() * 300,
            maxLife: 600,
            color: '#fef08a',
            size: 1.5
        });
    }

    // Dibujo en espacio isométrico (dentro del ctx escalado/trasladado del renderer)
    drawIso(ctx, renderer) {
        ctx.save();
        for (const p of this.particles) {
            // p.x / p.y están en píxeles de mundo → convertir a coord de grilla
            const gx = p.x / CELL_SIZE;
            const gy = p.y / CELL_SIZE;
            const { sx, sy } = renderer.isoProject(gx, gy);
            const screenX = sx + ISO_W / 2;
            const screenY = sy + ISO_H / 2;

            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;

            if (p.type === 'FIREFLY') {
                ctx.shadowColor = '#fef08a';
                ctx.shadowBlur = 8;
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.beginPath();
            ctx.arc(screenX, screenY - 4, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // Método legacy (por si algo lo llama directamente)
    draw(ctx) {
        // En la versión iso se usa drawIso(). Este método queda como fallback vacío.
    }
}
