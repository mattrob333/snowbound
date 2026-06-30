import type { GameContext } from '../../app/GameContext';

/** HUD display states */
export type ObjectiveState = 'find_part' | 'return_to_zone' | 'level_complete' | 'none';

/**
 * Hud — in-game objective text overlay rendered as a DOM layer over the canvas.
 * Displays the current objective based on game state.
 */
export class Hud {
  private container: HTMLDivElement;
  private objectiveEl: HTMLDivElement;
  private warningEl: HTMLDivElement;
  private _objectiveState: ObjectiveState = 'none';
  private _lastDisplayedState: ObjectiveState | null = null;
  private _lastWarningVisible = false;
  private attached = false;

  constructor() {
    // Create HUD overlay container
    this.container = document.createElement('div');
    this.container.id = 'snowbound-hud';
    this.container.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      pointer-events: none;
      z-index: 10;
      font-family: sans-serif;
      overflow: hidden;
    `;

    // Objective text — centred near the top
    this.objectiveEl = document.createElement('div');
    this.objectiveEl.style.cssText = `
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      color: white;
      font-size: 18px;
      font-weight: bold;
      text-shadow: 0 1px 4px rgba(0,0,0,0.8);
      text-align: center;
      background: rgba(0,0,0,0.4);
      padding: 8px 20px;
      border-radius: 6px;
      white-space: nowrap;
      transition: opacity 0.3s ease;
    `;
    this.objectiveEl.textContent = '';

    // Dog close warning — centred near the bottom
    this.warningEl = document.createElement('div');
    this.warningEl.style.cssText = `
      position: absolute;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      color: #ff4444;
      font-size: 14px;
      font-weight: bold;
      text-shadow: 0 0 8px rgba(255,0,0,0.6), 0 1px 4px rgba(0,0,0,0.8);
      text-align: center;
      background: rgba(0,0,0,0.5);
      padding: 6px 16px;
      border-radius: 6px;
      white-space: nowrap;
      opacity: 0;
      transition: opacity 0.2s ease;
    `;
    this.warningEl.textContent = '⚠️ Dog is close! Run!';

    this.container.appendChild(this.objectiveEl);
    this.container.appendChild(this.warningEl);
  }

  /** Attach the HUD overlay to a parent element (typically the renderer container) */
  attach(parent: HTMLElement): void {
    if (this.attached) return;
    parent.appendChild(this.container);
    this.attached = true;
  }

  /** Detach the HUD overlay */
  detach(): void {
    if (!this.attached) return;
    this.container.remove();
    this.attached = false;
  }

  /**
   * Determine the current objective state based on game context.
   * Returns the objective to display (or 'none' for no objective).
   */
  private determineObjectiveState(ctx: GameContext): ObjectiveState {
    if (!ctx.levelManager.isLevelLoaded) return 'none';
    const data = ctx.levelManager.levelData;
    if (!data) return 'none';

    // Level complete gets priority
    const safeZone = ctx.levelManager.safeZone;
    if (safeZone?.completed) return 'level_complete';

    // Part collected → return to safe zone
    if (ctx.player.partCollected) return 'return_to_zone';

    // Part not yet collected → find it
    if (data.helicopterPart) return 'find_part';

    return 'none';
  }

  /** Get the display text for the current objective */
  private getObjectiveText(state: ObjectiveState): string {
    switch (state) {
      case 'find_part':
        return '🔍 Find the helicopter part';
      case 'return_to_zone':
        return '📮 Bring the part to the safe zone';
      case 'level_complete':
        return '✅ Level Complete!';
      case 'none':
        return '';
    }
  }

  /** Update HUD text based on current game state */
  update(_dt: number, ctx: GameContext): void {
    this._objectiveState = this.determineObjectiveState(ctx);

    if (this._objectiveState !== this._lastDisplayedState) {
      this._lastDisplayedState = this._objectiveState;
      this.objectiveEl.textContent = this.getObjectiveText(this._objectiveState);
    }

    // Dog close warning — check chase director
    const director = ctx.levelManager.chaseDirector;
    const warningVisible = director !== null && director.closeWarning && !director.caught;
    if (warningVisible !== this._lastWarningVisible) {
      this._lastWarningVisible = warningVisible;
      this.warningEl.style.opacity = warningVisible ? '1' : '0';
    }
  }

  /** Clean up */
  dispose(): void {
    this.detach();
    this.objectiveEl.remove();
    this.container.remove();
  }
}