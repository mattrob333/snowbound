import { describe, it, expect, beforeEach } from 'vitest';
import { AudioManager } from '../engine/audio/AudioManager';

describe('AudioManager', () => {
  let audio: AudioManager;

  beforeEach(() => {
    audio = new AudioManager();
  });

  // ─── Init ─────────────────────────────────────────────

  it('should start uninitialised', () => {
    expect(audio.activeCount).toBe(0);
  });

  it('should init in mock mode when AudioContext unavailable', () => {
    audio.init();
    expect(audio.isMock).toBe(true);
  });

  // ─── Volume ───────────────────────────────────────────

  it('should default master volume to 1', () => {
    expect(audio.getMasterVolume()).toBe(1);
  });

  it('should clamp master volume to [0, 1]', () => {
    audio.setMasterVolume(2);
    expect(audio.getMasterVolume()).toBe(1);
    audio.setMasterVolume(-1);
    expect(audio.getMasterVolume()).toBe(0);
    audio.setMasterVolume(0.5);
    expect(audio.getMasterVolume()).toBe(0.5);
  });

  it('should default sfx and music volume to 1', () => {
    expect(audio.getSfxVolume()).toBe(1);
    expect(audio.getMusicVolume()).toBe(1);
  });

  it('should calculate effective volume combining master and type volume', () => {
    audio.setMasterVolume(0.5);
    audio.setSfxVolume(0.8);
    expect(audio.getEffectiveVolume('sfx')).toBeCloseTo(0.4);

    audio.setMusicVolume(0.6);
    expect(audio.getEffectiveVolume('music')).toBeCloseTo(0.3);
  });

  it('should return 0 effective volume when muted', () => {
    audio.setMasterVolume(1);
    audio.setSfxVolume(1);
    audio.mute();
    expect(audio.getEffectiveVolume('sfx')).toBe(0);
    expect(audio.isMuted).toBe(true);
  });

  // ─── Mute ─────────────────────────────────────────────

  it('should toggle mute', () => {
    expect(audio.isMuted).toBe(false);
    audio.mute();
    expect(audio.isMuted).toBe(true);
    audio.unmute();
    expect(audio.isMuted).toBe(false);
    audio.toggleMute();
    expect(audio.isMuted).toBe(true);
    audio.toggleMute();
    expect(audio.isMuted).toBe(false);
  });

  // ─── Playback (mock mode) ─────────────────────────────

  it('should return a handle from play() in mock mode', () => {
    audio.init();
    const handle = audio.play('test_sound');
    expect(handle).toBeDefined();
    expect(handle.id).toContain('test_sound');
    expect(audio.activeCount).toBe(1);
  });

  it('should stop a sound via stop()', () => {
    audio.init();
    const handle = audio.play('test_sound');
    expect(audio.activeCount).toBe(1);
    audio.stop(handle.id);
    expect(audio.activeCount).toBe(0);
  });

  it('should stop a sound via handle.stop()', () => {
    audio.init();
    const handle = audio.play('test_sound');
    expect(audio.activeCount).toBe(1);
    handle.stop();
    expect(audio.activeCount).toBe(0);
  });

  it('should stop all sounds via stopAll()', () => {
    audio.init();
    audio.play('a');
    audio.play('b');
    audio.play('c');
    expect(audio.activeCount).toBe(3);
    audio.stopAll();
    expect(audio.activeCount).toBe(0);
  });

  it('should require init before play', () => {
    expect(() => audio.play('foo')).toThrow('not initialised');
  });

  it('should support setVolume on handle in mock mode', () => {
    audio.init();
    const handle = audio.play('foo');
    // Should not throw
    handle.setVolume(0.5);
    handle.setLoop(true);
    // Still playing
    expect(audio.activeCount).toBe(1);
  });

  // ─── File loading (mock mode) ─────────────────────────

  it('should silently succeed on loadFile in mock mode', async () => {
    audio.init();
    await audio.loadFile('test', 'http://example.com/audio.wav');
    // In mock mode, the file is not actually fetched
    expect(audio.hasFile('test')).toBe(false); // mock mode doesn't cache
  });

  // ─── Dispose ──────────────────────────────────────────

  it('should stop all sounds on dispose', () => {
    audio.init();
    audio.play('a');
    audio.play('b');
    expect(audio.activeCount).toBe(2);
    audio.dispose();
    expect(audio.activeCount).toBe(0);
    // Second dispose is safe
    audio.dispose();
  });

  it('should reset mock mode on dispose', () => {
    audio.init();
    expect(audio.isMock).toBe(true);
    audio.dispose();
    expect(audio.isMock).toBe(false);
  });
});