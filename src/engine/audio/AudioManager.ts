/**
 * AudioManager — manages all game audio: sfx and music playback,
 * volume control, and mock mode for testing without a real AudioContext.
 *
 * In mock mode (default in test / fallback in node), AudioManager
 * simulates the API without making noise — useful for headless runs and TDD.
 */

/** A handle to a playing sound returned by play() */
export interface SoundHandle {
  readonly id: string;
  stop(): void;
  setVolume(v: number): void;
  setLoop(loop: boolean): void;
}

/** A handle to a spatial (3D-positioned) sound returned by playSpatial() */
export interface SpatialSoundHandle extends SoundHandle {
  setPosition(x: number, y: number, z: number): void;
}

export type AudioClipType = 'sfx' | 'music';

export class AudioManager {
  private masterVolume = 1;
  private sfxVolume = 1;
  private musicVolume = 1;
  private muted = false;
  private mockMode = false;
  private audioContext: AudioContext | null = null;
  private files: Map<string, AudioBuffer> = new Map();
  private activeNodes: Map<string, { stop: () => void; node?: AudioScheduledSourceNode }> = new Map();
  private nextId = 0;

  /**
   * Initialise the audio system.
   * In a test / node environment where AudioContext is unavailable,
   * mock mode is automatically enabled so the API works silently.
   */
  init(): void {
    if (typeof AudioContext === 'undefined') {
      this.mockMode = true;
      return;
    }
    try {
      this.audioContext = new AudioContext();
    } catch {
      this.mockMode = true;
    }
  }

  /** Returns true if the system is using mock (silent) mode */
  get isMock(): boolean {
    return this.mockMode;
  }

  /** Get the underlying AudioContext (only in live mode) */
  get context(): AudioContext | null {
    return this.audioContext;
  }

  // ─── Volume ─────────────────────────────────────────────

  setMasterVolume(v: number): void {
    this.masterVolume = Math.max(0, Math.min(1, v));
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
  }

  getSfxVolume(): number {
    return this.sfxVolume;
  }

  setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
  }

  getMusicVolume(): number {
    return this.musicVolume;
  }

  /** Total effective volume for a given clip type */
  getEffectiveVolume(type: AudioClipType): number {
    if (this.muted) return 0;
    const typeVol = type === 'music' ? this.musicVolume : this.sfxVolume;
    return this.masterVolume * typeVol;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  mute(): void {
    this.muted = true;
  }

  unmute(): void {
    this.muted = false;
  }

  toggleMute(): void {
    this.muted = !this.muted;
  }

  // ─── Loading ────────────────────────────────────────────

  /**
   * Load an audio file from a URL and cache it for later playback.
   * In mock mode, silently succeeds without fetching.
   */
  async loadFile(key: string, url: string): Promise<void> {
    if (this.mockMode) return;

    if (!this.audioContext) {
      throw new Error('AudioManager not initialised');
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load audio: ${url} (${response.status})`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const decoded = await this.audioContext.decodeAudioData(arrayBuffer);
      this.files.set(key, decoded);
    } catch (err) {
      // In dev mode, fall back to mock — don't crash the game for a missing audio file
      console.warn(`Audio load failed for "${key}" (${url}), falling back to silent mock:`, err);
    }
  }

  hasFile(key: string): boolean {
    return this.files.has(key);
  }

  // ─── Playback ───────────────────────────────────────────

  /**
   * Play a loaded audio file.
   * In mock mode, returns a no-op handle so game code doesn't need null-checks.
   */
  play(key: string, type: AudioClipType = 'sfx', loop = false): SoundHandle {
    const id = `sound_${this.nextId++}_${key}`;
    const effectiveVol = this.getEffectiveVolume(type);

    // Mock mode: return a no-op handle
    if (this.mockMode) {
      const active = {
        stop: () => {
          this.activeNodes.delete(id);
        },
        node: undefined,
      };
      this.activeNodes.set(id, active);
      return {
        id,
        stop: () => active.stop(),
        setVolume: (_v: number) => {},
        setLoop: (_l: boolean) => {},
      };
    }

    // Live mode
    if (!this.audioContext) {
      throw new Error('AudioManager not initialised');
    }

    const buffer = this.files.get(key);
    if (!buffer) {
      // Fallback to silent handle if file not loaded
      const active = { stop: () => this.activeNodes.delete(id), node: undefined };
      this.activeNodes.set(id, active);
      return { id, stop: () => active.stop(), setVolume: () => {}, setLoop: () => {} };
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    const gain = this.audioContext.createGain();
    gain.gain.value = effectiveVol;

    source.connect(gain);
    gain.connect(this.audioContext.destination);
    source.start(0);

    const active: { stop: () => void; node?: AudioScheduledSourceNode } = {
      stop: () => {
        try { source.stop(); } catch { /* already stopped */ }
        this.activeNodes.delete(id);
      },
      node: source,
    };
    this.activeNodes.set(id, active);

    return {
      id,
      stop: () => active.stop(),
      setVolume: (v: number) => {
        gain.gain.value = v * this.getEffectiveVolume(type);
      },
      setLoop: (l: boolean) => {
        source.loop = l;
      },
    };
  }

  /**
   * Stop a specific sound by its handle id.
   */
  stop(id: string): void {
    const active = this.activeNodes.get(id);
    if (active) {
      active.stop();
    }
  }

  /** Stop all currently playing sounds */
  stopAll(): void {
    for (const [id] of this.activeNodes) {
      this.stop(id);
    }
  }

  /** Number of currently active (playing) sounds */
  get activeCount(): number {
    return this.activeNodes.size;
  }

  // ─── Spatial audio ──────────────────────────────────────

  /**
   * Play a 3D-positioned audio file with distance-based volume.
   * In mock mode, returns a no-op spatial handle that tracks position
   * so game code can call setPosition() without null-checks.
   *
   * In live mode, uses a PannerNode for Web Audio spatialisation.
   * The sound will pan/attenuate based on the listener position.
   */
  playSpatial(
    key: string,
    type: AudioClipType = 'sfx',
    loop = false,
    position?: { x: number; y: number; z: number },
  ): SpatialSoundHandle {
    const id = `spatial_${this.nextId++}_${key}`;
    const pos = position ?? { x: 0, y: 0, z: 0 };
    let _posX = pos.x;
    let _posY = pos.y;
    let _posZ = pos.z;

    // Mock mode: return a no-op spatial handle
    if (this.mockMode) {
      const active = {
        stop: () => {
          this.activeNodes.delete(id);
        },
        node: undefined,
      };
      this.activeNodes.set(id, active);
      return {
        id,
        stop: () => active.stop(),
        setVolume: () => {},
        setLoop: () => {},
        setPosition: (x: number, y: number, z: number) => {
          _posX = x;
          _posY = y;
          _posZ = z;
        },
      };
    }

    // Live mode
    if (!this.audioContext) {
      throw new Error('AudioManager not initialised');
    }

    const buffer = this.files.get(key);
    if (!buffer) {
      // Fallback to silent handle if file not loaded
      const active = { stop: () => this.activeNodes.delete(id), node: undefined };
      this.activeNodes.set(id, active);
      return {
        id,
        stop: () => active.stop(),
        setVolume: () => {},
        setLoop: () => {},
        setPosition: () => {},
      };
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    const effectiveVol = this.getEffectiveVolume(type);
    const gain = this.audioContext.createGain();
    gain.gain.value = effectiveVol;

    const panner = this.audioContext.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 5;
    panner.maxDistance = 50;
    panner.rolloffFactor = 1;
    panner.setPosition(_posX, _posY, _posZ);

    source.connect(panner);
    panner.connect(gain);
    gain.connect(this.audioContext.destination);
    source.start(0);

    const active: { stop: () => void; node?: AudioScheduledSourceNode } = {
      stop: () => {
        try { source.stop(); } catch { /* already stopped */ }
        this.activeNodes.delete(id);
      },
      node: source,
    };
    this.activeNodes.set(id, active);

    return {
      id,
      stop: () => active.stop(),
      setVolume: (v: number) => {
        gain.gain.value = v * this.getEffectiveVolume(type);
      },
      setLoop: (l: boolean) => {
        source.loop = l;
      },
      setPosition: (x: number, y: number, z: number) => {
        _posX = x;
        _posY = y;
        _posZ = z;
        panner.setPosition(x, y, z);
      },
    };
  }

  // ─── Cleanup ────────────────────────────────────────────

  dispose(): void {
    this.stopAll();
    this.files.clear();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.mockMode = false;
  }
}