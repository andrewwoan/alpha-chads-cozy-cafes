import * as THREE from "three/webgpu";
import GUI from "lil-gui";
import { Experience } from "../Experience";

import gsap from "gsap";

export class CapybaraCafe {
  constructor() {
    this.experience = Experience.getInstance();
    this.capybaracafe = this.experience.resources.items.capybaracafe.scene;
    this.trails = [];

    this.init();
  }

  init() {
    this.initCafe();
    this.initBgOrb();
    this.initEnvironment();
    this.initAnimations();
    // this.initDebug();
  }

  initCafe() {
    const intersectObjects = {};
    this.capybaracafe.traverse((child) => {
      if (
        child.name.includes("Raycaster") &&
        (child.type === "Group" || child.type === "Object3D")
      ) {
        intersectObjects[child.name] = child;
      }

      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.name.includes("Trail")) {
          child.scale.set(0, 0, 0);
          this.trails.push(child);
        }
      }
    });
    this.experience.sceneB.add(this.capybaracafe);

    this.experience.raycaster.populateIntersectObjects("B", [
      {
        mesh: intersectObjects["Raycaster_Capybara"],
        type: "scale",
        pairKey: "beast-mode",
      },
      {
        mesh: intersectObjects["Raycaster_Cozy_Project_1002"],
        type: "modal",
        elementId: "project-one-capybara",
        pairKey: "project-one",
      },
      {
        mesh: intersectObjects["Raycaster_Cozy_Project_2002"],
        type: "modal",
        elementId: "project-two-capybara",
        pairKey: "project-two",
      },
      {
        mesh: intersectObjects["Raycaster_Instagram_Contact001"],
        type: "url",
        url: "https://www.instagram.com/andrewwoan/",
        pairKey: "instagram",
      },
      {
        mesh: intersectObjects["Raycaster_Twitter_Contact001"],
        type: "url",
        url: "https://x.com/andrewwoan",
        pairKey: "twitter",
      },
      {
        mesh: intersectObjects["Raycaster_YouTube_Contact001"],
        type: "url",
        url: "https://youtube.com/@andrewwoan",
        pairKey: "youtube",
      },
    ]);
  }

  setNightMode(isNight) {
    return;
    const sun = this.capybaracafe.getObjectByName("Sun");
    const moon = this.capybaracafe.getObjectByName("Moon");

    if (sun) {
      gsap.to(sun.rotation, {
        x: isNight ? Math.PI : 0,
        duration: 1.5,
        ease: "power2.inOut",
      });
    }

    if (moon) {
      gsap.to(moon.rotation, {
        x: isNight ? Math.PI : 0,
        duration: 1.5,
        ease: "power2.inOut",
      });
    }
  }

  initAnimations() {
    this.trailGroups = [
      {
        trails: [],
        threshold: 0.45,
        hasShown: false,
      },
      {
        trails: [],
        threshold: 0.4,
        hasShown: false,
      },
      {
        trails: [],
        threshold: 0.38,
        hasShown: false,
      },
      {
        trails: [],
        threshold: 0.24,
        hasShown: false,
      },
      {
        trails: [],
        threshold: 0.12,
        hasShown: false,
      },
    ];

    this.trails.forEach((trail) => {
      const index = parseInt(trail.name.split("Trail")[1]) - 1;
      if (this.trailGroups[index]) {
        this.trailGroups[index].trails.push(trail);
      }
    });
  }

  initEnvironment() {
    this.ambientLight = new THREE.AmbientLight("#fff2f2", 2);
    this.experience.sceneB.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight("#ffffff", 2.2);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.camera.far = 20;
    this.sunLight.shadow.mapSize.set(4096, 4096);
    this.sunLight.shadow.normalBias = 0.2;
    this.sunLight.shadow.camera.left = -100;
    this.sunLight.shadow.camera.right = 300;
    this.sunLight.shadow.camera.top = 100;
    this.sunLight.shadow.camera.bottom = -50;
    this.sunLight.position.set(5, 18, -3);
    this.experience.sceneB.add(this.sunLight);
    this.experience.sceneB.add(this.sunLight.target);

    this.lightHelper = new THREE.DirectionalLightHelper(this.sunLight, 15);
    this.experience.sceneB.add(this.lightHelper);
  }

  initDebug() {
    this.gui = new GUI({ title: "Lighting" });

    const sunFolder = this.gui.addFolder("☀️ Sun Light");
    sunFolder.addColor(this.sunLight, "color").name("Color");
    sunFolder.add(this.sunLight, "intensity", 0, 10, 0.01).name("Intensity");
    sunFolder
      .add(this.sunLight.position, "x", -50, 50, 0.1)
      .name("Pos X")
      .onChange(() => this.lightHelper.update());
    sunFolder
      .add(this.sunLight.position, "y", -50, 50, 0.1)
      .name("Pos Y")
      .onChange(() => this.lightHelper.update());
    sunFolder
      .add(this.sunLight.position, "z", -50, 50, 0.1)
      .name("Pos Z")
      .onChange(() => this.lightHelper.update());
    sunFolder
      .add(this.sunLight.shadow, "normalBias", 0, 1, 0.001)
      .name("Shadow Bias");
    sunFolder
      .add(this.sunLight.target.position, "x", -50, 50, 0.1)
      .name("Target X")
      .onChange(() => {
        this.sunLight.target.updateMatrixWorld();
        this.lightHelper.update();
      });
    sunFolder
      .add(this.sunLight.target.position, "y", -50, 50, 0.1)
      .name("Target Y")
      .onChange(() => {
        this.sunLight.target.updateMatrixWorld();
        this.lightHelper.update();
      });
    sunFolder
      .add(this.sunLight.target.position, "z", -50, 50, 0.1)
      .name("Target Z")
      .onChange(() => {
        this.sunLight.target.updateMatrixWorld();
        this.lightHelper.update();
      });

    const ambientFolder = this.gui.addFolder("🌫️ Ambient Light");
    ambientFolder.addColor(this.ambientLight, "color").name("Color");
    ambientFolder
      .add(this.ambientLight, "intensity", 0, 10, 0.01)
      .name("Intensity");
  }

  initBgOrb() {
    const geometry = new THREE.SphereGeometry(500, 32, 16);
    const material = new THREE.MeshBasicMaterial({
      color: "#75a3e4",
      side: THREE.BackSide,
    });
    const sphere = new THREE.Mesh(geometry, material);
    this.experience.sceneB.add(sphere);
  }

  resize() {}

  update() {
    for (let i = 0; i < this.trailGroups.length; i++) {
      const group = this.trailGroups[i];
      const shouldShow = this.experience.controls.progress <= group.threshold;

      if (shouldShow && !group.hasShown) {
        group.trails.forEach((trail) => {
          gsap.to(trail.scale, {
            x: 1,
            y: 1,
            z: 1,
            duration: 0.4,
          });
        });
        group.hasShown = true;
      } else if (!shouldShow && group.hasShown) {
        group.trails.forEach((trail) => {
          gsap.to(trail.scale, {
            x: 0,
            y: 0,
            z: 0,
            duration: 0.2,
          });
        });
        group.hasShown = false;
      }
    }
  }

  destroy() {
    this.gui.destroy();
  }
}
