import * as THREE from "three/webgpu";
import { Experience } from "./Experience";
import gsap from "gsap";

export class Raycaster {
  constructor() {
    this.experience = Experience.getInstance();
    this.mouse = this.experience.mouse;
    this.camera = this.experience.camera.instance;
    this.canvas = this.experience.canvasElement;

    this.raycaster = new THREE.Raycaster();
    this.hoveredObject = null;

    this.intersectObjectsA = [];
    this.intersectObjectsB = [];
    this.meshesA = [];
    this.meshesB = [];

    this.isModalOpen = false;
    this.activeModalObjects = [];

    this.init();
  }

  populateIntersectObjects(scene, objects) {
    const targetList =
      scene === "A" ? this.intersectObjectsA : this.intersectObjectsB;

    objects.forEach((object) => {
      const newObject = {
        ...object,
        scene,
        originalScale: object.mesh.scale.clone(),
      };
      targetList.push(newObject);
    });

    this.meshesA = this.intersectObjectsA.map((o) => o.mesh);
    this.meshesB = this.intersectObjectsB.map((o) => o.mesh);

    if (this.intersectObjectsA.length && this.intersectObjectsB.length) {
      this.initAllModalCloseButtons();
    }
  }

  getElement(object) {
    if (!object.elementId) return null;
    return document.getElementById(object.elementId);
  }

  getPairedObject(object) {
    if (!object.pairKey) return null;
    const otherList =
      object.scene === "A" ? this.intersectObjectsB : this.intersectObjectsA;
    return otherList.find((o) => o.pairKey === object.pairKey) || null;
  }

  initAllModalCloseButtons() {
    const all = [...this.intersectObjectsA, ...this.intersectObjectsB];
    all.forEach((object) => {
      const element = this.getElement(object);
      const closeButton = element?.querySelector(".modal__close-button");

      if (!element) return;
      if (!closeButton) return;
      if (closeButton._bound) return;
      closeButton._bound = true;

      closeButton.addEventListener("click", (e) => {
        e.stopPropagation();
        this.closeAllActiveModals();
      });
    });
  }

  closeAllActiveModals() {
    this.activeModalObjects.forEach((object) => this.closeModal(object));
    this.activeModalObjects = [];
  }

  closeModal(object) {
    const element = this.getElement(object);
    if (!element) return;
    gsap.to(element, {
      opacity: 0,
      duration: 0.2,
      onComplete: () => {
        element.classList.remove("modal-open");
        this.isModalOpen = false;
      },
    });
  }

  openModal(object) {
    const element = this.getElement(object);
    if (!element) return;
    this.activeModalObjects.push(object);
    gsap.to(element, {
      opacity: 1,
      onStart: () => {
        this.isModalOpen = true;
        element.classList.add("modal-open");
      },
    });
  }

  canScaleObject(object) {
    if (object.type === "music" && this.experience.world.music?.isPlaying) {
      return false;
    }
    return true;
  }

  scaleUp(object) {
    const multiplier = object.scaleMultiplier || 1.2;
    gsap.to(object.mesh.scale, {
      x: object.originalScale.x * multiplier,
      y: object.originalScale.y * multiplier,
      z: object.originalScale.z * multiplier,
      duration: 0.5,
      ease: "back.out(2)",
    });
  }

  scaleDown(object) {
    gsap.to(object.mesh.scale, {
      x: object.originalScale.x,
      y: object.originalScale.y,
      z: object.originalScale.z,
      duration: 0.5,
      ease: "back.out(2)",
    });
  }

  scaleUpGroup(object) {
    if (!this.canScaleObject(object)) return;
    this.scaleUp(object);
    const paired = this.getPairedObject(object);
    if (paired) this.scaleUp(paired);
    const siblings = this.getSiblingObjects(object);
    siblings.forEach((s) => this.scaleUp(s));
  }

  scaleDownGroup(object) {
    if (!this.canScaleObject(object)) return;
    this.scaleDown(object);
    const paired = this.getPairedObject(object);
    if (paired) this.scaleDown(paired);
    const siblings = this.getSiblingObjects(object);
    siblings.forEach((s) => this.scaleDown(s));
  }

  getIntersectResult() {
    const intersectsA = this.raycaster.intersectObjects(this.meshesA);
    const intersectsB = this.raycaster.intersectObjects(this.meshesB);

    const hitA = intersectsA.length
      ? this.getParentObject(intersectsA[0].object, this.intersectObjectsA)
      : null;
    const hitB = intersectsB.length
      ? this.getParentObject(intersectsB[0].object, this.intersectObjectsB)
      : null;

    return hitA || hitB;
  }

  getParentObject(intersectedObject, list) {
    let object = intersectedObject;
    while (object) {
      const parent = list.find((o) => o.mesh === object);
      if (parent) return parent;
      object = object.parent;
    }
  }

  getSiblingObjects(object) {
    if (!object.pairKey || object.pairKey === "none") return [];
    const sameList =
      object.scene === "A" ? this.intersectObjectsA : this.intersectObjectsB;
    return sameList.filter((o) => o.pairKey === object.pairKey && o !== object);
  }

  isClickInsideModal(e) {
    return this.activeModalObjects.some((object) => {
      const element = this.getElement(object);
      return element && element.contains(e.target);
    });
  }

  init() {
    const handleClickAndTouch = (e) => {
      if (this.isModalOpen) return;

      this.raycaster.setFromCamera(this.mouse.instance, this.camera);
      const parentObject = this.getIntersectResult();
      if (!parentObject) return;

      const paired = this.getPairedObject(parentObject);

      switch (parentObject.type) {
        case "url":
          window.open(parentObject.url, "_blank", "noopener,noreferrer");
          break;
        case "scale":
          break;
        case "modal":
          this.openModal(parentObject);
          if (paired) this.openModal(paired);
          break;
        case "music":
          this.experience.world.music.toggle();
          break;
      }
    };

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isModalOpen) {
        this.closeAllActiveModals();
      }
    });

    // window.addEventListener("click", (e) => {
    //   if (!this.isModalOpen) return;
    //   if (this.isClickInsideModal(e)) return;
    //   this.closeAllActiveModals();
    // });

    this.canvas.addEventListener("click", handleClickAndTouch);
    this.canvas.addEventListener("touchend", handleClickAndTouch);
  }

  update() {
    if (this.isModalOpen) {
      if (this.hoveredObject) {
        document.body.style.cursor = "default";
        this.scaleDownGroup(this.hoveredObject);
        this.hoveredObject = null;
      }
      return;
    }

    this.raycaster.setFromCamera(this.mouse.instance, this.camera);
    const parentObject = this.getIntersectResult();

    if (parentObject) {
      if (parentObject !== this.hoveredObject) {
        if (this.hoveredObject) {
          this.scaleDownGroup(this.hoveredObject);

          if (this.hoveredObject.type === "animation") {
            this.experience.world.chadcafe?.stopAnimation();
          }
        }

        document.body.style.cursor = "pointer";
        this.hoveredObject = parentObject;

        this.scaleUpGroup(parentObject);

        if (parentObject.type === "animation") {
          this.experience.world.chadcafe?.playAnimation();
        }
      }
    } else {
      if (this.hoveredObject) {
        document.body.style.cursor = "default";
        this.scaleDownGroup(this.hoveredObject);

        if (this.hoveredObject.type === "animation") {
          this.experience.world.chadcafe?.stopAnimation();
        }

        this.hoveredObject = null;
      }
    }
  }
}
