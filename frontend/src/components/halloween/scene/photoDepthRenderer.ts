export type PhotoCamera = { horizontal: number; vertical: number; render?: () => void };

export type PhotoDepthRenderer = {
  draw: (camera: PhotoCamera) => void;
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
  varying vec2 imagePosition;

  void main() {
    vec2 origin = imagePosition * cropScale + cropOffset;
    vec2 source = origin;
    vec2 movement = camera * vec2(0.018, 0.010);
    for (int step = 0; step < 4; step++) {
      float depth = texture2D(depthMap, source).r;
      source = origin + movement * (depth - 0.45);
    }
    source = clamp(source, vec2(0.001), vec2(0.999));
    vec3 color = texture2D(photograph, source).rgb;
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
      draw: (camera) => {
        if (disposed || graphics.isContextLost()) return;
        graphics.uniform2f(cameraLocation, camera.horizontal, camera.vertical);
        graphics.uniform2f(scaleLocation, cropScale[0], cropScale[1]);
        graphics.uniform2f(offsetLocation, cropOffset[0], cropOffset[1]);
        graphics.drawArrays(graphics.TRIANGLES, 0, 6);
      },
      dispose,
    };
  } catch {
    dispose();
    return null;
  }
}
