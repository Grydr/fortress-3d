import * as THREE from 'three';

export class InputManager {
  constructor(domElement) {
    this.domElement = domElement || document.body;

    // Movement state
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      jump: false,
      interact: false,
    };

    // Mouse look state
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.mouseSensitivity = 0.0022;
    this.isPointerLocked = false;

    // Weapon trigger state
    this.isShooting = false;
    this.isAiming = false;
    this.weaponSlot = 2; // Default: Pistol (slot 2)

    // Raycaster screen center
    this.crosshairRay = new THREE.Vector2(0, 0);

    // Callbacks
    this.onInteract = null;
    this.onShoot = null;
    this.onWeaponSwitch = null;
    this.onTogglePause = null;
    this.onToggleHelp = null;
    this.onPointerLockLost = null;
    this.lockLostAt = -Infinity;

    // Touch fallback state
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.isTouching = false;

    this.bindEvents();
  }

  bindEvents() {
    // Keyboard listeners
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));

    // Pointer Lock listeners
    document.addEventListener('pointerlockchange', () => {
      const wasLocked = this.isPointerLocked;
      this.isPointerLocked = document.pointerLockElement === this.domElement;
      if (wasLocked && !this.isPointerLocked) {
        this.lockLostAt = performance.now();
        if (this.onPointerLockLost) this.onPointerLockLost();
      }
    });

    this.domElement.addEventListener('click', () => {
      if (!this.isPointerLocked) {
        this.requestPointerLock();
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.mouseDeltaX += e.movementX;
        this.mouseDeltaY += e.movementY;
      }
    });

    window.addEventListener('mousedown', (e) => {
      // Don't fire weapons when clicking UI modals or buttons
      if (e.target.closest('.game-modal:not(.hidden)') || e.target.closest('#wolf-dashboard') || e.target.closest('#top-hud')) {
        return;
      }
      if (e.button === 0) {
        this.isShooting = true;
        if (this.onShoot) this.onShoot();
      } else if (e.button === 2) {
        this.isAiming = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isShooting = false;
      } else if (e.button === 2) {
        this.isAiming = false;
      }
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    // Mouse wheel for switching weapons
    window.addEventListener('wheel', (e) => {
      if (e.deltaY < 0) {
        this.cycleWeapon(-1);
      } else if (e.deltaY > 0) {
        this.cycleWeapon(1);
      }
    });

    // Touch fallback for mobile / touchscreens
    this.domElement.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        this.isTouching = true;
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    this.domElement.addEventListener('touchmove', (e) => {
      if (!this.isTouching || e.touches.length === 0) return;
      const dx = e.touches[0].clientX - this.touchStartX;
      const dy = e.touches[0].clientY - this.touchStartY;
      this.mouseDeltaX += dx * 0.4;
      this.mouseDeltaY += dy * 0.4;
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
    }, { passive: true });

    this.domElement.addEventListener('touchend', () => {
      this.isTouching = false;
    });
  }

  requestPointerLock() {
    this.domElement.requestPointerLock?.();
  }

  exitPointerLock() {
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  handleKeyDown(e) {
    if (e.key === '1') { this.selectWeapon(1); return; }
    if (e.key === '2') { this.selectWeapon(2); return; }
    if (e.key === '3') { this.selectWeapon(3); return; }

    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = true;
        break;
      case 'Space':
        this.keys.jump = true;
        if (this.onInteract) this.onInteract();
        break;
      case 'KeyE':
        this.keys.interact = true;
        if (this.onInteract) this.onInteract();
        break;
      case 'Digit1':
      case 'Numpad1':
        this.selectWeapon(1); // Knife
        break;
      case 'Digit2':
      case 'Numpad2':
        this.selectWeapon(2); // Luger Pistol
        break;
      case 'Digit3':
      case 'Numpad3':
        this.selectWeapon(3); // MP40 Machine Gun
        break;
      case 'Escape':
        // Ignore the Escape that just released pointer lock, or it would unpause immediately
        if (performance.now() - this.lockLostAt < 250) break;
        if (this.onTogglePause) this.onTogglePause();
        break;
      case 'KeyH':
        if (this.onToggleHelp) this.onToggleHelp();
        break;
    }
  }

  handleKeyUp(e) {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.sprint = false;
        break;
      case 'Space':
        this.keys.jump = false;
        break;
      case 'KeyE':
        this.keys.interact = false;
        break;
    }
  }

  selectWeapon(slot) {
    this.weaponSlot = slot;
    if (this.onWeaponSwitch) this.onWeaponSwitch(slot);
  }

  cycleWeapon(dir) {
    let next = this.weaponSlot + dir;
    if (next < 1) next = 3;
    if (next > 3) next = 1;
    this.selectWeapon(next);
  }

  getAndResetMouseDelta() {
    const delta = {
      x: this.mouseDeltaX * this.mouseSensitivity,
      y: this.mouseDeltaY * this.mouseSensitivity,
    };
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    return delta;
  }
}
