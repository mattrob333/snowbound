/**
 * GameOverScreen — full-screen DOM overlay that appears when the dog
 * catches the player. Shows "Game Over" with a restart prompt.
 */
export class GameOverScreen {
  private container: HTMLDivElement;
  private titleEl: HTMLDivElement;
  private subtitleEl: HTMLDivElement;
  private _onRestart: (() => void) | null = null;
  private attached = false;
  private boundKeyDown: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'snowbound-gameover';
    this.container.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.85);
      z-index: 30;
      font-family: sans-serif;
      color: white;
      opacity: 0;
      transition: opacity 0.5s ease;
      pointer-events: none;
    `;

    this.titleEl = document.createElement('div');
    this.titleEl.textContent = 'GAME OVER';
    this.titleEl.style.cssText = `
      font-size: 56px;
      font-weight: bold;
      color: #ff4444;
      text-shadow: 0 0 30px rgba(255,0,0,0.5), 0 2px 8px rgba(0,0,0,0.5);
      margin-bottom: 16px;
      letter-spacing: 6px;
    `;

    this.subtitleEl = document.createElement('div');
    this.subtitleEl.textContent = 'Press R or click to restart';
    this.subtitleEl.style.cssText = `
      font-size: 18px;
      color: #ccc;
      text-shadow: 0 1px 4px rgba(0,0,0,0.8);
      animation: pulse 1.5s ease-in-out infinite;
    `;

    // Add a keyframe animation for the pulse
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1.0; }
      }
    `;
    document.head.appendChild(style);

    this.container.appendChild(this.titleEl);
    this.container.appendChild(this.subtitleEl);

    // Click to restart
    this.container.addEventListener('click', () => {
      if (this.visible) this._onRestart?.();
    });
  }

  /** Callback fired when the player wants to restart */
  get onRestart(): (() => void) | null {
    return this._onRestart;
  }

  set onRestart(value: (() => void) | null) {
    this._onRestart = value;
  }

  get visible(): boolean {
    return this.container.style.display !== 'none';
  }

  /** Show the game over overlay and start listening for R key */
  show(): void {
    if (this.visible) return;
    this.container.style.display = 'flex';
    // Force reflow before setting opacity for transition to work
    void this.container.offsetHeight;
    this.container.style.opacity = '1';
    this.container.style.pointerEvents = 'all';

    // Listen for R key to restart
    this.boundKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyR' || e.key === 'r') {
        this._onRestart?.();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', this.boundKeyDown);
  }

  /** Hide the game over overlay and stop listening */
  hide(): void {
    if (!this.visible) return;
    this.container.style.opacity = '0';
    this.container.style.pointerEvents = 'none';
    this.container.style.display = 'none';

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
    this._onRestart = null;
  }
}