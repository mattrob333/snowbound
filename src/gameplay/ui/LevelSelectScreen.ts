import type { SaveService } from '../save/SaveService';

/**
 * DOM-based level selection overlay.
 * Shows unlocked levels and allows the player to start a level or reset save data.
 */
export class LevelSelectScreen {
  private container: HTMLDivElement;
  private saveService: SaveService;
  private onStartLevel: (levelId: string) => void;
  private onBackToTitle: () => void;
  private visible = false;

  constructor(
    saveService: SaveService,
    onStartLevel: (levelId: string) => void,
    onBackToTitle: () => void,
  ) {
    this.saveService = saveService;
    this.onStartLevel = onStartLevel;
    this.onBackToTitle = onBackToTitle;

    this.container = document.createElement('div');
    this.container.id = 'snowbound-level-select';
    this.container.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.8);
      z-index: 20;
      font-family: sans-serif;
      color: white;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    `;

    this.render();
  }

  private render(): void {
    this.container.innerHTML = '';

    const title = document.createElement('h1');
    title.textContent = 'Snowbound';
    title.style.cssText = `
      font-size: 36px;
      margin-bottom: 8px;
      text-shadow: 0 2px 8px rgba(0,0,0,0.5);
    `;
    this.container.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Select a level to play';
    subtitle.style.cssText = `
      font-size: 16px;
      margin-bottom: 20px;
      color: #aaa;
    `;
    this.container.appendChild(subtitle);

    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 10px;
      max-width: 600px;
      margin-bottom: 24px;
    `;

    const unlockedLevels = this.saveService.getUnlockedLevels();
    for (let i = 1; i <= 15; i++) {
      const levelId = `level-${String(i).padStart(2, '0')}`;
      const unlocked = unlockedLevels.includes(levelId);
      const completed = this.saveService.isLevelCompleted(levelId);

      const btn = document.createElement('button');
      btn.textContent = `${i}`;
      btn.title = unlocked ? (completed ? `${levelId} - completed` : levelId) : 'Locked';
      btn.style.cssText = `
        width: 64px;
        height: 64px;
        font-size: 20px;
        font-weight: bold;
        border: 2px solid ${unlocked ? (completed ? '#4caf50' : '#44aaff') : '#555'};
        border-radius: 8px;
        cursor: ${unlocked ? 'pointer' : 'not-allowed'};
        background: ${unlocked ? (completed ? 'rgba(76,175,80,0.2)' : 'rgba(68,170,255,0.15)') : '#222'};
        color: ${unlocked ? 'white' : '#666'};
        transition: all 0.2s ease;
      `;

      if (unlocked) {
        btn.onmouseenter = () => {
          btn.style.transform = 'scale(1.1)';
          btn.style.borderColor = completed ? '#66bb6a' : '#66ccff';
        };
        btn.onmouseleave = () => {
          btn.style.transform = 'scale(1)';
          btn.style.borderColor = completed ? '#4caf50' : '#44aaff';
        };
        btn.onclick = () => this.onStartLevel(levelId);
      }

      grid.appendChild(btn);
    }

    this.container.appendChild(grid);

    const completedCount = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
      .map(i => `level-${String(i).padStart(2, '0')}`)
      .filter(id => this.saveService.isLevelCompleted(id))
      .length;
    const parts = this.saveService.getTotalParts();
    const upgrades = this.saveService.getUpgrades().length;

    const stats = document.createElement('p');
    stats.textContent = `${completedCount}/15 levels complete - ${parts} parts - ${upgrades} upgrades`;
    stats.style.cssText = `
      font-size: 14px;
      color: #888;
      margin-bottom: 16px;
    `;
    this.container.appendChild(stats);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display: flex; gap: 12px;';

    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset Save';
    resetBtn.style.cssText = `
      padding: 10px 20px;
      font-size: 14px;
      border: 2px solid #ff4444;
      border-radius: 6px;
      cursor: pointer;
      background: rgba(255,68,68,0.1);
      color: #ff4444;
      transition: all 0.2s ease;
    `;
    resetBtn.onmouseenter = () => { resetBtn.style.background = 'rgba(255,68,68,0.3)'; };
    resetBtn.onmouseleave = () => { resetBtn.style.background = 'rgba(255,68,68,0.1)'; };
    resetBtn.onclick = () => {
      if (confirm('Reset all progress? This cannot be undone.')) {
        this.saveService.resetAll();
        this.render();
      }
    };
    btnRow.appendChild(resetBtn);

    const backBtn = document.createElement('button');
    backBtn.textContent = 'Back';
    backBtn.style.cssText = `
      padding: 10px 20px;
      font-size: 14px;
      border: 2px solid #888;
      border-radius: 6px;
      cursor: pointer;
      background: rgba(255,255,255,0.05);
      color: #ccc;
      transition: all 0.2s ease;
    `;
    backBtn.id = 'snowbound-back-btn';
    backBtn.onclick = () => this.onBackToTitle();
    btnRow.appendChild(backBtn);

    this.container.appendChild(btnRow);
  }

  show(): void {
    if (this.visible) return;
    this.render();
    this.container.style.display = 'flex';
    this.container.style.opacity = '1';
    this.container.style.pointerEvents = 'all';
    this.visible = true;
  }

  hide(): void {
    if (!this.visible) return;
    this.container.style.opacity = '0';
    this.container.style.pointerEvents = 'none';
    this.container.style.display = 'none';
    this.visible = false;
  }

  attach(parent: HTMLElement): void {
    parent.appendChild(this.container);
  }

  detach(): void {
    this.container.remove();
  }
}
