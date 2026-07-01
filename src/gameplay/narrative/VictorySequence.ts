/** Stages of the victory sequence */
export const VictoryStage = {
  Idle: 'Idle',
  FadeIn: 'FadeIn',
  Reveal: 'Reveal',
  Cure: 'Cure',
  Escape: 'Escape',
  Victory: 'Victory',
  Done: 'Done',
} as const;
export type VictoryStage = (typeof VictoryStage)[keyof typeof VictoryStage];

/** Human-readable text for each stage */
const STAGE_TEXT: Record<VictoryStage, string> = {
  [VictoryStage.Idle]: '',
  [VictoryStage.FadeIn]: '…',
  [VictoryStage.Reveal]: 'Helicopter Repaired',
  [VictoryStage.Cure]: 'Cure Applied…',
  [VictoryStage.Escape]: 'Taking Off!',
  [VictoryStage.Victory]: 'Snowbound — Complete!',
  [VictoryStage.Done]: '',
};

/** Default durations (seconds) for each stage */
const DEFAULT_DURATIONS: Record<VictoryStage, number> = {
  [VictoryStage.Idle]: 0,
  [VictoryStage.FadeIn]: 1,
  [VictoryStage.Reveal]: 2,
  [VictoryStage.Cure]: 2,
  [VictoryStage.Escape]: 2,
  [VictoryStage.Victory]: 3,
  [VictoryStage.Done]: 0,
};

/** Ordered stages for progression */
const STAGE_ORDER: VictoryStage[] = [
  VictoryStage.Idle,
  VictoryStage.FadeIn,
  VictoryStage.Reveal,
  VictoryStage.Cure,
  VictoryStage.Escape,
  VictoryStage.Victory,
  VictoryStage.Done,
];

export interface VictorySequenceOptions {
  onComplete?: () => void;
  onStageChange?: (stage: VictoryStage) => void;
  stageDurations?: Partial<Record<VictoryStage, number>>;
}

/**
 * VictorySequence — scripted end-game sequence with timed stage progression.
 *
 * Plays through fade-in → reveal → cure → escape → victory → done.
 * Pure logic (no DOM/rendering) so testable without jsdom.
 */
export class VictorySequence {
  private _stage: VictoryStage = VictoryStage.Idle;
  private _elapsed = 0;
  private _totalDuration: number;
  private _durations: Record<VictoryStage, number>;
  private _onComplete: (() => void) | undefined;
  private _onStageChange: ((stage: VictoryStage) => void) | undefined;

  constructor(options?: VictorySequenceOptions) {
    this._durations = { ...DEFAULT_DURATIONS, ...options?.stageDurations };
    this._totalDuration = STAGE_ORDER.reduce((sum, s) => sum + this._durations[s], 0);
    this._onComplete = options?.onComplete;
    this._onStageChange = options?.onStageChange;
  }

  /** Start the victory sequence from the beginning */
  start(): void {
    this._elapsed = 0;
    this._stage = VictoryStage.FadeIn;
    this._onStageChange?.(this._stage);
  }

  /** Advance the sequence by a delta time (seconds) */
  update(dt: number): void {
    if (this._stage === VictoryStage.Done) return;

    this._elapsed += dt;
    this._recalculateStage();
  }

  /** Skip directly to a stage (e.g. for testing or debug) */
  skipTo(stage: VictoryStage): void {
    if (stage === VictoryStage.Idle) return; // can't skip to idle

    const targetIdx = STAGE_ORDER.indexOf(stage);
    if (targetIdx < 0) return;

    // Compute elapsed to reach this stage
    let elapsed = 0;
    for (let i = 1; i < targetIdx; i++) {
      elapsed += this._durations[STAGE_ORDER[i]];
    }
    this._elapsed = elapsed;
    this._recalculateStage();
  }

  /** Recompute current stage from elapsed time */
  private _recalculateStage(): void {
    const previous = this._stage;
    let accumulated = 0;
    let newStage: VictoryStage = VictoryStage.FadeIn;

    for (let i = 1; i < STAGE_ORDER.length; i++) {
      const s = STAGE_ORDER[i];
      accumulated += this._durations[s];
      if (this._elapsed < accumulated) {
        newStage = s;
        break;
      }
      newStage = s;
    }

    if (newStage !== previous) {
      this._stage = newStage;
      this._onStageChange?.(this._stage);
      // Check if we've reached the final stage
      if (newStage === (VictoryStage.Done as VictoryStage)) {
        this._onComplete?.();
      }
    }
  }

  // ─── Accessors ─────────────────────────────────────

  /** Current progress 0–1 */
  get progress(): number {
    return Math.min(1, this._totalDuration > 0 ? this._elapsed / this._totalDuration : 1);
  }

  /** Current stage of the sequence */
  get stage(): VictoryStage {
    return this._stage;
  }

  /** Whether the sequence is currently playing */
  get isActive(): boolean {
    return this._stage !== VictoryStage.Idle && this._stage !== VictoryStage.Done;
  }

  /** Whether the sequence has fully completed */
  get isComplete(): boolean {
    return this._stage === VictoryStage.Done;
  }

  /** Human-readable text for the current stage */
  get stageText(): string {
    return STAGE_TEXT[this._stage] ?? '';
  }
}