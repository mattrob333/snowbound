import { describe, it, expect, beforeEach } from 'vitest';
import { MusicLayerManager } from '../engine/audio/MusicLayerManager';
import { AudioManager } from '../engine/audio/AudioManager';

describe('MusicLayerManager', () => {
  let audio: AudioManager;

  beforeEach(() => {
    audio = new AudioManager();
    audio.init();
  });

  // ─── Construction ─────────────────────────────────────

  it('should start in idle state with no active audio handles', () => {
    const mlm = new MusicLayerManager(audio, { patrolKey: 'patrol_ambient', chaseKey: 'chase_intensity' });
    expect(mlm.state).toBe('idle');
    expect(audio.activeCount).toBe(0);
  });

  it('should expose patrol and chase volume getters starting at 0', () => {
    const mlm = new MusicLayerManager(audio, { patrolKey: 'patrol', chaseKey: 'chase' });
    expect(mlm.patrolVolume).toBe(0);
    expect(mlm.chaseVolume).toBe(0);
  });

  // ─── Patrol only (dog far away) ─────────────────────────

  it('should start patrol track when dog gap > close threshold', () => {
    const mlm = new MusicLayerManager(audio, { patrolKey: 'patrol', chaseKey: 'chase' });
    // gap=50 > closeThreshold=8 — dog far away, pure patrol
    mlm.update(1 / 60, 50, false, false);
    expect(mlm.state).toBe('patrol');
    expect(audio.activeCount).toBe(1);
    // Patrol volume should ramp up towards 1
    expect(mlm.patrolVolume).toBeGreaterThan(0);
    expect(mlm.chaseVolume).toBe(0);
  });

  it('should ramp patrol volume towards 1 over successive frames', () => {
    const mlm = new MusicLayerManager(audio, { patrolKey: 'patrol', chaseKey: 'chase', fadeSpeed: 1.0 });
    // Ramp for 1 second (60 frames at 1/60)
    for (let i = 0; i < 60; i++) {
      mlm.update(1 / 60, 50, false, false);
    }
    expect(mlm.patrolVolume).toBeCloseTo(1.0, 1);
    expect(audio.activeCount).toBe(1);
  });

  it('should not start chase track when dog far away', () => {
    const mlm = new MusicLayerManager(audio, { patrolKey: 'patrol', chaseKey: 'chase' });
    for (let i = 0; i < 30; i++) {
      mlm.update(1 / 60, 50, false, false);
    }
    // Only patrol track should be playing
    expect(audio.activeCount).toBe(1);
    expect(mlm.chaseVolume).toBe(0);
  });

  // ─── Chase intensity (dog close) ────────────────────────

  it('should crossfade to chase when gap closes below threshold', () => {
    const mlm = new MusicLayerManager(audio, { patrolKey: 'patrol', chaseKey: 'chase', fadeSpeed: 2.0 });
    // First, ramp up patrol volume
    for (let i = 0; i < 60; i++) {
      mlm.update(1 / 60, 100, false, false);
    }
    expect(mlm.patrolVolume).toBeCloseTo(1.0, 1);
    expect(audio.activeCount).toBe(1); // only patrol

    // Now dog gets close — gap=3 which is between catchThreshold(1.5) and closeThreshold(8)
    // This should start chase track and crossfade
    for (let i = 0; i < 10; i++) {
      mlm.update(1 / 60, 3, false, false);
    }
    // Both tracks should be playing
    expect(audio.activeCount).toBe(2);
    expect(mlm.patrolVolume).toBeLessThan(1.0);
    expect(mlm.chaseVolume).toBeGreaterThan(0);
  });

  it('should reach full chase volume at catch threshold', () => {
    const mlm = new MusicLayerManager(audio, { patrolKey: 'patrol', chaseKey: 'chase', fadeSpeed: 5.0 });
    // Ramp patrol up first
    for (let i = 0; i < 30; i++) {
      mlm.update(1 / 60, 100, false, false);
    }

    // Gap at catch threshold (1.5) — should aim for full chase
    for (let i = 0; i < 60; i++) {
      mlm.update(1 / 60, 1.5, false, false);
    }
    expect(mlm.chaseVolume).toBeCloseTo(1.0, 1);
    expect(mlm.patrolVolume).toBeCloseTo(0, 1);
    expect(mlm.state).toBe('intensity');
  });

  it('should transition state from patrol to intensity', () => {
    const mlm = new MusicLayerManager(audio, { patrolKey: 'patrol', chaseKey: 'chase', fadeSpeed: 5.0 });
    // Patrol for a bit
    for (let i = 0; i < 30; i++) {
      mlm.update(1 / 60, 50, false, false);
    }
    expect(mlm.state).toBe('patrol');

    // Close gap
    for (let i = 0; i < 30; i++) {
      mlm.update(1 / 60, 2, false, false);
    }
    expect(mlm.state).toBe('intensity');
  });

  it('should return to patrol when dog moves far away again', () => {
    const mlm = new MusicLayerManager(audio, { patrolKey: 'patrol', chaseKey: 'chase', fadeSpeed: 5.0 });
    // Patrol
    for (let i = 0; i < 30; i++) {
      mlm.update(1 / 60, 50, false, false);
    }
    expect(mlm.state).toBe('patrol');

    // Chase phase — dog close
    for (let i = 0; i < 30; i++) {
      mlm.update(1 / 60, 2, false, false);
    }
    expect(mlm.state).toBe('intensity');

    // Dog moves far away again
    for (let i = 0; i < 60; i++) {
      mlm.update(1 / 60, 30, false, false);
    }
    expect(mlm.state).toBe('patrol');
    expect(mlm.patrolVolume).toBeCloseTo(1.0, 1);
    expect(mlm.chaseVolume).toBeCloseTo(0, 1);
    // Only patrol track should be playing
    expect(audio.activeCount).toBe(1);
  });

  // ─── Caught / complete ──────────────────────────────────

  it('should fade both tracks to 0 when player is caught', () => {
    const mlm = new MusicLayerManager(audio, { patrolKey: 'patrol', chaseKey: 'chase', fadeSpeed: 5.0 });
    // Ramp patrol up
    for (let i = 0; i < 30; i++) {
      mlm.update(1 / 60, 50, false, false);
    }
    expect(audio.activeCount).toBe(1);

    // Caught
    for (let i = 0; i < 30; i++) {
      mlm.update(1 / 60, 1, true, false);
    }
    expect(mlm.patrolVolume).toBeCloseTo(0, 1);
    expect(mlm.chaseVolume).toBeCloseTo(0, 1);
    expect(mlm.state).toBe('caught');
  });

  it('should fade both tracks to 0 when level is complete', () => {
    const mlm = new MusicLayerManager(audio, { patrolKey: 'patrol', chaseKey: 'chase', fadeSpeed: 5.0 });
    for (let i = 0; i < 30; i++) {
      mlm.update(1 / 60, 50, false, false);
    }
    expect(audio.activeCount).toBe(1);

    // Complete
    for (let i = 0; i < 30; i++) {
      mlm.update(1 / 60, 0, false, true);
    }
    expect(mlm.patrolVolume).toBeCloseTo(0, 1);
    expect(mlm.chaseVolume).toBeCloseTo(0, 1);
    expect(mlm.state).toBe('caught');
  });

  // ─── Crossfade ratio calc ──────────────────────────────

  it('should compute crossfade ratio based on gap between close and catch thresholds', () => {
    const mlm = new MusicLayerManager(audio, { patrolKey: 'patrol', chaseKey: 'chase', fadeSpeed: 100 });
    // Set config manually for precise test
    // gap=8 (closeThreshold) → targetCha=0, targetPat=1
    mlm.update(1, 8, false, false);
    // Instantaneous with high fade speed
    // After 1 second at fadeSpeed=100, it should reach target
    expect(mlm.patrolVolume).toBeCloseTo(1.0, 1);
    expect(mlm.chaseVolume).toBeCloseTo(0, 1);

    // gap=4.75 (halfway between 1.5 and 8) → targetCha≈0.5, targetPat≈0.5
    mlm.update(1, 4.75, false, false);
    expect(mlm.patrolVolume).toBeCloseTo(0.5, 1);
    expect(mlm.chaseVolume).toBeCloseTo(0.5, 1);

    // gap=1.5 (catchThreshold) → targetCha=1, targetPat=0
    mlm.update(1, 1.5, false, false);
    expect(mlm.chaseVolume).toBeCloseTo(1.0, 1);
    expect(mlm.patrolVolume).toBeCloseTo(0, 1);
  });

  // ─── Dispose ──────────────────────────────────────────

  it('should stop all active tracks on dispose', () => {
    const mlm = new MusicLayerManager(audio, { patrolKey: 'patrol', chaseKey: 'chase' });
    for (let i = 0; i < 30; i++) {
      mlm.update(1 / 60, 50, false, false);
    }
    expect(audio.activeCount).toBe(1);
    mlm.dispose();
    expect(audio.activeCount).toBe(0);
    expect(mlm.state).toBe('idle');
  });

  // ─── Integration: crossfade without pre-ramping patrol ──

  it('should start both tracks simultaneously during crossfade from idle', () => {
    const mlm = new MusicLayerManager(audio, { patrolKey: 'patrol', chaseKey: 'chase', fadeSpeed: 4.0 });
    // Directly start with a close gap — should start patrol (base) and chase (intensity) together
    mlm.update(1 / 60, 3, false, false);
    // After 30 frames at 4fadeSpeed, volumes should be partway
    for (let i = 0; i < 30; i++) {
      mlm.update(1 / 60, 3, false, false);
    }
    expect(audio.activeCount).toBe(2);
    expect(mlm.patrolVolume).toBeGreaterThan(0);
    expect(mlm.chaseVolume).toBeGreaterThan(0);
  });
});
