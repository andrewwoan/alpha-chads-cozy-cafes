import * as THREE from "three/webgpu";
import GUI from "lil-gui";
import { Experience } from "../Experience";
import gsap from "gsap";
import {
  attribute,
  cameraPosition,
  color,
  float,
  Fn,
  max,
  mix,
  modelWorldMatrix,
  normalize,
  positionLocal,
  smoothstep,
  sub,
  uniform,
  vec4,
} from "three/tsl";

export class ChadCafe {
  constructor() {
    this.experience = Experience.getInstance();
    this.chadcafe = this.experience.resources.items.chadcafe.scene;
    this.trails = [];

    this.init();
  }

  init() {
    this.initCafe();
    this.initEnvironment();
    this.initAnimations();
    // this.initDebug();
  }

  initCafe() {
    const intersectObjects = {};
    this.spotLights = [];

    this.carParts = [];
    this.carWheels = [];
    this.carHeadlights = [];
    this.carDistanceTraveled = 0;
    this.carConfig = {
      startZ: 50,
      endZ: -30,
      speed: 0.05,
    };

    this.chadcafe.traverse((child) => {
      if (
        child.name.includes("Raycaster") &&
        (child.type === "Group" || child.type === "Object3D")
      ) {
        intersectObjects[child.name] = child;
      }

      if (child.name === "arealight") {
        const worldPos = child.getWorldPosition(new THREE.Vector3());

        this.areaLight = new THREE.SpotLight(
          "#fffdfb",
          0,
          10,
          Math.PI / 6,
          1,
          0.5,
        );
        this.areaLight.position.set(worldPos.x, worldPos.y + 0.5, worldPos.z);
        this.areaLight.target.position.set(
          worldPos.x + 0.5,
          worldPos.y - 1,
          worldPos.z,
        );
        this.experience.sceneA.add(this.areaLight);
        this.experience.sceneA.add(this.areaLight.target);
        // this.areaLightHelper = new THREE.SpotLightHelper(this.areaLight);
        // this.experience.sceneA.add(this.areaLightHelper);
      }

      if (
        child.name.includes("Light") &&
        !child.name.includes("headlight") &&
        (child.type === "Object3D" || child.type === "Group")
      ) {
        const worldPos = child.getWorldPosition(new THREE.Vector3());
        const light = new THREE.SpotLight(
          "#fffdfb",
          0,
          15,
          Math.PI / 6,
          0.5,
          2,
        );
        light.position.set(worldPos.x, worldPos.y + 0.25, worldPos.z);
        light.target.position.set(worldPos.x + 1.5, worldPos.y - 5, worldPos.z);
        this.experience.sceneA.add(light);
        this.experience.sceneA.add(light.target);
        this.spotLights.push(light);

        const coneHeight = 5;
        const coneRadius = coneHeight * Math.tan(Math.PI / 6);
        const topRadius = coneRadius * 0.05;
        const bottomRadius = coneRadius;
        const coneGeo = new THREE.CylinderGeometry(
          topRadius,
          bottomRadius,
          coneHeight,
          32,
          1,
          true,
        );
        coneGeo.translate(0, -coneHeight / 2, 0);

        const coneMat = new THREE.MeshBasicNodeMaterial({
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });

        const lightColor = uniform(color("#fffdfb"));
        const lightOpacity = uniform(0.0);

        coneMat.colorNode = Fn(() => {
          const y = positionLocal.y;
          const fade = smoothstep(float(-coneHeight), float(0), y);
          return vec4(lightColor, fade.mul(lightOpacity));
        })();

        coneMat.fragmentNode = coneMat.colorNode;

        const coneMesh = new THREE.Mesh(coneGeo, coneMat);
        coneMesh.position.set(worldPos.x, worldPos.y + 0.25, worldPos.z);
        coneMesh.renderOrder = 999;
        this.experience.sceneA.add(coneMesh);

        light.userData.coneMat = coneMat;
        light.userData.coneMesh = coneMesh;
        light.userData.lightOpacity = lightOpacity;
      }

      if (child.name === "headlight" || child.name === "headlight001") {
        const worldPos = child.getWorldPosition(new THREE.Vector3());

        const coneHeight = 2;
        const coneRadius = coneHeight * Math.tan(Math.PI / 6);
        const topRadius = coneRadius * 0.01;
        const bottomRadius = coneRadius;
        const coneGeo = new THREE.CylinderGeometry(
          topRadius,
          bottomRadius,
          coneHeight,
          32,
          1,
          true,
        );
        coneGeo.translate(0, -coneHeight / 2, 0);

        const coneMat = new THREE.MeshBasicNodeMaterial({
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });

        const lightColor = uniform(color("#e9d395"));
        const lightOpacity = uniform(0.0);

        coneMat.colorNode = Fn(() => {
          const y = positionLocal.y;
          const fade = smoothstep(float(-coneHeight), float(0), y);
          return vec4(lightColor, fade.mul(lightOpacity));
        })();

        coneMat.fragmentNode = coneMat.colorNode;

        const coneMesh = new THREE.Mesh(coneGeo, coneMat);
        coneMesh.position.set(worldPos.x, worldPos.y, worldPos.z);
        coneMesh.rotation.x = Math.PI / 2;
        coneMesh.renderOrder = 999;
        this.experience.sceneA.add(coneMesh);

        this.carHeadlights.push({
          coneMesh,
          originalZ: worldPos.z,
          lightOpacity,
        });

        this.carParts.push(child);
      }

      if (child.name === "Car") {
        this.carParts.push(child);
      }

      if (child.name === "Car_Back_Wheel" || child.name === "Car_Front_Wheel") {
        this.carParts.push(child);
        this.carWheels.push(child);
      }

      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.name.includes("Trail")) {
          child.scale.set(0, 0, 0);
          this.trails.push(child);
        }

        if (child.material && child.material.name === "Project 3") {
          child.material.map = this.experience.resources.items.Project_3;
          child.material.needsUpdate = true;
        }

        if (child.material && child.material.name === "Project 4") {
          child.material.map = this.experience.resources.items.Project_4;
          child.material.needsUpdate = true;
        }
      }
    });

    this.carOriginalPositions = this.carParts.map((part) => ({
      mesh: part,
      originalZ: part.position.z,
    }));

    this.experience.sceneA.add(this.chadcafe);

    this.experience.raycaster.populateIntersectObjects("A", [
      {
        mesh: intersectObjects["Raycaster_BEAST_MODE_ALPHA_CHAD"],
        type: "scale",
        pairKey: "beast-mode",
      },
      {
        mesh: intersectObjects["Raycaster_Cozy_Project_1001"],
        type: "modal",
        elementId: "project-one-chad",
        pairKey: "project-one",
      },
      {
        mesh: intersectObjects["Raycaster_Cozy_Project_2001"],
        type: "modal",
        elementId: "project-two-chad",
        pairKey: "project-two",
      },
      {
        mesh: intersectObjects["Raycaster_Instagram_Contact"],
        type: "url",
        url: "https://www.instagram.com/andrewwoan/",
        pairKey: "instagram",
      },
      {
        mesh: intersectObjects["Raycaster_Twitter_Contact"],
        type: "url",
        url: "https://x.com/andrewwoan",
        pairKey: "twitter",
      },
      {
        mesh: intersectObjects["Raycaster_YouTube_Contact"],
        type: "url",
        url: "https://youtube.com/@andrewwoan",
        pairKey: "youtube",
      },
    ]);
  }

  setNightMode(isNight) {
    const targetIntensity = isNight ? 40 : 0;
    const targetOpacity = isNight ? 0.15 : 0;
    this.spotLights.forEach((light) => {
      gsap.to(light, {
        intensity: targetIntensity,
        duration: 1.5,
        ease: "power2.inOut",
      });
      gsap.to(light.userData.lightOpacity, {
        value: targetOpacity,
        duration: 1.5,
        ease: "power2.inOut",
      });
    });

    const headlightOpacity = isNight ? 0.15 : 0;
    this.carHeadlights.forEach((hl) => {
      gsap.to(hl.lightOpacity, {
        value: headlightOpacity,
        duration: 1.5,
        ease: "power2.inOut",
      });
    });

    if (this.areaLight) {
      gsap.to(this.areaLight, {
        intensity: isNight ? 2 : 0,
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
    this.experience.sceneA.add(this.ambientLight);

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
    this.experience.sceneA.add(this.sunLight);
    this.experience.sceneA.add(this.sunLight.target);

    this.lightHelper = new THREE.DirectionalLightHelper(this.sunLight, 15);
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

    if (this.carParts.length > 0) {
      this.carDistanceTraveled += this.carConfig.speed;

      this.carOriginalPositions.forEach(({ mesh, originalZ }) => {
        mesh.position.z = originalZ - this.carDistanceTraveled;
      });

      this.carHeadlights.forEach((hl) => {
        const newZ = hl.originalZ - this.carDistanceTraveled;
        hl.coneMesh.position.z = newZ;
      });

      this.carWheels.forEach((wheel) => {
        wheel.rotation.x -= 0.2;
      });

      const refZ =
        this.carOriginalPositions[0].originalZ - this.carDistanceTraveled;
      if (refZ <= this.carConfig.endZ) {
        this.carDistanceTraveled = 0;

        this.carOriginalPositions.forEach(({ mesh, originalZ }) => {
          mesh.position.z = originalZ;
        });

        this.carHeadlights.forEach((hl) => {
          hl.coneMesh.position.z = hl.originalZ;
        });
      }
    }
  }

  destroy() {
    this.gui.destroy();
  }
}
