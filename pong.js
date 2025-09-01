class Paddle {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speed = 5;
        this.dy = 0;
    }

    update(canvasHeight) {
        this.y += this.dy;
        
        if (this.y < 0) {
            this.y = 0;
        }
        if (this.y + this.height > canvasHeight) {
            this.y = canvasHeight - this.height;
        }
    }

    draw(ctx) {
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 10;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
    }

    moveUp() {
        this.dy = -this.speed;
    }

    moveDown() {
        this.dy = this.speed;
    }

    stop() {
        this.dy = 0;
    }
}

class Ball {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.dx = 0;
        this.dy = 0;
        this.speed = 4;
        this.maxSpeed = 8;
    }

    reset(canvasWidth, canvasHeight) {
        this.x = canvasWidth / 2;
        this.y = canvasHeight / 2;
        
        const angle = (Math.random() - 0.5) * Math.PI / 3;
        const direction = Math.random() < 0.5 ? 1 : -1;
        
        this.dx = Math.cos(angle) * this.speed * direction;
        this.dy = Math.sin(angle) * this.speed;
    }

    update(canvasHeight) {
        this.x += this.dx;
        this.y += this.dy;

        if (this.y - this.radius < 0 || this.y + this.radius > canvasHeight) {
            this.dy = -this.dy;
            this.playSound('wall');
        }
    }

    draw(ctx) {
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    checkPaddleCollision(paddle) {
        return this.x - this.radius < paddle.x + paddle.width &&
               this.x + this.radius > paddle.x &&
               this.y - this.radius < paddle.y + paddle.height &&
               this.y + this.radius > paddle.y;
    }

    handlePaddleCollision(paddle) {
        const hitPos = (this.y - (paddle.y + paddle.height / 2)) / (paddle.height / 2);
        
        this.dx = -this.dx;
        this.dy = hitPos * this.speed * 0.75;
        
        const currentSpeed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
        if (currentSpeed < this.maxSpeed) {
            const speedMultiplier = 1.05;
            this.dx *= speedMultiplier;
            this.dy *= speedMultiplier;
        }
        
        this.playSound('paddle');
    }

    playSound(type) {
        const audioContext = window.audioContext;
        if (!audioContext) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        if (type === 'paddle') {
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(220, audioContext.currentTime + 0.1);
        } else if (type === 'wall') {
            oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
        } else if (type === 'score') {
            oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.3);
        } else if (type === 'centipede') {
            oscillator.frequency.setValueAtTime(320, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(160, audioContext.currentTime + 0.15);
        }
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
    }

    checkCentipedeCollision(centipede) {
        return centipede.checkBallCollision(this);
    }

    handleCentipedeCollision(segment) {
        const dx = this.x - segment.x;
        const dy = this.y - segment.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const normalX = dx / distance;
            const normalY = dy / distance;
            
            const dotProduct = this.dx * normalX + this.dy * normalY;
            
            this.dx -= 2 * dotProduct * normalX;
            this.dy -= 2 * dotProduct * normalY;
        } else {
            this.dx = -this.dx;
        }
        
        this.playSound('centipede');
    }
}

class CentipedeSegment {
    constructor(x, y, segmentSize = 12) {
        this.x = x;
        this.y = y;
        this.size = segmentSize;
        this.radius = segmentSize / 2;
    }

    draw(ctx) {
        ctx.fillStyle = '#ffff00';
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    checkBallCollision(ball) {
        const dx = this.x - ball.x;
        const dy = this.y - ball.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (this.radius + ball.radius);
    }
}

class Centipede {
    constructor(startX, startY, segmentCount = 10) {
        this.segments = [];
        this.horizontalSpeed = 3;
        this.verticalSpeed = 1.5;
        this.direction = 1;
        this.zigzagDistance = 60;
        this.segmentSpacing = 15;
        this.distanceTraveled = 0;
        
        for (let i = 0; i < segmentCount; i++) {
            this.segments.push(new CentipedeSegment(
                startX - (i * this.segmentSpacing), 
                startY
            ));
        }
    }

    update(canvasWidth, canvasHeight) {
        const head = this.segments[0];
        
        head.x += this.horizontalSpeed * this.direction;
        head.y += this.verticalSpeed;
        
        this.distanceTraveled += Math.abs(this.horizontalSpeed);
        
        if (this.distanceTraveled >= this.zigzagDistance || head.x <= 30 || head.x >= canvasWidth - 30) {
            this.direction *= -1;
            this.distanceTraveled = 0;
        }
        
        for (let i = 1; i < this.segments.length; i++) {
            const prevSegment = this.segments[i - 1];
            const currentSegment = this.segments[i];
            
            const dx = prevSegment.x - currentSegment.x;
            const dy = prevSegment.y - currentSegment.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > this.segmentSpacing) {
                const angle = Math.atan2(dy, dx);
                currentSegment.x = prevSegment.x - Math.cos(angle) * this.segmentSpacing;
                currentSegment.y = prevSegment.y - Math.sin(angle) * this.segmentSpacing;
            }
        }
    }

    draw(ctx) {
        for (let segment of this.segments) {
            segment.draw(ctx);
        }
    }

    checkBallCollision(ball) {
        for (let segment of this.segments) {
            if (segment.checkBallCollision(ball)) {
                return segment;
            }
        }
        return null;
    }

    isOffScreen(canvasHeight) {
        return this.segments[this.segments.length - 1].y > canvasHeight + 50;
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.playerScore = 0;
        this.computerScore = 0;
        this.gameStarted = false;
        this.gameRunning = false;
        
        this.paddleWidth = 10;
        this.paddleHeight = 80;
        
        this.playerPaddle = new Paddle(20, this.canvas.height / 2 - this.paddleHeight / 2, this.paddleWidth, this.paddleHeight);
        this.computerPaddle = new Paddle(this.canvas.width - 30, this.canvas.height / 2 - this.paddleHeight / 2, this.paddleWidth, this.paddleHeight);
        this.ball = new Ball(this.canvas.width / 2, this.canvas.height / 2, 8);
        
        this.centipedes = [];
        this.centipedeSpawnTimer = 0;
        this.centipedeSpawnInterval = 300;
        
        this.keys = {};
        
        this.initAudio();
        this.setupEventListeners();
        this.gameLoop();
    }

    initAudio() {
        try {
            window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            if (e.code === 'Space' && !this.gameStarted) {
                this.startGame();
                e.preventDefault();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        document.addEventListener('click', () => {
            if (window.audioContext && window.audioContext.state === 'suspended') {
                window.audioContext.resume();
            }
        });
    }

    startGame() {
        this.gameStarted = true;
        this.gameRunning = true;
        this.ball.reset(this.canvas.width, this.canvas.height);
        this.spawnCentipede();
    }

    spawnCentipede() {
        const startX = Math.random() * (this.canvas.width - 200) + 100;
        const startY = -20;
        const segmentCount = Math.floor(Math.random() * 5) + 8;
        this.centipedes.push(new Centipede(startX, startY, segmentCount));
    }

    updateCentipedes() {
        this.centipedeSpawnTimer++;
        
        if (this.centipedeSpawnTimer >= this.centipedeSpawnInterval) {
            this.spawnCentipede();
            this.centipedeSpawnTimer = 0;
        }

        for (let i = this.centipedes.length - 1; i >= 0; i--) {
            const centipede = this.centipedes[i];
            centipede.update(this.canvas.width, this.canvas.height);
            
            if (centipede.isOffScreen(this.canvas.height)) {
                this.centipedes.splice(i, 1);
            }
        }
    }

    handleInput() {
        if (this.keys['KeyW'] || this.keys['ArrowUp']) {
            this.playerPaddle.moveUp();
        } else if (this.keys['KeyS'] || this.keys['ArrowDown']) {
            this.playerPaddle.moveDown();
        } else {
            this.playerPaddle.stop();
        }
    }

    updateAI() {
        const paddleCenter = this.computerPaddle.y + this.computerPaddle.height / 2;
        const ballY = this.ball.y;
        const diff = ballY - paddleCenter;
        
        if (Math.abs(diff) > 10) {
            if (diff > 0) {
                this.computerPaddle.moveDown();
            } else {
                this.computerPaddle.moveUp();
            }
        } else {
            this.computerPaddle.stop();
        }
    }

    update() {
        if (!this.gameRunning) return;

        this.handleInput();
        this.updateAI();
        this.updateCentipedes();
        
        this.playerPaddle.update(this.canvas.height);
        this.computerPaddle.update(this.canvas.height);
        this.ball.update(this.canvas.height);

        if (this.ball.checkPaddleCollision(this.playerPaddle)) {
            this.ball.handlePaddleCollision(this.playerPaddle);
        }

        if (this.ball.checkPaddleCollision(this.computerPaddle)) {
            this.ball.handlePaddleCollision(this.computerPaddle);
        }

        for (let centipede of this.centipedes) {
            const hitSegment = centipede.checkBallCollision(this.ball);
            if (hitSegment) {
                this.ball.handleCentipedeCollision(hitSegment);
                break;
            }
        }

        if (this.ball.x < 0) {
            this.computerScore++;
            this.ball.playSound('score');
            this.updateScore();
            this.resetBall();
        }

        if (this.ball.x > this.canvas.width) {
            this.playerScore++;
            this.ball.playSound('score');
            this.updateScore();
            this.resetBall();
        }
    }

    resetBall() {
        this.gameRunning = false;
        setTimeout(() => {
            this.ball.reset(this.canvas.width, this.canvas.height);
            this.gameRunning = true;
        }, 1000);
    }

    updateScore() {
        document.getElementById('playerScore').textContent = this.playerScore;
        document.getElementById('computerScore').textContent = this.computerScore;
    }

    draw() {
        this.ctx.fillStyle = '#001100';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.strokeStyle = '#00ff00';
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        this.playerPaddle.draw(this.ctx);
        this.computerPaddle.draw(this.ctx);
        
        for (let centipede of this.centipedes) {
            centipede.draw(this.ctx);
        }
        
        this.ball.draw(this.ctx);

        if (!this.gameStarted) {
            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = 'bold 24px Orbitron, monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PRESS SPACE TO START', this.canvas.width / 2, this.canvas.height / 2 + 50);
        }
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

window.addEventListener('load', () => {
    new Game();
});