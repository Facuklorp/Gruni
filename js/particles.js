export class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    update(timeOfDay) {
        // timeOfDay: 0 to 2400. Noche es > 1800 o < 600
        let isNight = timeOfDay > 1800 || timeOfDay < 600;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
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
                // Friccion
                p.vx *= 0.95;
                p.vy *= 0.95;
                
                // Si es de dia, mueren más rápido
                if (!isNight) p.life -= 5;
            }
        }
    }

    spawnLeaf(x, y) {
        this.particles.push({
            type: 'LEAF',
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 1,
            life: 100 + Math.random() * 100,
            maxLife: 200,
            color: Math.random() > 0.5 ? '#f59e0b' : '#16a34a', // Naranja o verde
            size: 1.5 + Math.random() * 2
        });
    }

    spawnFirefly(x, y) {
        this.particles.push({
            type: 'FIREFLY',
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            life: 300 + Math.random() * 300,
            maxLife: 600,
            color: '#fef08a',
            size: 1.5
        });
    }

    draw(ctx) {
        ctx.save();
        for (let p of this.particles) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / p.maxLife;
            
            if (p.type === 'FIREFLY') {
                ctx.shadowColor = '#fef08a';
                ctx.shadowBlur = 10;
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}
