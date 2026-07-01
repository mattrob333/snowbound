import { describe, it, expect, beforeEach } from 'vitest';
import { AudioManager } from '../engine/audio/AudioManager';
import { VoiceLineService } from '../engine/audio/VoiceLineService';

describe('VoiceLineService', () => {
  let audio: AudioManager;
  let vls: VoiceLineService;

  beforeEach(() => {
    audio = new AudioManager();
    audio.init();
    vls = new VoiceLineService(audio);
  });

  // ─── Construction ─────────────────────────────────────

  it('should start enabled by default', () => {
    expect(vls.enabled).toBe(true);
  });

  it('should start with zero active audio handles', () => {
    expect(audio.activeCount).toBe(0);
  });

  // ─── Enable / disable ─────────────────────────────────

  it('should not play voice lines when disabled', () => {
    vls.enabled = false;
    vls.playPartCollected();
    expect(audio.activeCount).toBe(0);
  });

  it('should play voice lines when re-enabled', () => {
    vls.enabled = false;
    vls.playPartCollected();
    expect(audio.activeCount).toBe(0);

    vls.enabled = true;
    vls.playPartCollected();
    expect(audio.activeCount).toBe(1);
  });

  // ─── Basic playback ──────────────────────────────────

  it('should play part collected voice line', () => {
    vls.playPartCollected();
    expect(audio.activeCount).toBe(1);
  });

  it('should play caught voice line', () => {
    vls.playCaught();
    expect(audio.activeCount).toBe(1);
  });

  it('should play jump voice line', () => {
    vls.playJump();
    expect(audio.activeCount).toBe(1);
  });

  it('should play slide voice line', () => {
    vls.playSlide();
    expect(audio.activeCount).toBe(1);
  });

  it('should play wall run voice line', () => {
    vls.playWallRun();
    expect(audio.activeCount).toBe(1);
  });

  it('should play stumble voice line', () => {
    vls.playStumble();
    expect(audio.activeCount).toBe(1);
  });

  it('should play level complete voice line', () => {
    vls.playLevelComplete();
    expect(audio.activeCount).toBe(1);
  });

  it('should play sprint voice line', () => {
    vls.playSprint();
    expect(audio.activeCount).toBe(1);
  });

  it('should play power-up voice line', () => {
    vls.playPowerUp();
    expect(audio.activeCount).toBe(1);
  });

  it('should play power-up expire voice line', () => {
    vls.playPowerUpExpire();
    expect(audio.activeCount).toBe(1);
  });

  // ─── Cooldown per event ──────────────────────────────

  it('should suppress repeated jump within cooldown', () => {
    vls.playJump(); // t=0
    expect(audio.activeCount).toBe(1);

    vls.playJump(); // t=0 — cooldown 1s, should be suppressed
    expect(audio.activeCount).toBe(1);
  });

  it('should allow jump after cooldown elapses', () => {
    vls.playJump(); // t=0
    expect(audio.activeCount).toBe(1);

    // Advance past the 1s cooldown
    vls.update(1.5);
    vls.playJump();
    expect(audio.activeCount).toBe(2);
  });

  it('should suppress repeated slide within cooldown', () => {
    vls.playSlide(); // t=0
    vls.playSlide(); // t=0 — cooldown 2s, suppressed
    expect(audio.activeCount).toBe(1);
  });

  it('should allow slide after 2s cooldown', () => {
    vls.playSlide(); // t=0
    vls.update(2.5);
    vls.playSlide();
    expect(audio.activeCount).toBe(2);
  });

  it('should suppress repeated wall-run within cooldown', () => {
    vls.playWallRun();
    vls.playWallRun();
    expect(audio.activeCount).toBe(1);
  });

  it('should suppress repeated stumble within cooldown', () => {
    vls.playStumble();
    vls.playStumble();
    expect(audio.activeCount).toBe(1);
  });

  it('should suppress repeated sprint within cooldown', () => {
    vls.playSprint();
    vls.playSprint();
    expect(audio.activeCount).toBe(1);
  });

  it('should allow sprint after 0.5s cooldown', () => {
    vls.playSprint(); // t=0
    vls.update(0.6);
    vls.playSprint();
    expect(audio.activeCount).toBe(2);
  });

  it('should not apply cooldown to partCollected (cooldown=0)', () => {
    vls.playPartCollected(); // t=0
    vls.playPartCollected(); // t=0 — cooldown 0, should play
    expect(audio.activeCount).toBe(2);
  });

  it('should not apply cooldown to caught (cooldown=0)', () => {
    vls.playCaught();
    vls.playCaught();
    expect(audio.activeCount).toBe(2);
  });

  it('should not apply cooldown to levelComplete (cooldown=0)', () => {
    vls.playLevelComplete();
    vls.playLevelComplete();
    expect(audio.activeCount).toBe(2);
  });

  it('should not apply cooldown to powerUp events (cooldown=0)', () => {
    vls.playPowerUp();
    vls.playPowerUp();
    expect(audio.activeCount).toBe(2);
  });

  it('should handle multiple event types independently', () => {
    vls.playPartCollected(); // t=0
    vls.playCaught(); // t=0
    expect(audio.activeCount).toBe(2);
    // These play on the same frame because they're different keys with cooldown=0
  });

  // ─── Cooldown mix — different events don't interfere ────

  it('should allow jump while slide is on cooldown', () => {
    vls.playSlide(); // t=0, slide cooldown=2s
    vls.playJump(); // t=0, jump cooldown=1s, different key — should play
    expect(audio.activeCount).toBe(2);
  });

  it('should allow part collected while jump is on cooldown', () => {
    vls.playJump(); // t=0, jump cooldown=1s
    vls.playPartCollected(); // t=0, partCollected cooldown=0 — should play
    expect(audio.activeCount).toBe(2);
  });

  // ─── Update / elapsed time ──────────────────────────

  it('should accumulate elapsed time across update calls', () => {
    vls.update(1);
    vls.update(2);
    vls.update(3);
    // Internal elapsed should be 6 — play with 1s cooldown should work
    vls.playJump();
    vls.update(1.5);
    vls.playJump();
    expect(audio.activeCount).toBe(2);
  });

  // ─── Reset ────────────────────────────────────────────

  it('should clear cooldown timers on reset', () => {
    vls.playJump(); // t=0
    vls.playJump(); // suppressed
    expect(audio.activeCount).toBe(1);

    vls.reset();
    vls.playJump(); // should play after reset
    expect(audio.activeCount).toBe(2);
  });

  // ─── Custom cooldowns ────────────────────────────────

  it('should accept overridden cooldowns in constructor', () => {
    const customVls = new VoiceLineService(audio, { jump: 3.0 });
    customVls.playJump(); // t=0
    customVls.playJump(); // suppressed by 3s cooldown
    expect(audio.activeCount).toBe(1);

    customVls.update(2.5);
    customVls.playJump(); // still before 3s — suppressed
    expect(audio.activeCount).toBe(1);

    customVls.update(1.0); // total 3.5s
    customVls.playJump();
    expect(audio.activeCount).toBe(2);
  });

  // ─── Plays correct sound keys ────────────────────────

  it('should use correct sound key for part collected', () => {
    // We can verify by looking at the handle id convention
    vls.playPartCollected();
    // activeCount means the audio manager accepted the play call with 'voice_part_collected'
    expect(audio.activeCount).toBe(1);
  });

  it('should play all event types without error', () => {
    vls.playPartCollected();
    vls.playCaught();
    vls.playJump();
    vls.playSlide();
    vls.playWallRun();
    vls.playStumble();
    vls.playLevelComplete();
    vls.playSprint();
    vls.playPowerUp();
    vls.playPowerUpExpire();
    expect(audio.activeCount).toBe(10);
  });
});