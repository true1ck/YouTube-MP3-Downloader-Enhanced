// Simplified YouTube-themed Cursor Fluid Animation
class SimpleCursorFluid {
    constructor() {
        console.log('Initializing Simple YouTube Cursor Animation...');
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.mouse = { x: 0, y: 0, lastX: 0, lastY: 0 };
        this.colors = [
            'rgba(255, 0, 0, 0.8)',      // YouTube red
            'rgba(255, 68, 68, 0.6)',    // Light red
            'rgba(204, 0, 0, 0.7)',      // Dark red
            'rgba(255, 255, 255, 0.5)'   // White accent
        ];
        
        this.init();
    }
    
    init() {
        this.createCanvas();
        this.setupEventListeners();
        this.startAnimation();
        console.log('Simple cursor animation started successfully');
    }
    
    createCanvas() {
        this.canvas = document.getElementById('fluid-canvas') || document.createElement('canvas');
        
        if (!document.getElementById('fluid-canvas')) {
            this.canvas.id = 'fluid-canvas';
            this.canvas.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: -1;
                pointer-events: none;
                opacity: 0.7;
            `;
            document.body.insertBefore(this.canvas, document.body.firstChild);
        }
        
        this.resizeCanvas();
        this.ctx = this.canvas.getContext('2d');
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    setupEventListeners() {
        document.addEventListener('mousemove', (e) => {
            this.mouse.lastX = this.mouse.x;
            this.mouse.lastY = this.mouse.y;
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            
            // Create particles on mouse move
            this.createParticles();
        });
        
        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                this.mouse.lastX = this.mouse.x;
                this.mouse.lastY = this.mouse.y;
                this.mouse.x = e.touches[0].clientX;
                this.mouse.y = e.touches[0].clientY;
                this.createParticles();
            }
        }, { passive: false });
        
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }
    
    createParticles() {
        const dx = this.mouse.x - this.mouse.lastX;
        const dy = this.mouse.y - this.mouse.lastY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 2) {
            for (let i = 0; i < Math.min(distance / 3, 8); i++) {
                this.particles.push({
                    x: this.mouse.x + (Math.random() - 0.5) * 20,
                    y: this.mouse.y + (Math.random() - 0.5) * 20,
                    vx: dx * 0.1 + (Math.random() - 0.5) * 2,
                    vy: dy * 0.1 + (Math.random() - 0.5) * 2,
                    size: Math.random() * 15 + 5,
                    life: 1.0,
                    decay: 0.01 + Math.random() * 0.02,
                    color: this.colors[Math.floor(Math.random() * this.colors.length)]
                });
            }
        }
        
        // Limit particles for performance
        if (this.particles.length > 200) {
            this.particles.splice(0, this.particles.length - 200);
        }
    }
    
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            // Update position
            p.x += p.vx;
            p.y += p.vy;
            
            // Apply friction
            p.vx *= 0.99;
            p.vy *= 0.99;
            
            // Update life
            p.life -= p.decay;
            
            // Remove dead particles
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    drawParticles() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (const p of this.particles) {
            const alpha = p.life;
            
            // Create gradient
            const gradient = this.ctx.createRadialGradient(
                p.x, p.y, 0,
                p.x, p.y, p.size
            );
            
            // Parse color and apply alpha
            const baseColor = p.color.replace(/rgba?\([^)]*\)/, '');
            const colorMatch = p.color.match(/\d+/g);
            if (colorMatch && colorMatch.length >= 3) {
                gradient.addColorStop(0, `rgba(${colorMatch[0]}, ${colorMatch[1]}, ${colorMatch[2]}, ${alpha * 0.8})`);
                gradient.addColorStop(0.5, `rgba(${colorMatch[0]}, ${colorMatch[1]}, ${colorMatch[2]}, ${alpha * 0.4})`);
                gradient.addColorStop(1, `rgba(${colorMatch[0]}, ${colorMatch[1]}, ${colorMatch[2]}, 0)`);
            }
            
            // Draw particle
            this.ctx.beginPath();
            this.ctx.fillStyle = gradient;
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Add glow effect for YouTube red particles
            if (p.color.includes('255, 0, 0')) {
                this.ctx.shadowColor = '#FF0000';
                this.ctx.shadowBlur = 10;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size * 0.3, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            }
        }
    }
    
    startAnimation() {
        const animate = () => {
            this.updateParticles();
            this.drawParticles();
            requestAnimationFrame(animate);
        };
        animate();
        
        // Create initial particles for demonstration
        setTimeout(() => {
            this.mouse.x = window.innerWidth / 2;
            this.mouse.y = window.innerHeight / 2;
            this.mouse.lastX = this.mouse.x - 50;
            this.mouse.lastY = this.mouse.y - 50;
            this.createParticles();
        }, 500);
    }
}

// Initialize the animation
document.addEventListener('DOMContentLoaded', () => {
    console.log('Starting YouTube cursor animation...');
    
    setTimeout(() => {
        try {
            // Try WebGL version first, fallback to simple version
            const testCanvas = document.createElement('canvas');
            const webglSupported = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
            
            if (webglSupported) {
                console.log('Attempting WebGL cursor animation...');
                // The original WebGL version will try to load
            } else {
                console.log('WebGL not supported, using Canvas 2D animation');
                new SimpleCursorFluid();
            }
        } catch (error) {
            console.log('Using fallback Canvas 2D animation');
            new SimpleCursorFluid();
        }
    }, 300);
});
