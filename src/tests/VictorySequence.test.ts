import { describe, it, expect } from 'vitest';
import { VictorySequence, VictoryStage } from '../gameplay/narrative/VictorySequence';

describe('VictorySequence', () => {
  it('should start inactive', () => {
    const seq = new VictorySequence();
    expect(seq.isActive).toBe(false);
    expect(seq.isComplete).toBe(false);
    expect(seq.stage).toBe(VictoryStage.Idle);
    expect(seq.progress).toBe(0);
  });

  it('should enter fade-in stage on start', () => {
    const seq = new VictorySequence();
    seq.start();
    expect(seq.isActive).toBe(true);
    expect(seq.stage).toBe(VictoryStage.FadeIn);
    expect(seq.isComplete).toBe(false);
  });

  it('should progress through stages over time', () => {
    const seq = new VictorySequence();
    seq.start();

    // Stage durations: FadeIn=1, Reveal=2, Cure=2, Escape=2, Victory=3, Done=0
    // Total = 10s

    // At 0.5s: still FadeIn
    seq.update(0.5);
    expect(seq.stage).toBe(VictoryStage.FadeIn);

    // At 1.5s: Reveal
    seq.update(1.0);
    expect(seq.stage).toBe(VictoryStage.Reveal);

    // At 3.5s: Cure
    seq.update(2.0);
    expect(seq.stage).toBe(VictoryStage.Cure);

    // At 5.5s: Escape
    seq.update(2.0);
    expect(seq.stage).toBe(VictoryStage.Escape);

    // At 7.5s: Victory
    seq.update(2.0);
    expect(seq.stage).toBe(VictoryStage.Victory);

    // At 10.5s: Done
    seq.update(3.0);
    expect(seq.stage).toBe(VictoryStage.Done);
    expect(seq.isActive).toBe(false);
    expect(seq.isComplete).toBe(true);
  });

  it('should report progress as 0-1 linear over total duration', () => {
    const seq = new VictorySequence();
    seq.start();

    // At start
    expect(seq.progress).toBeCloseTo(0, 1);

    // Halfway at 5s (total 10s)
    seq.update(5.0);
    expect(seq.progress).toBeCloseTo(0.5, 1);

    // All done
    seq.update(5.0);
    expect(seq.progress).toBeCloseTo(1.0, 1);
  });

  it('should clamp progress to 1', () => {
    const seq = new VictorySequence();
    seq.start();
    seq.update(20);
    expect(seq.progress).toBe(1);
    expect(seq.isComplete).toBe(true);
  });

  it('should fire onComplete callback when sequence finishes', () => {
    let fired = false;
    const seq = new VictorySequence({ onComplete: () => { fired = true; } });
    seq.start();
    seq.update(12);
    expect(fired).toBe(true);
  });

  it('should not fire onComplete before sequence finishes', () => {
    let fired = false;
    const seq = new VictorySequence({ onComplete: () => { fired = true; } });
    seq.start();
    seq.update(5);
    expect(fired).toBe(false);
  });

  it('should fire onStageChange callback on stage transitions', () => {
    const stages: VictoryStage[] = [];
    const seq = new VictorySequence({
      onStageChange: (stage) => { stages.push(stage); },
    });
    seq.start(); // triggers FadeIn
    seq.update(1.5); // → Reveal
    seq.update(2.0); // → Cure
    expect(stages).toEqual([
      VictoryStage.FadeIn,
      VictoryStage.Reveal,
      VictoryStage.Cure,
    ]);
  });

  it('should accept custom stage durations', () => {
    const seq = new VictorySequence({
      stageDurations: {
        [VictoryStage.FadeIn]: 0.1,
        [VictoryStage.Reveal]: 0.1,
        [VictoryStage.Cure]: 0.1,
        [VictoryStage.Escape]: 0.1,
        [VictoryStage.Victory]: 0.1,
        [VictoryStage.Done]: 0,
      },
    });
    seq.start();
    seq.update(0.5);
    expect(seq.isComplete).toBe(true);
    expect(seq.stage).toBe(VictoryStage.Done);
  });

  it('should reset when start is called again', () => {
    const seq = new VictorySequence();
    seq.start();
    seq.update(12);
    expect(seq.isComplete).toBe(true);

    seq.start();
    expect(seq.isActive).toBe(true);
    expect(seq.isComplete).toBe(false);
    expect(seq.stage).toBe(VictoryStage.FadeIn);
    expect(seq.progress).toBeCloseTo(0, 1);
  });

  it('should skip ahead to a specific stage', () => {
    const seq = new VictorySequence();
    seq.start();
    seq.skipTo(VictoryStage.Victory);
    expect(seq.stage).toBe(VictoryStage.Victory);
    expect(seq.progress).toBeGreaterThan(0);
  });

  it('should complete immediately with skipTo(Done)', () => {
    let fired = false;
    const seq = new VictorySequence({ onComplete: () => { fired = true; } });
    seq.start();
    seq.skipTo(VictoryStage.Done);
    expect(seq.isComplete).toBe(true);
    expect(seq.isActive).toBe(false);
    expect(fired).toBe(true);
  });

  it('should provide a textual description for each stage', () => {
    const seq = new VictorySequence();
    seq.start();

    expect(seq.stageText).toBeTypeOf('string');
    expect(seq.stageText.length).toBeGreaterThan(0);

    seq.update(1.5); // → Reveal
    expect(seq.stageText).toBeTypeOf('string');
  });

  it('should be safe to update after completion', () => {
    const seq = new VictorySequence();
    seq.start();
    seq.update(12);
    expect(seq.isComplete).toBe(true);

    // Additional updates should not throw or change state
    seq.update(1.0);
    expect(seq.isComplete).toBe(true);
    expect(seq.stage).toBe(VictoryStage.Done);

    seq.update(5.0);
    expect(seq.progress).toBe(1);
  });
});