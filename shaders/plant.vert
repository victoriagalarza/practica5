uniform float uTime;
uniform float uWindIntensity;
varying vec2 vUv;
varying float vLocalY;

void main() {
    vUv = uv;
    vLocalY = position.y;

    vec3 pos = position;

    // Animación de flexión orgánica por efecto del viento
    float windEffect = sin(uTime * 2.5 + pos.y * 3.0) * 0.08 * uWindIntensity * max(0.0, pos.y);
    pos.x += windEffect;
    pos.z += cos(uTime * 1.8 + pos.y * 2.0) * 0.05 * uWindIntensity * max(0.0, pos.y);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}