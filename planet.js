import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

export function createSecondPlanet(scene, planet) {
  const newPlanet = planet.clone();
  newPlanet.material = planet.material.clone();
  newPlanet.material.color.set(0x247A45);
  newPlanet.position.set(0, -7, 110);

  scene.add(newPlanet);
  return newPlanet;
}
