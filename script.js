(() => {
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    const $ = id => document.getElementById(id);
    const panel = $('panel'), scoreEl = $('score'), bestEl = $('best'), livesEl = $('lives'), comboEl = $('combo');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let W = 0, H = 0, balls = [], bursts = [], score = 0, lives = 5, combo = 0, spawnT = 0, flash = 0;
    let running = false, paused = false, last = 0, best = 0;

    try { best = +localStorage.getItem('letterdrop-best') || 0; } catch (e) { }
    bestEl.textContent = best;

    function resize() {
        const r = cv.getBoundingClientRect(), d = devicePixelRatio || 1;
        W = r.width; H = r.height;
        cv.width = W * d; cv.height = H * d;
        ctx.setTransform(d, 0, 0, d, 0, 0);
    }
    addEventListener('resize', resize); resize();

    const hue = ch => (ch.charCodeAt(0) - 65) * 41 % 360;
    const radius = () => Math.max(24, Math.min(34, W / 14));

    function spawn() {
        const onScreen = new Set(balls.map(b => b.ch));
        let pool = [...LETTERS].filter(c => !onScreen.has(c));
        if (!pool.length) pool = [...LETTERS];
        const r = radius();
        balls.push({
            ch: pool[Math.random() * pool.length | 0], x: r + 10 + Math.random() * (W - 2 * r - 20), y: -r,
            r, vy: 55 + Math.min(score * 1.8, 150) + Math.random() * 25, sway: Math.random() * 6.28
        });
    }

    function pop(b) {
        bursts.push({ x: b.x, y: b.y, r: b.r, h: hue(b.ch), t: 0 });
    }

    function setLives() { livesEl.textContent = '?'.repeat(lives) + '?'.repeat(5 - lives); }

    function start() {
        if (paused) { paused = false; panel.hidden = true; running = true; last = performance.now(); requestAnimationFrame(loop); return; }
        balls = []; bursts = []; score = 0; lives = 5; combo = 0; spawnT = 0; flash = 0;
        scoreEl.textContent = 0; comboEl.textContent = ''; setLives();
        panel.hidden = true; running = true; last = performance.now();
        requestAnimationFrame(loop);
    }

    function end() {
        running = false;
        if (score > best) {
            best = score; bestEl.textContent = best;
            try { localStorage.setItem('letterdrop-best', best); } catch (e) { }
        }
        $('title').textContent = 'Game over';
        $('msg').textContent = 'You popped ' + score + ' letters. Best: ' + best + '.';
        $('go').textContent = 'Play again';
        panel.hidden = false; $('go').focus();
    }

    function press(ch) {
        let target = null;
        for (const b of balls) if (b.ch === ch && (!target || b.y > target.y)) target = b;
        if (target) {
            balls.splice(balls.indexOf(target), 1); pop(target);
            score++; combo++; scoreEl.textContent = score;
            comboEl.textContent = combo >= 5 ? combo + ' in a row' : '';
        } else {
            combo = 0; comboEl.textContent = ''; flash = 1;
        }
    }

    function loop(now) {
        if (!running) return;
        const dt = Math.min((now - last) / 1000, .05); last = now;
        spawnT -= dt;
        if (spawnT <= 0) { spawn(); spawnT = Math.max(.5, 1.35 - score * .012); }
        for (const b of balls) { b.y += b.vy * dt; b.sway += dt * 1.5; b.x += Math.sin(b.sway) * 12 * dt; }
        for (let i = balls.length - 1; i >= 0; i--) {
            if (balls[i].y - balls[i].r > H) { balls.splice(i, 1); lives--; combo = 0; comboEl.textContent = ''; flash = 1; setLives(); if (lives <= 0) { draw(); return end(); } }
        }
        for (const p of bursts) p.t += dt;
        bursts = bursts.filter(p => p.t < .4);
        flash = Math.max(0, flash - dt * 4);
        draw(); requestAnimationFrame(loop);
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        if (flash > 0) { ctx.fillStyle = 'rgba(255,107,107,' + (flash * .12) + ')'; ctx.fillRect(0, 0, W, H); }
        for (const b of balls) {
            const h = hue(b.ch), g = ctx.createRadialGradient(b.x - b.r * .35, b.y - b.r * .4, b.r * .1, b.x, b.y, b.r);
            g.addColorStop(0, 'hsl(' + h + ',80%,78%)'); g.addColorStop(1, 'hsl(' + h + ',65%,48%)');
            ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.2832); ctx.fillStyle = g; ctx.fill();
            ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.stroke();
            ctx.fillStyle = '#10222a'; ctx.font = '700 ' + (b.r * 1.1) + 'px "Baloo 2",ui-rounded,system-ui,sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.ch, b.x, b.y + b.r * .06);
        }
        for (const p of bursts) {
            const k = p.t / .4;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + (reduce ? 0 : k * .9)), 0, 6.2832);
            ctx.lineWidth = 3 * (1 - k); ctx.strokeStyle = 'hsla(' + p.h + ',85%,75%,' + (1 - k) + ')'; ctx.stroke();
        }
    }

    addEventListener('keydown', e => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (!running) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); } return; }
        if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toUpperCase());
    });
    $('go').addEventListener('click', start);
    addEventListener('blur', () => { if (running) { running = false; $('title').textContent = 'Paused'; $('msg').textContent = 'Click back in to keep going.'; $('go').textContent = 'Resume'; panel.hidden = false; paused = true; } });
    setLives();
})();