/**
 * TitleScreen — full-screen DOM overlay with the game title and
 * "Press Enter to Play" prompt. Boots first, then transitions to
 * level select on Enter.
 */
export class TitleScreen {
  private container: HTMLDivElement;
  private titleEl: HTMLDivElement;
  private subtitleEl: HTMLDivElement;
  private snowflakesEl: HTMLDivElement;
  private _onPlay: (() => void) | null = null;
  private attached = false;
  private visible = false;
  private boundKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private animFrameId = 0;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'snowbound-title';
    this.container.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(180deg, #0a1628 0%, #1a2a4a 50%, #0d1f3c 100%);
      z-index: 40;
      font-family: sans-serif;
      color: white;
      opacity: 0;
      transition: opacity 0.8s ease;
      pointer-events: none;
      overflow: hidden;
    `;

    // Snowflake canvas animation
    this.snowflakesEl = document.createElement('div');
    this.snowflakesEl.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: -1;
    `;
    this.container.appendChild(this.snowflakesEl);

    // Title
    this.titleEl = document.createElement('div');
    this.titleEl.textContent = 'SNOWBOUND';
    this.titleEl.style.cssText = `
      font-size: 72px;
      font-weight: bold;
      color: #e8f0ff;
      text-shadow: 0 0 40px rgba(200, 220, 255, 0.3), 0 4px 12px rgba(0,0,0,0.5);
      margin-bottom: 8px;
      letter-spacing: 12px;
      z-index: 1;
    `;
    this.container.appendChild(this.titleEl);

    // Subtitle
    const subtitle = document.createElement('div');
    subtitle.textContent = 'A Frozen Chase';
    subtitle.style.cssText = `
      font-size: 18px;
      color: #8ab4f8;
      letter-spacing: 4px;
      margin-bottom: 48px;
      text-shadow: 0 1px 4px rgba(0,0,0,0.5);
      z-index: 1;
    `;
    this.container.appendChild(subtitle);

    // "Press Enter to Play" prompt
    this.subtitleEl = document.createElement('div');
    this.subtitleEl.textContent = 'Press Enter to Play';
    this.subtitleEl.style.cssText = `
      font-size: 22px;
      color: #c0d8ff;
      text-shadow: 0 0 20px rgba(150, 200, 255, 0.4), 0 2px 6px rgba(0,0,0,0.8);
      animation: titlePulse 1.5s ease-in-out infinite;
      z-index: 1;
      letter-spacing: 2px;
    `;
    this.container.appendChild(this.subtitleEl);

    // Add keyframe animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes titlePulse {
        0%, 100% { opacity: 0.5; transform: scale(1); }
        50% { opacity: 1.0; transform: scale(1.03); }
      }
    `;
    document.head.appendChild(style);
  }

  /** Callback fired when the player presses Enter */
  get onPlay(): (() => void) | null {
    return this._onPlay;
  }

  set onPlay(value: (() => void) | null) {
    this._onPlay = value;
  }

  get isVisible(): boolean {
    return this.visible;
  }

  /** Show the title screen and start listening for Enter */
  show(): void {
    if (this.visible) return;
    this.visible = true;
    this.container.style.display = 'flex';
    void this.container.offsetHeight; // force reflow
    this.container.style.opacity = '1';
    this.container.style.pointerEvents = 'all';

    this.startSnowflakes();

    this.boundKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.key === 'Enter') {
        this._onPlay?.();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', this.boundKeyDown);
  }

  /** Hide the title screen and stop listening */
  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.stopSnowflakes();
    this.container.style.opacity = '0';
    this.container.style.pointerEvents = 'none';
    setTimeout(() => {
      this.container.style.display = 'none';
    }, 800);

    if (this.boundKeyDown) {
      window.removeEventListener('keydown', this.boundKeyDown);
      this.boundKeyDown = null;
    }
  }

  /** Attach the overlay to a parent DOM element */
  attach(parent: HTMLElement): void {
    if (this.attached) return;
    parent.appendChild(this.container);
    this.attached = true;
  }

  /** Detach from DOM */
  detach(): void {
    if (!this.attached) return;
    this.stopSnowflakes();
    this.hide();
    this.container.remove();
    this.attached = false;
  }

  dispose(): void {
    this.detach();
    if (this.boundKeyDown) {
      window.removeEventListener('keydown', this.boundKeyDown);
      this.boundKeyDown = null;
    }
    this._onPlay = null;
  }

  // ---- Snowflake animation ----

  private flakes: { x: number; y: number; size: number; speed: number; opacity: number }[] = [];
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  private startSnowflakes(): void {
    if (this.canvas) return;

    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%;';
    this.snowflakesEl.appendChild(this.canvas);
    this.canvas.width = this.snowflakesEl.clientWidth || window.innerWidth;
    this.canvas.height = this.snowflakesEl.clientHeight || window.innerHeight;
    this.ctx = this.canvas.getContext('2d')!;

    // Create snowflakes
    this.flakes = [];
    for (let i = 0; i < 80; i++) {
      this.flakes.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.6 + 0.2,
      });
    }

    const animate = () => {
      if (!this.canvas || !this.ctx) return;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      for (const f of this.flakes) {
        this.ctx.beginPath();
        this.ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(255, 255, 255, ${f.opacity})`;
        this.ctx.fill();

        f.y += f.speed;
        f.x += Math.sin(f.y * 0.01) * 0.5;

        if (f.y > this.canvas.height) {
          f.y = -f.size;
          f.x = Math.random() * this.canvas.width;
        }
      }

      this.animFrameId = requestAnimationFrame(animate);
    };

    this.animFrameId = requestAnimationFrame(animate);
  }

  private stopSnowflakes(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
      this.ctx = null;
    }
    this.flakes = [];
  }
}