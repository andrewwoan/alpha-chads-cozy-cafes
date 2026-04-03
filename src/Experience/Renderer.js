import * as THREE from "three/webgpu";
import {
  texture,
  uniform,
  uv,
  select,
  lessThan,
  vec2,
  vec4,
  float,
  smoothstep,
  mix,
  sin,
} from "three/tsl";

import { Experience } from "./Experience";

export class Renderer {
  constructor() {
    this.experience = Experience.getInstance();

    this.init();
  }

  async init() {
    this.renderer = new THREE.WebGPURenderer({
      canvas: this.experience.canvasElement,
      antialias: true,
    });

    await this.renderer.init();
    this.renderer.toneMapping = THREE.CineonToneMapping;
    this.renderer.toneMappingExposure = 1.5;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(
      this.experience.sizes.width,
      this.experience.sizes.height,
    );
    this.renderer.setPixelRatio(this.experience.sizes.pixelRatio);

    this.initRenderTargets();
    this.initCompositor();
  }

  initRenderTargets() {
    const { width, height, pixelRatio } = this.experience.sizes;

    const params = {
      samples: 4,
    };

    this.renderTargetA = new THREE.RenderTarget(
      width * pixelRatio,
      height * pixelRatio,
      params,
    );

    this.renderTargetB = new THREE.RenderTarget(
      width * pixelRatio,
      height * pixelRatio,
      params,
    );
  }

  initCompositor() {
    this.orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);

    this.sliderX = uniform(0.5);
    this.time = uniform(0.0);
    this.amplitude = uniform(0.0);
    this.waveFrequency = uniform(18.0);
    this.bend = uniform(0.0);

    const uvNode = uv();

    const distFromSlider = uvNode.x.sub(this.sliderX).abs();
    const influence = smoothstep(float(0.15), float(0.0), distFromSlider);
    const phaseShift = sin(this.time.mul(float(0.3))).mul(float(3.0));

    const waveX = sin(
      uvNode.y
        .mul(float(6.0))
        .sub(this.time.mul(float(3.0)))
        .add(phaseShift),
    )
      .mul(float(0.35))
      .add(
        sin(
          uvNode.y
            .mul(float(4.0))
            .sub(this.time.mul(float(2.0)))
            .add(uvNode.x.mul(float(3.0)))
            .add(phaseShift.mul(float(0.7))),
        ).mul(float(0.25)),
      )
      .add(
        sin(uvNode.y.mul(float(10.0)).sub(this.time.mul(float(4.0)))).mul(
          float(0.15),
        ),
      );
    const waveY = sin(uvNode.x.mul(float(10.0)).add(this.time.mul(float(2.0))))
      .mul(float(0.35))
      .add(
        sin(
          uvNode.x
            .mul(float(6.1))
            .sub(this.time.mul(float(2.3)))
            .add(uvNode.y.mul(float(4.0))),
        ).mul(float(0.25)),
      )
      .add(
        sin(uvNode.x.mul(float(16.3)).add(this.time.mul(float(2.9)))).mul(
          float(0.15),
        ),
      );

    const bendCurve = uvNode.y.mul(float(1.0).sub(uvNode.y)).mul(float(4.0)); // peaks at 1.0 in center
    const xOffset = waveX
      .mul(influence)
      .mul(this.amplitude)
      .add(this.bend.mul(bendCurve));
    const displacedUV = vec2(
      uvNode.x.add(xOffset),
      uvNode.y.oneMinus().add(waveY.mul(influence).mul(this.amplitude)),
    );

    const sampledA = texture(this.renderTargetA.texture, displacedUV);
    const sampledB = texture(this.renderTargetB.texture, displacedUV);

    const sceneOutput = select(
      lessThan(uvNode.x.sub(xOffset), this.sliderX),
      sampledA,
      sampledB,
    );

    const lineDist = uvNode.x.sub(this.sliderX.add(xOffset)).abs();
    const line = smoothstep(float(0.002), float(0.0), lineDist);
    this.compositeMaterial = new THREE.NodeMaterial();
    this.compositeMaterial.fragmentNode = mix(
      sceneOutput,
      vec4(1, 1, 1, 1),
      line,
    );

    this.compositeQuad = new THREE.Mesh(geometry, this.compositeMaterial);
    this.compositeScene = new THREE.Scene();
    this.compositeScene.add(this.compositeQuad);
  }

  resize() {
    const { width, height, pixelRatio } = this.experience.sizes;

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(pixelRatio);

    this.renderTargetA.setSize(width * pixelRatio, height * pixelRatio);
    this.renderTargetB.setSize(width * pixelRatio, height * pixelRatio);
  }

  update() {
    const camera = this.experience.camera.instance;
    this.time.value = this.experience.time.elapsed;

    if (this.experience.isDraggingSlider) {
      const slider = this.experience.compareSlider;
      const vel = slider ? slider.signedVelocity : 0;

      const targetBend = vel * 2.5;

      this.bend.value += (targetBend - this.bend.value) * 0.2;

      const speed = Math.abs(vel);
      const velocityAmp = Math.min(speed * 1.2, 0.15);
      const t = this.time.value;
      const drift = Math.sin(t * 1.1) * 0.005 + Math.sin(t * 2.7) * 0.003;
      const target = 0.02 + drift + velocityAmp;
      this.amplitude.value += (target - this.amplitude.value) * 0.15;

      if (slider) slider.signedVelocity *= 0.85;
    } else {
      this.amplitude.value *= 0.92;
      this.bend.value *= 0.88;
    }
    this.renderer.setRenderTarget(this.renderTargetA);
    this.renderer.render(this.experience.sceneA, camera);

    this.renderer.setRenderTarget(this.renderTargetB);
    this.renderer.render(this.experience.sceneB, camera);

    this.renderer.setRenderTarget(null);
    this.renderer.render(this.compositeScene, this.orthoCamera);
  }
}
