import gsap from "gsap";
import { Experience } from "../Experience";

export class NightMode {
  constructor() {
    this.experience = Experience.getInstance();
    this.isNight = false;

    this.chadcafe = this.experience.world.chadcafe;
    this.capybaracafe = this.experience.world.capybaracafe;

    this.toggles = document.querySelectorAll(".night-toggle");
    this.tracks = document.querySelectorAll(".night-toggle__track");
    this.thumbs = document.querySelectorAll(".night-toggle__thumb");
    this.icons = document.querySelectorAll(".night-toggle__icon");

    this.chadConfig = {
      day: {
        ambientColor: "#fff2f2",
        ambientIntensity: 2,
        sunColor: "#ffffff",
        sunIntensity: 2.2,
        sunPosition: { x: 5, y: 18, z: -3 },
      },
      night: {
        ambientColor: "#6f7dd6",
        ambientIntensity: 1,
        sunColor: "#879df3",
        sunIntensity: 1,
        sunPosition: { x: 5, y: 18, z: -3 },
      },
    };

    this.capybaraConfig = {
      day: {
        ambientColor: "#fff2f2",
        ambientIntensity: 2,
        sunColor: "#ffffff",
        sunIntensity: 2.2,
        sunPosition: { x: 5, y: 18, z: -3 },
      },
      night: {
        ambientColor: "#8ca5db",
        ambientIntensity: 1,
        sunColor: "#778ce2",
        sunIntensity: 1,
        sunPosition: { x: 5, y: 18, z: -3 },
      },
    };

    this.init();
  }

  init() {
    this.toggles.forEach((toggle) => {
      toggle.addEventListener("click", () => this.toggle());
    });
  }

  toggle() {
    this.isNight = !this.isNight;
    this.updateUI();
    this.updateTheme();
    this.updateLighting(this.chadcafe, this.chadConfig);
    this.updateLighting(this.capybaracafe, this.capybaraConfig);
    this.chadcafe.setNightMode(this.isNight);
    this.capybaracafe.setNightMode(this.isNight);
  }

  updateTheme() {
    document.body.classList.toggle("night-theme", this.isNight);
    document.body.classList.toggle("day-theme", !this.isNight);
  }

  updateUI() {
    this.tracks.forEach((track) => {
      track.classList.toggle("night-toggle__track--night", this.isNight);
    });
    this.thumbs.forEach((thumb) => {
      thumb.classList.toggle("night-toggle__thumb--night", this.isNight);
    });
    this.icons.forEach((icon) => {
      icon.textContent = this.isNight ? "🌙" : "☀️";
    });
  }

  updateLighting(cafe, config) {
    const target = this.isNight ? config.night : config.day;

    gsap.to(cafe.ambientLight.color, {
      r: this.hexToRgb(target.ambientColor).r,
      g: this.hexToRgb(target.ambientColor).g,
      b: this.hexToRgb(target.ambientColor).b,
      duration: 1.5,
      ease: "power2.inOut",
    });
    gsap.to(cafe.ambientLight, {
      intensity: target.ambientIntensity,
      duration: 1.5,
      ease: "power2.inOut",
    });
    gsap.to(cafe.sunLight.color, {
      r: this.hexToRgb(target.sunColor).r,
      g: this.hexToRgb(target.sunColor).g,
      b: this.hexToRgb(target.sunColor).b,
      duration: 1.5,
      ease: "power2.inOut",
    });
    gsap.to(cafe.sunLight, {
      intensity: target.sunIntensity,
      duration: 1.5,
      ease: "power2.inOut",
    });
    gsap.to(cafe.sunLight.position, {
      x: target.sunPosition.x,
      y: target.sunPosition.y,
      z: target.sunPosition.z,
      duration: 1.5,
      ease: "power2.inOut",
    });
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
    };
  }
}
