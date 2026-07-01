/**
 * MusicLayerManager — manages two layered music tracks (patrol ambient + chase intensity)
 * with crossfade based on dog proximity/distance.
 *
 * - Patrol track loops at full volume when the dog is far away.
 * - Chase track crossfades in as the dog gets closer.
 * - At catch threshold, chase is at full volume and patrol is silent.
 * - When caught/complete, both tracks fade to silence.
 *
 * Uses AudioManager's music type for volume management (respects music volume slider).
 */
import type { AudioManager, SoundHandle } from './AudioManager';

export interface MusicLayerConfig {
  /** Key for the patrol ambient music track (loaded in AudioManager) */
  patrolKey: string;
  /** Key for the chase intensity music track (loaded in AudioManager) */
  chaseKey: string;
  /** How fast the crossfade ramps in units per second (default: 2.0) */
  fadeSpeed?: number;
  /** Distance gap at which chase starts ramping in (default: 8 units) */
  closeThreshold?: number;
  /** Distance gap at which chase is at full volume (default: 1.5 units) */
  catchThreshold?: number;
}

export type MusicLayerState = 'idle' | 'patrol' | 'intensity' | 'caught';

export class MusicLayerManager {
  private audio: AudioManager;
  private config: Required<MusicLayerConfig>;

  private patrolHandle: SoundHandle | null = null;
  private chaseHandle: SoundHandle | null = null;

  /** Current smoothed volume for patrol track (0..1) */
  private _patrolVolume = 0;
  /** Current smoothed volume for chase track (0..1) */
  private _chaseVolume = 0;

  /** Current state label */
  private _state: MusicLayerState = 'idle';

  constructor(audio: AudioManager, config: MusicLayerConfig) {
    this.audio = audio;
    this.config = {
      fadeSpeed: 2.0,
      closeThreshold: 8,
      catchThreshold: 1.5,
      ...config,
    };
  }

  /** Current smoothed patrol volume (0..1) */
  get patrolVolume(): number {
    return this._patrolVolume;
  }

  /** Current smoothed chase volume (0..1) */
  get chaseVolume(): number {
    return this._chaseVolume;
  }

  /** Current state label */
  get state(): MusicLayerState {
    return this._state;
  }

  /**
   * Update the music mix. Call every frame.
   *
   * @param dt  Delta time in seconds
   * @param gap  Current gap between dog and player (world units along route)
   * @param isCaught  Whether the dog has caught the player
   * @param isComplete  Whether the level is complete
   */
  update(dt: number, gap: number, isCaught: boolean, isComplete: boolean): void {
    const { closeThreshold, catchThreshold, fadeSpeed } = this.config;

    // Determine target volumes
    let targetPatrol: number;
    let targetChase: number;

    if (isCaught || isComplete) {
      // Fade both to 0
      targetPatrol = 0;
      targetChase = 0;
    } else if (gap >= closeThreshold) {
      // Dog far — pure patrol
      targetPatrol = 1;
      targetChase = 0;
    } else if (gap <= catchThreshold) {
      // Dog very close — pure chase
      targetPatrol = 0;
      targetChase = 1;
    } else {
      // Crossfade zone — interpolate between closeThreshold and catchThreshold
      const range = closeThreshold - catchThreshold;
      const t = (closeThreshold - gap) / range; // 0 at closeThreshold, 1 at catchThreshold
      targetPatrol = 1 - t;
      targetChase = t;
    }

    // Smoothly ramp volumes towards targets
    const maxDelta = fadeSpeed * dt;
    this._patrolVolume = this._lerpTowards(this._patrolVolume, targetPatrol, maxDelta);
    this._chaseVolume = this._lerpTowards(this._chaseVolume, targetChase, maxDelta);

    // Manage track lifecycle
    this._manageTracks();

    // Update state label
    if (isCaught || isComplete) {
      this._state = 'caught';
    } else if (this._chaseVolume > 0.01) {
      this._state = 'intensity';
    } else if (this._patrolVolume > 0.01) {
      this._state = 'patrol';
    } else {
      this._state = 'idle';
    }

    // Apply volumes to playing handles
    if (this.patrolHandle) {
      this.patrolHandle.setVolume(this._patrolVolume);
    }
    if (this.chaseHandle) {
      this.chaseHandle.setVolume(this._chaseVolume);
    }
  }

  /**
   * Stop all tracks and reset.
   */
  dispose(): void {
    if (this.patrolHandle) {
      this.patrolHandle.stop();
      this.patrolHandle = null;
    }
    if (this.chaseHandle) {
      this.chaseHandle.stop();
      this.chaseHandle = null;
    }
    this._patrolVolume = 0;
    this._chaseVolume = 0;
    this._state = 'idle';
  }

  // ─── Private helpers ──────────────────────────────────

  /** Manage starting/stopping audio tracks based on volumes */
  private _manageTracks(): void {
    const patrolShouldPlay = this._patrolVolume > 0.001;
    const chaseShouldPlay = this._chaseVolume > 0.001;

    // Start patrol if needed
    if (patrolShouldPlay && !this.patrolHandle) {
      this.patrolHandle = this.audio.play(this.config.patrolKey, 'music', true);
    }
    // Stop patrol if volume is effectively zero
    if (!patrolShouldPlay && this.patrolHandle) {
      this.patrolHandle.stop();
      this.patrolHandle = null;
    }

    // Start chase if needed
    if (chaseShouldPlay && !this.chaseHandle) {
      this.chaseHandle = this.audio.play(this.config.chaseKey, 'music', true);
    }
    // Stop chase if volume is effectively zero
    if (!chaseShouldPlay && this.chaseHandle) {
      this.chaseHandle.stop();
      this.chaseHandle = null;
    }
  }

  /** Move current value towards target by at most maxDelta */
  private _lerpTowards(current: number, target: number, maxDelta: number): number {
    if (current < target) {
      return Math.min(current + maxDelta, target);
    }
    return Math.max(current - maxDelta, target);
  }
}