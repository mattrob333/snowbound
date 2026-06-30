import { CharacterKCC } from '../../engine/physics/CharacterKCC';
import { PLAYER_TUNING } from '../../config/tuning';

export class SlideController {
  private _isSliding = false;
  private timer = 0;
  private slideVelocity = 0;

  isSliding(): boolean {
    return this._isSliding;
  }

  start(kcc: CharacterKCC): void {
    if (!kcc.isGrounded()) return;
    this._isSliding = true;
    this.timer = 0;
    this.slideVelocity = PLAYER_TUNING.slideSpeed;
  }

  update(dt: number, kcc: CharacterKCC, hasMoveInput: boolean): void {
    if (!this._isSliding) return;

    this.timer += dt;

    // Exit slide conditions
    if (this.timer > PLAYER_TUNING.slideDuration || !kcc.isGrounded()) {
      this._isSliding = false;
      this.timer = 0;
      return;
    }

    // Maintain slide velocity even without input
    if (!hasMoveInput) {
      // Decay slide speed
      this.slideVelocity = Math.max(0, this.slideVelocity - dt * 2);
    }
  }

  getSlideVelocity(): number {
    return this._isSliding ? this.slideVelocity : 0;
  }

  stop(): void {
    this._isSliding = false;
    this.timer = 0;
  }
}