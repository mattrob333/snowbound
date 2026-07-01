import type { GameContext } from '../../app/GameContext';

/** HUD display states */
export type ObjectiveState = 'find_part' | 'return_to_zone' | 'level_complete' | 'none';

/**
 * In-game objective text overlay rendered as a DOM layer over the canvas.
 * Displays the current objective based on game state.
 */
export class Hud {
  private container: HTMLDivElement;
  private objectiveEl: HTMLDivElement;
  private warningEl: HTMLDivElement;
  private damageEl: HTMLDivElement;
  private controlsEl: HTMLDivElement;
  private _objectiveState: ObjectiveState = 'none';
  private _lastDisplayedState: ObjectiveState | null = null;
  private _lastWarningVisible = false;
  private _lastCaughtVisible = false;
  private attached = false;

  constructor() {
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
      display: none;
      opacity: 0;
      transition: opacity 0.2s ease;
    `;
    this.warningEl.textContent = 'Dog is close! Run!';

    this.damageEl = document.createElement('div');
    this.damageEl.style.cssText = `
      position: absolute;
      top: 72px;
      left: 50%;
      transform: translateX(-50%);
      color: white;
      font-size: 18px;
      font-weight: bold;
      text-shadow: 0 1px 6px rgba(0,0,0,0.9);
      text-align: center;
      background: rgba(150,0,0,0.72);
      padding: 10px 20px;
      border-radius: 6px;
      white-space: nowrap;
      display: none;
      opacity: 0;
      transition: opacity 0.2s ease;
    `;
    this.damageEl.textContent = 'Caught by the dog!';

    this.controlsEl = document.createElement('div');
    this.controlsEl.style.cssText = `
      position: absolute;
      left: 16px;
      bottom: 16px;
      color: white;
      font-size: 13px;
      line-height: 1.55;
      text-shadow: 0 1px 4px rgba(0,0,0,0.85);
      background: rgba(0,0,0,0.42);
      padding: 10px 12px;
      border-radius: 6px;
      max-width: 280px;
    `;
    this.controlsEl.innerHTML = [
      '<strong>Controls</strong>',
      'W/S: up/down',
      'A/D: left/right',
      'Space: jump',
      'Shift: sprint',
      'Ctrl or C: slide',
      'Goal: touch the yellow part, then reach the blue safe zone',
    ].join('<br>');

    this.container.appendChild(this.objectiveEl);
    this.container.appendChild(this.warningEl);
    this.container.appendChild(this.damageEl);
    this.container.appendChild(this.controlsEl);
  }

  /** Attach the HUD overlay to a parent element, typically the renderer container. */
  attach(parent: HTMLElement): void {
    if (this.attached) return;
    parent.appendChild(this.container);
    this.attached = true;
  }

  detach(): void {
    if (!this.attached) return;
    this.container.remove();
    this.attached = false;
  }

  show(): void {
    this.container.style.display = 'block';
    this.container.style.opacity = '1';
  }

  hide(): void {
    this.container.style.display = 'none';
    this.container.style.opacity = '0';
  }

  private determineObjectiveState(ctx: GameContext): ObjectiveState {
    if (!ctx.levelManager.isLevelLoaded) return 'none';
    const data = ctx.levelManager.levelData;
    if (!data) return 'none';

    const safeZone = ctx.levelManager.safeZone;
    if (safeZone?.completed) return 'level_complete';

    if (ctx.player.partCollected) return 'return_to_zone';
    if (data.helicopterPart) return 'find_part';

    return 'none';
  }

  private getObjectiveText(state: ObjectiveState): string {
    switch (state) {
      case 'find_part':
        return 'Find the helicopter part';
      case 'return_to_zone':
        return 'Bring the part to the safe zone';
      case 'level_complete':
        return 'Level Complete!';
      case 'none':
        return '';
    }
  }

  update(_dt: number, ctx: GameContext): void {
    this._objectiveState = this.determineObjectiveState(ctx);

    if (this._objectiveState !== this._lastDisplayedState) {
      this._lastDisplayedState = this._objectiveState;
      this.objectiveEl.textContent = this.getObjectiveText(this._objectiveState);
    }

    const director = ctx.levelManager.chaseDirector;
    const warningVisible =
      director !== null &&
      director.chaseActive &&
      director.closeWarning &&
      !director.caught;

    if (warningVisible !== this._lastWarningVisible) {
      this._lastWarningVisible = warningVisible;
      this.warningEl.style.display = warningVisible ? 'block' : 'none';
      this.warningEl.style.opacity = warningVisible ? '1' : '0';
    }

    const caughtVisible = director?.caught === true;
    if (caughtVisible !== this._lastCaughtVisible) {
      this._lastCaughtVisible = caughtVisible;
      this.damageEl.style.display = caughtVisible ? 'block' : 'none';
      this.damageEl.style.opacity = caughtVisible ? '1' : '0';
    }
  }

  dispose(): void {
    this.detach();
    this.objectiveEl.remove();
    this.warningEl.remove();
    this.damageEl.remove();
    this.controlsEl.remove();
    this.container.remove();
  }
}
