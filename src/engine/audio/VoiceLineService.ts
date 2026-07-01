/**
 * VoiceLineService — manages playback of Jim's voice lines triggered by
 * gameplay events (part collected, caught, jump, slide, wall-run, stumble,
 * level complete, sprint).
 *
 * Each voice line has an independent cooldown to prevent spam.
 * All playback is silent in mock mode (AudioManager.mock === true),
 * so the service works in tests and headless environments without real audio.
 *
 * Voice line sound keys follow the convention 'voice_<event_name>' and are
 * expected to be loaded via AudioManager.loadFile() with corresponding URLs.
 * Missing files silently fall back to a no-op handle.
 */
import type { AudioManager } from './AudioManager';

/** Per-event voice line cooldown configuration (seconds) */
export interface VoiceLineCooldowns {
  partCollected: number;
  caught: number;
  jump: number;
  slide: number;
  wallRun: number;
  stumble: number;
  levelComplete: number;
  sprint: number;
  powerUp: number;
  powerUpExpire: number;
}

const DEFAULT_COOLDOWNS: VoiceLineCooldowns = {
  partCollected: 0,
  caught: 0,
  jump: 1.0,
  slide: 2.0,
  wallRun: 2.0,
  stumble: 3.0,
  levelComplete: 0,
  sprint: 0.5,
  powerUp: 0,
  powerUpExpire: 0,
} as const;

/** Event names mapped to voice line sound keys */
export const VoiceLineKey = {
  PartCollected: 'voice_part_collected',
  Caught: 'voice_caught',
  Jump: 'voice_jump',
  Slide: 'voice_slide',
  WallRun: 'voice_wall_run',
  Stumble: 'voice_stumble',
  LevelComplete: 'voice_level_complete',
  Sprint: 'voice_sprint',
  PowerUp: 'voice_power_up',
  PowerUpExpire: 'voice_power_up_expire',
} as const;

export type VoiceLineKey = (typeof VoiceLineKey)[keyof typeof VoiceLineKey];

export class VoiceLineService {
  private audio: AudioManager;
  private cooldowns: VoiceLineCooldowns;
  private lastPlayedAt: Map<string, number> = new Map();
  private _enabled = true;
  private _elapsed = 0;

  constructor(audio: AudioManager, cooldowns?: Partial<VoiceLineCooldowns>) {
    this.audio = audio;
    this.cooldowns = { ...DEFAULT_COOLDOWNS, ...cooldowns };
  }

  /** Whether voice line playback is enabled */
  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
  }

  /** Advance the internal clock. Call every frame with dt. */
  update(dt: number): void {
    this._elapsed += dt;
  }

  /** Reset internal state (cooldown timers, elapsed clock). */
  reset(): void {
    this.lastPlayedAt.clear();
    this._elapsed = 0;
  }

  // ─── Event methods ──────────────────────────────────────

  playPartCollected(): void {
    this._playWithCooldown(VoiceLineKey.PartCollected, this.cooldowns.partCollected);
  }

  playCaught(): void {
    this._play(VoiceLineKey.Caught);
  }

  playJump(): void {
    this._playWithCooldown(VoiceLineKey.Jump, this.cooldowns.jump);
  }

  playSlide(): void {
    this._playWithCooldown(VoiceLineKey.Slide, this.cooldowns.slide);
  }

  playWallRun(): void {
    this._playWithCooldown(VoiceLineKey.WallRun, this.cooldowns.wallRun);
  }

  playStumble(): void {
    this._playWithCooldown(VoiceLineKey.Stumble, this.cooldowns.stumble);
  }

  playLevelComplete(): void {
    this._play(VoiceLineKey.LevelComplete);
  }

  playSprint(): void {
    this._playWithCooldown(VoiceLineKey.Sprint, this.cooldowns.sprint);
  }

  playPowerUp(): void {
    this._play(VoiceLineKey.PowerUp);
  }

  playPowerUpExpire(): void {
    this._play(VoiceLineKey.PowerUpExpire);
  }

  // ─── Private helpers ────────────────────────────────────

  /** Play a voice line immediately (no cooldown check). */
  private _play(key: VoiceLineKey): void {
    if (!this._enabled) return;
    this.lastPlayedAt.set(key, this._elapsed);
    this.audio.play(key, 'sfx');
  }

  /** Play a voice line only if its cooldown has elapsed since last play. */
  private _playWithCooldown(key: VoiceLineKey, cooldown: number): void {
    if (!this._enabled) return;
    const last = this.lastPlayedAt.get(key);
    if (last !== undefined && (this._elapsed - last) < cooldown) return;
    this.lastPlayedAt.set(key, this._elapsed);
    this.audio.play(key, 'sfx');
  }
}