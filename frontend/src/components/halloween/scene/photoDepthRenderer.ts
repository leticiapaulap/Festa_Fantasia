export type PhotoCamera = { horizontal: number; vertical: number; render?: () => void };

export type PhotoDepthRenderer = {
  draw: (camera: PhotoCamera, seconds: number) => boolean;
  resize: () => void;
  dispose: () => void;
};

const vertexSource = `
  attribute vec2 position;
  varying vec2 imagePosition;
  void main() {
    imagePosition = vec2(position.x * 0.5 + 0.5, 0.5 - position.y * 0.5);
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentSource = `
  precision highp float;
  uniform sampler2D photograph;
  uniform sampler2D depthMap;
  uniform vec2 camera;
  uniform vec2 cropScale;
  uniform vec2 cropOffset;
  uniform float sceneTime;
  varying vec2 imagePosition;

  float fogNoise(vec2 position) {
    vec2 cell = floor(position);
    vec2 weight = fract(position);
    weight = weight * weight * (3.0 - 2.0 * weight);
    vec4 corners = vec4(
      dot(cell, vec2(127.1, 311.7)),
      dot(cell + vec2(1.0, 0.0), vec2(127.1, 311.7)),
      dot(cell + vec2(0.0, 1.0), vec2(127.1, 311.7)),
      dot(cell + vec2(1.0), vec2(127.1, 311.7))
    );
    vec4 noise = fract(sin(corners) * 43758.5453);
    return mix(mix(noise.x, noise.y, weight.x), mix(noise.z, noise.w, weight.x), weight.y);
  }

  void main() {
    vec2 origin = imagePosition * cropScale + cropOffset;
    vec2 source = origin;
    vec2 drift = vec2(sin(sceneTime * 0.16) * 0.12, (cos(sceneTime * 0.12) - 1.0) * 0.05);
    vec2 movement = (camera + drift) * vec2(0.018, 0.010);
    for (int step = 0; step < 4; step++) {
      float depth = texture2D(depthMap, source).r;
      source = origin + movement * (depth - 0.45);
    }
    source = clamp(source, vec2(0.001), vec2(0.999));
    vec3 color = texture2D(photograph, source).rgb;
    vec2 scene = texture2D(depthMap, source).rg;
    float distance = clamp((0.85 - scene.r) * 1.7, 0.0, 1.0);
    float protection = 1.0 - scene.g * 0.98;
    float ground = smoothstep(0.50, 0.83, source.y);
    float framing = 1.0 - smoothstep(0.48, 0.88, source.x);
    vec2 cloud = source * vec2(5.5, 4.0) + vec2(sceneTime * -0.012, sceneTime * 0.003);
    float density = fogNoise(cloud) * 0.68 + fogNoise(cloud * 2.3 + vec2(7.0, -3.0)) * 0.32;
    float mist = smoothstep(0.28, 0.76, density) * ground * (0.035 + distance * 0.085) * protection * framing;
    color = mix(color, vec3(0.49, 0.43, 0.54), mist);
    float glow = exp(-dot((source - vec2(0.32, 0.34)) * vec2(1.1, 1.0), (source - vec2(0.32, 0.34)) * vec2(1.1, 1.0)) * 7.0);
    float pulse = 0.5 + 0.5 * sin(sceneTime * 0.23);
    color += vec3(1.0, 0.46, 0.12) * glow * (0.008 + pulse * 0.012) * protection;
    color += vec3(0.34, 0.22, 0.52) * distance * (0.010 + (1.0 - pulse) * 0.012) * protection;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function createPhotoDepthRenderer(canvas: HTMLCanvasElement, image: HTMLImageElement, depth: HTMLImageElement): PhotoDepthRenderer | null {
  const graphics = canvas.getContext('webgl', {
    alpha: false, antialias: false, depth: false, stencil: false,
    preserveDrawingBuffer: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: true,
  });
  if (!graphics) return null;
  const shaders: WebGLShader[] = [];
  const textures: WebGLTexture[] = [];
  const program = graphics.createProgram();
  const vertices = graphics.createBuffer();
  let disposed = false;
  let cropScale = [1, 1];
  let cropOffset = [0, 0];
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const texture of textures) graphics.deleteTexture(texture);
    for (const shader of shaders) graphics.deleteShader(shader);
    graphics.deleteBuffer(vertices);
    graphics.deleteProgram(program);
  };

  try {
    if (!program || !vertices) throw new Error('Photo depth resources unavailable');
    for (const [kind, source] of [[graphics.VERTEX_SHADER, vertexSource], [graphics.FRAGMENT_SHADER, fragmentSource]] as const) {
      const shader = graphics.createShader(kind);
      if (!shader) throw new Error('Photo depth shader unavailable');
      shaders.push(shader);
      graphics.shaderSource(shader, source);
      graphics.compileShader(shader);
      if (!graphics.getShaderParameter(shader, graphics.COMPILE_STATUS)) throw new Error('Photo depth shader compilation failed');
      graphics.attachShader(program, shader);
    }
    graphics.linkProgram(program);
    if (!graphics.getProgramParameter(program, graphics.LINK_STATUS)) throw new Error('Photo depth linking failed');
    graphics.useProgram(program);
    graphics.bindBuffer(graphics.ARRAY_BUFFER, vertices);
    graphics.bufferData(graphics.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), graphics.STATIC_DRAW);
    const position = graphics.getAttribLocation(program, 'position');
    graphics.enableVertexAttribArray(position);
    graphics.vertexAttribPointer(position, 2, graphics.FLOAT, false, 0, 0);

    for (const [index, source, name] of [[0, image, 'photograph'], [1, depth, 'depthMap']] as const) {
      const texture = graphics.createTexture();
      if (!texture) throw new Error('Photo depth texture unavailable');
      textures.push(texture);
      graphics.activeTexture(graphics.TEXTURE0 + index);
      graphics.bindTexture(graphics.TEXTURE_2D, texture);
      graphics.texParameteri(graphics.TEXTURE_2D, graphics.TEXTURE_WRAP_S, graphics.CLAMP_TO_EDGE);
      graphics.texParameteri(graphics.TEXTURE_2D, graphics.TEXTURE_WRAP_T, graphics.CLAMP_TO_EDGE);
      graphics.texParameteri(graphics.TEXTURE_2D, graphics.TEXTURE_MIN_FILTER, graphics.LINEAR);
      graphics.texParameteri(graphics.TEXTURE_2D, graphics.TEXTURE_MAG_FILTER, graphics.LINEAR);
      graphics.pixelStorei(graphics.UNPACK_FLIP_Y_WEBGL, false);
      graphics.texImage2D(graphics.TEXTURE_2D, 0, graphics.RGBA, graphics.RGBA, graphics.UNSIGNED_BYTE, source);
      graphics.uniform1i(graphics.getUniformLocation(program, name), index);
    }
    if (graphics.getError() !== graphics.NO_ERROR) throw new Error('Photo depth texture upload failed');

    const cameraLocation = graphics.getUniformLocation(program, 'camera');
    const scaleLocation = graphics.getUniformLocation(program, 'cropScale');
    const offsetLocation = graphics.getUniformLocation(program, 'cropOffset');
    const timeLocation = graphics.getUniformLocation(program, 'sceneTime');
    const resize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const density = Math.min(window.devicePixelRatio || 1, 1.5, 1920 / Math.max(1, width), 1200 / Math.max(1, height));
      canvas.width = Math.max(1, Math.round(width * density));
      canvas.height = Math.max(1, Math.round(height * density));
      graphics.viewport(0, 0, canvas.width, canvas.height);
      const cover = Math.max(width / image.naturalWidth, height / image.naturalHeight);
      cropScale = [width / (image.naturalWidth * cover), height / (image.naturalHeight * cover)];
      cropOffset = [(1 - cropScale[0]) * 0.36, (1 - cropScale[1]) * 0.5];
    };
    resize();
    return {
      resize,
      draw: (camera, seconds) => {
        if (disposed || graphics.isContextLost()) return false;
        graphics.uniform2f(cameraLocation, camera.horizontal, camera.vertical);
        graphics.uniform2f(scaleLocation, cropScale[0], cropScale[1]);
        graphics.uniform2f(offsetLocation, cropOffset[0], cropOffset[1]);
        graphics.uniform1f(timeLocation, seconds);
        graphics.drawArrays(graphics.TRIANGLES, 0, 6);
        return true;
      },
      dispose,
    };
  } catch {
    dispose();
    return null;
  }
}
