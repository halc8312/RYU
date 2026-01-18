// Fluid Simulation based on Jos Stam's "Real-Time Fluid Dynamics for Games"
class FluidSimulation {
    constructor(canvas, N) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.N = N; // Grid resolution
        this.size = (N + 2) * (N + 2);
        this.dt = 0.1; // Time step
        this.diff = 0.0001; // Diffusion rate
        this.visc = 0.0001; // Viscosity
        this.solverIterations = 20; // Number of iterations for linear solver
        this.velocityMultiplier = 10; // Multiplier for mouse velocity input
        this.densityFade = 0.99; // Density fade rate per frame (0-1)
        
        // Velocity fields
        this.u = new Array(this.size).fill(0);
        this.v = new Array(this.size).fill(0);
        this.u_prev = new Array(this.size).fill(0);
        this.v_prev = new Array(this.size).fill(0);
        
        // Density field
        this.dens = new Array(this.size).fill(0);
        this.dens_prev = new Array(this.size).fill(0);
        
        this.setupCanvas();
        this.setupMouseInteraction();
    }
    
    setupCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = this.N;
        this.canvas.height = this.N;
        this.imageData = this.ctx.createImageData(this.N, this.N);
    }
    
    setupMouseInteraction() {
        // Mouse state encapsulated to avoid potential race conditions
        this.mouseState = {
            isDown: false,
            prevX: 0,
            prevY: 0
        };
        
        this.canvas.addEventListener('mousedown', (e) => {
            this.mouseState.isDown = true;
            const rect = this.canvas.getBoundingClientRect();
            this.mouseState.prevX = ((e.clientX - rect.left) / rect.width) * this.N;
            this.mouseState.prevY = ((e.clientY - rect.top) / rect.height) * this.N;
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.mouseState.isDown) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = ((e.clientX - rect.left) / rect.width) * this.N;
            const mouseY = ((e.clientY - rect.top) / rect.height) * this.N;
            
            const dx = (mouseX - this.mouseState.prevX) * this.velocityMultiplier;
            const dy = (mouseY - this.mouseState.prevY) * this.velocityMultiplier;
            
            this.addVelocity(Math.floor(mouseX), Math.floor(mouseY), dx, dy);
            this.addDensity(Math.floor(mouseX), Math.floor(mouseY), 100);
            
            this.mouseState.prevX = mouseX;
            this.mouseState.prevY = mouseY;
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.mouseState.isDown = false;
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.mouseState.isDown = false;
        });
        
        // Touch support for Mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.mouseState.isDown = true;
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            this.mouseState.prevX = ((touch.clientX - rect.left) / rect.width) * this.N;
            this.mouseState.prevY = ((touch.clientY - rect.top) / rect.height) * this.N;
        }, { passive: false });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.mouseState.isDown) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            const mouseX = ((touch.clientX - rect.left) / rect.width) * this.N;
            const mouseY = ((touch.clientY - rect.top) / rect.height) * this.N;
            
            const dx = (mouseX - this.mouseState.prevX) * this.velocityMultiplier;
            const dy = (mouseY - this.mouseState.prevY) * this.velocityMultiplier;
            
            this.addVelocity(Math.floor(mouseX), Math.floor(mouseY), dx, dy);
            this.addDensity(Math.floor(mouseX), Math.floor(mouseY), 100);
            
            this.mouseState.prevX = mouseX;
            this.mouseState.prevY = mouseY;
        }, { passive: false });
        
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.mouseState.isDown = false;
        }, { passive: false });
    }
    
    IX(i, j) {
        return i + (this.N + 2) * j;
    }
    
    addDensity(x, y, amount) {
        if (x < 1 || x > this.N || y < 1 || y > this.N) return;
        this.dens[this.IX(x, y)] += amount;
    }
    
    addVelocity(x, y, amountX, amountY) {
        if (x < 1 || x > this.N || y < 1 || y > this.N) return;
        this.u[this.IX(x, y)] += amountX;
        this.v[this.IX(x, y)] += amountY;
    }
    
    setBnd(b, x) {
        const N = this.N;
        
        for (let i = 1; i <= N; i++) {
            x[this.IX(0, i)] = b === 1 ? -x[this.IX(1, i)] : x[this.IX(1, i)];
            x[this.IX(N + 1, i)] = b === 1 ? -x[this.IX(N, i)] : x[this.IX(N, i)];
            x[this.IX(i, 0)] = b === 2 ? -x[this.IX(i, 1)] : x[this.IX(i, 1)];
            x[this.IX(i, N + 1)] = b === 2 ? -x[this.IX(i, N)] : x[this.IX(i, N)];
        }
        
        x[this.IX(0, 0)] = 0.5 * (x[this.IX(1, 0)] + x[this.IX(0, 1)]);
        x[this.IX(0, N + 1)] = 0.5 * (x[this.IX(1, N + 1)] + x[this.IX(0, N)]);
        x[this.IX(N + 1, 0)] = 0.5 * (x[this.IX(N, 0)] + x[this.IX(N + 1, 1)]);
        x[this.IX(N + 1, N + 1)] = 0.5 * (x[this.IX(N, N + 1)] + x[this.IX(N + 1, N)]);
    }
    
    linSolve(b, x, x0, a, c) {
        const N = this.N;
        
        for (let k = 0; k < this.solverIterations; k++) {
            for (let i = 1; i <= N; i++) {
                for (let j = 1; j <= N; j++) {
                    x[this.IX(i, j)] = (x0[this.IX(i, j)] + a * (
                        x[this.IX(i - 1, j)] +
                        x[this.IX(i + 1, j)] +
                        x[this.IX(i, j - 1)] +
                        x[this.IX(i, j + 1)]
                    )) / c;
                }
            }
            this.setBnd(b, x);
        }
    }
    
    diffuse(b, x, x0, diff) {
        const a = this.dt * diff * this.N * this.N;
        this.linSolve(b, x, x0, a, 1 + 4 * a);
    }
    
    advect(b, d, d0, u, v) {
        const N = this.N;
        const dt0 = this.dt * N;
        
        for (let i = 1; i <= N; i++) {
            for (let j = 1; j <= N; j++) {
                let x = i - dt0 * u[this.IX(i, j)];
                let y = j - dt0 * v[this.IX(i, j)];
                
                if (x < 0.5) x = 0.5;
                if (x > N + 0.5) x = N + 0.5;
                let i0 = Math.floor(x);
                let i1 = i0 + 1;
                
                if (y < 0.5) y = 0.5;
                if (y > N + 0.5) y = N + 0.5;
                let j0 = Math.floor(y);
                let j1 = j0 + 1;
                
                const s1 = x - i0;
                const s0 = 1 - s1;
                const t1 = y - j0;
                const t0 = 1 - t1;
                
                d[this.IX(i, j)] = s0 * (t0 * d0[this.IX(i0, j0)] + t1 * d0[this.IX(i0, j1)]) +
                                   s1 * (t0 * d0[this.IX(i1, j0)] + t1 * d0[this.IX(i1, j1)]);
            }
        }
        this.setBnd(b, d);
    }
    
    project(u, v, p, div) {
        const N = this.N;
        
        for (let i = 1; i <= N; i++) {
            for (let j = 1; j <= N; j++) {
                div[this.IX(i, j)] = -0.5 * (
                    u[this.IX(i + 1, j)] - u[this.IX(i - 1, j)] +
                    v[this.IX(i, j + 1)] - v[this.IX(i, j - 1)]
                ) / N;
                p[this.IX(i, j)] = 0;
            }
        }
        this.setBnd(0, div);
        this.setBnd(0, p);
        
        this.linSolve(0, p, div, 1, 4);
        
        for (let i = 1; i <= N; i++) {
            for (let j = 1; j <= N; j++) {
                u[this.IX(i, j)] -= 0.5 * N * (p[this.IX(i + 1, j)] - p[this.IX(i - 1, j)]);
                v[this.IX(i, j)] -= 0.5 * N * (p[this.IX(i, j + 1)] - p[this.IX(i, j - 1)]);
            }
        }
        this.setBnd(1, u);
        this.setBnd(2, v);
    }
    
    densStep() {
        this.diffuse(0, this.dens_prev, this.dens, this.diff);
        this.advect(0, this.dens, this.dens_prev, this.u, this.v);
        
        // Fade density over time
        for (let i = 0; i < this.size; i++) {
            this.dens[i] *= this.densityFade;
        }
    }
    
    velStep() {
        this.diffuse(1, this.u_prev, this.u, this.visc);
        this.diffuse(2, this.v_prev, this.v, this.visc);
        
        this.project(this.u_prev, this.v_prev, this.u, this.v);
        
        this.advect(1, this.u, this.u_prev, this.u_prev, this.v_prev);
        this.advect(2, this.v, this.v_prev, this.u_prev, this.v_prev);
        
        this.project(this.u, this.v, this.u_prev, this.v_prev);
    }
    
    step() {
        this.velStep();
        this.densStep();
    }
    
    render() {
        const data = this.imageData.data;
        
        for (let i = 0; i < this.N; i++) {
            for (let j = 0; j < this.N; j++) {
                const idx = this.IX(i + 1, j + 1);
                const d = Math.min(255, Math.max(0, this.dens[idx]));
                
                const pixelIdx = (j * this.N + i) * 4;
                
                // Rainbow color based on density
                const hue = (d / 255) * 360;
                const rgb = this.hslToRgb(hue / 360, 1, Math.min(0.5, d / 510));
                
                data[pixelIdx] = rgb[0];
                data[pixelIdx + 1] = rgb[1];
                data[pixelIdx + 2] = rgb[2];
                data[pixelIdx + 3] = 255;
            }
        }
        
        this.ctx.putImageData(this.imageData, 0, 0);
    }
    
    hslToRgb(h, s, l) {
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }
    
    clear() {
        this.u.fill(0);
        this.v.fill(0);
        this.u_prev.fill(0);
        this.v_prev.fill(0);
        this.dens.fill(0);
        this.dens_prev.fill(0);
    }
}

// Initialize the simulation
let fluid;

window.addEventListener('load', () => {
    const canvas = document.getElementById('fluidCanvas');
    const N = 128; // Grid resolution
    
    fluid = new FluidSimulation(canvas, N);
    
    // Controls
    const clearBtn = document.getElementById('clearBtn');
    const viscositySlider = document.getElementById('viscosity');
    const viscosityValue = document.getElementById('viscosityValue');
    const diffusionSlider = document.getElementById('diffusion');
    const diffusionValue = document.getElementById('diffusionValue');
    
    clearBtn.addEventListener('click', () => {
        fluid.clear();
    });
    
    viscositySlider.addEventListener('input', (e) => {
        const value = e.target.value;
        viscosityValue.textContent = value;
        e.target.setAttribute('aria-valuenow', value);
        fluid.visc = value / 100000;
    });
    
    diffusionSlider.addEventListener('input', (e) => {
        const value = e.target.value;
        diffusionValue.textContent = value;
        e.target.setAttribute('aria-valuenow', value);
        fluid.diff = value / 100000;
    });
    
    // Animation loop
    function animate() {
        fluid.step();
        fluid.render();
        requestAnimationFrame(animate);
    }
    
    animate();
});
