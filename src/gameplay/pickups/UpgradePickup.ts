import * as THREE from 'three';
import { Pickup } from './Pickup';
import type { PhysicsWorld } from '../../engine/physics/PhysicsWorld';
import type { ThreeRenderer } from '../../engine/rendering/ThreeRenderer';
import type { PlayerUpgradeService, UpgradeType } from '../player/PlayerUpgradeService';

/** Color mapping per upgrade type */
const UPGRADE_COLORS: Record<string, { color: number; emissive: number }> = {
  sprint_boost: { color: 0xff8844, emissive: 0x884400 },
  wallrun_extender: { color: 0x44ffcc, emissive: 0x008866 },
  jump_boost: { color: 0xff44aa, emissive: 0x880044 },
  slide_power: { color: 0x88ff44, emissive: 0x448800 },
};

/**
 * UpgradePickup — a permanent upgrade that persists across levels.
 * When collected, registers the upgrade with PlayerUpgradeService.
 * Visual: a glowing octahedron whose color matches the upgrade type.
 */
export class UpgradePickup extends Pickup {
  readonly upgradeType: UpgradeType;
  private upgradeService: PlayerUpgradeService;

  /**
   * Fired when the upgrade is successfully collected and registered.
   * Receives the upgrade type and display name.
   */
  onUpgradeCollected: ((type: UpgradeType, displayName: string) => void) | null = null;

  constructor(
    physics: PhysicsWorld,
    renderer: ThreeRenderer | null,
    position: import('../levels/LevelData').Vec3,
    upgradeService: PlayerUpgradeService,
    upgradeType: UpgradeType,
  ) {
    super(physics, renderer, position);
    this.upgradeService = upgradeService;
    this.upgradeType = upgradeType;

    // Distinct pickup sound for permanent upgrades
    this.soundKey = 'upgrade';

    // Type-specific visual: octahedron with glow
    const colors = UPGRADE_COLORS[upgradeType] ?? { color: 0xffffff, emissive: 0x444444 };
    const geometry = new THREE.OctahedronGeometry(0.3);
    const material = new THREE.MeshStandardMaterial({
      color: colors.color,
      emissive: colors.emissive,
      emissiveIntensity: 0.7,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(position.x, position.y, position.z);
    this.mesh.rotation.y = Math.random() * Math.PI * 2;

    if (this.renderer) {
      this.renderer.scene.add(this.mesh);
    }

    // Wire up collection to register the upgrade
    this.onCollect = () => {
      this.upgradeService.addUpgrade(this.upgradeType);
      const displayName = this.upgradeService.getDisplayName(this.upgradeType);
      this.onUpgradeCollected?.(this.upgradeType, displayName);
    };
  }

  override update(_dt: number, _ctx: import('../../app/GameContext').GameContext): void {
    // Slow float/spin animation
    if (this.mesh && !this.collected) {
      this.mesh.rotation.y += 0.015;
      this.mesh.rotation.x += 0.01;
      this.mesh.position.y += Math.sin(Date.now() * 0.003) * 0.001;
    }

    // Let the base class handle proximity detection
    super.update(_dt, _ctx);
  }

  override dispose(): void {
    this.onCollect = null;
    this.onUpgradeCollected = null;
    super.dispose();
  }
}
