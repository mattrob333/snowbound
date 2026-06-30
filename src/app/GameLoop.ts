import type { GameContext } from './GameContext';
import { FIXED_DT, MAX_PHYSICS_STEPS } from '../config/constants';

export class GameLoop {
  private accumulator = 0;
  private lastTime = 0;
  private running = false;

  start(ctx: GameContext): void {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((time) => this.tick(time, ctx));
  }

  stop(): void {
    this.running = false;
  }

  private tick(now: number, ctx: GameContext): void {
    if (!this.running) return;

    const frameDt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    this.accumulator += frameDt;

    let steps = 0;
    while (this.accumulator >= FIXED_DT && steps < MAX_PHYSICS_STEPS) {
      ctx.clock.elapsed += FIXED_DT;
      ctx.clock.delta = FIXED_DT;

      ctx.physics.step(FIXED_DT);
      ctx.input.update();
      ctx.entityManager.update(FIXED_DT, ctx);
      this.accumulator -= FIXED_DT;
      steps++;
    }

    ctx.renderer.render();
    requestAnimationFrame((time) => this.tick(time, ctx));
  }
}