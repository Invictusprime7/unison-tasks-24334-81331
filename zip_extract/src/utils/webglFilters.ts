// WebGL-based image filters for GPU-accelerated processing

export class WebGLFilter {
  private gl: WebGLRenderingContext | null = null;
  private canvas: HTMLCanvasElement;
  private program: WebGLProgram | null = null;

  constructor() {
    this.canvas = document.createElement('canvas');
    const gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
    this.gl = gl as WebGLRenderingContext;
    
    if (!this.gl) {
      throw new Error('WebGL not supported');
    }
  }

  private createShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;
    
    const shader = this.gl.createShader(type);
    if (!shader) return null;
    
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }

  private createProgram(vertexSource: string, fragmentSource: string): WebGLProgram | null {
    if (!this.gl) return null;
    
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);
    
    if (!vertexShader || !fragmentShader) return null;
    
    const program = this.gl.createProgram();
    if (!program) return null;
    
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Program linking error:', this.gl.getProgramInfoLog(program));
      this.gl.deleteProgram(program);
      return null;
    }
    
    return program;
  }

  // Gaussian Blur Filter
  applyGaussianBlur(imageData: ImageData, radius: number): ImageData {
    if (!this.gl || radius === 0) return imageData;

    const vertexShader = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0, 1);
        v_texCoord = a_texCoord;
      }
    `;

    const fragmentShader = `
      precision mediump float;
      uniform sampler2D u_image;
      uniform vec2 u_resolution;
      uniform float u_radius;
      varying vec2 v_texCoord;
      
      void main() {
        vec2 texelSize = 1.0 / u_resolution;
        vec4 color = vec4(0.0);
        float total = 0.0;
        
        for (float x = -10.0; x <= 10.0; x++) {
          for (float y = -10.0; y <= 10.0; y++) {
            vec2 offset = vec2(x, y) * texelSize * u_radius;
            float weight = exp(-(x*x + y*y) / (2.0 * u_radius * u_radius));
            color += texture2D(u_image, v_texCoord + offset) * weight;
            total += weight;
          }
        }
        
        gl_FragColor = color / total;
      }
    `;

    return this.applyFilter(imageData, vertexShader, fragmentShader, { u_radius: radius / 10 });
  }

  // Brightness/Contrast Filter
  applyBrightnessContrast(imageData: ImageData, brightness: number, contrast: number): ImageData {
    if (!this.gl) return imageData;

    const vertexShader = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0, 1);
        v_texCoord = a_texCoord;
      }
    `;

    const fragmentShader = `
      precision mediump float;
      uniform sampler2D u_image;
      uniform float u_brightness;
      uniform float u_contrast;
      varying vec2 v_texCoord;
      
      void main() {
        vec4 color = texture2D(u_image, v_texCoord);
        
        // Apply brightness
        color.rgb += u_brightness;
        
        // Apply contrast
        color.rgb = (color.rgb - 0.5) * (1.0 + u_contrast) + 0.5;
        
        gl_FragColor = color;
      }
    `;

    return this.applyFilter(imageData, vertexShader, fragmentShader, {
      u_brightness: brightness / 100,
      u_contrast: contrast / 100,
    });
  }

  // Saturation/Hue Filter
  applySaturationHue(imageData: ImageData, saturation: number, hue: number): ImageData {
    if (!this.gl) return imageData;

    const vertexShader = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0, 1);
        v_texCoord = a_texCoord;
      }
    `;

    const fragmentShader = `
      precision mediump float;
      uniform sampler2D u_image;
      uniform float u_saturation;
      uniform float u_hue;
      varying vec2 v_texCoord;
      
      vec3 rgb2hsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
        
        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
      }
      
      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }
      
      void main() {
        vec4 color = texture2D(u_image, v_texCoord);
        vec3 hsv = rgb2hsv(color.rgb);
        
        // Apply hue rotation
        hsv.x = fract(hsv.x + u_hue / 360.0);
        
        // Apply saturation
        hsv.y = clamp(hsv.y * (1.0 + u_saturation), 0.0, 1.0);
        
        gl_FragColor = vec4(hsv2rgb(hsv), color.a);
      }
    `;

    return this.applyFilter(imageData, vertexShader, fragmentShader, {
      u_saturation: saturation / 100,
      u_hue: hue,
    });
  }

  // Unsharp Mask (Sharpen)
  applySharpen(imageData: ImageData): ImageData {
    if (!this.gl) return imageData;

    const vertexShader = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0, 1);
        v_texCoord = a_texCoord;
      }
    `;

    const fragmentShader = `
      precision mediump float;
      uniform sampler2D u_image;
      uniform vec2 u_resolution;
      varying vec2 v_texCoord;
      
      void main() {
        vec2 texelSize = 1.0 / u_resolution;
        
        // Sharpen kernel
        float kernel[9];
        kernel[0] = -1.0; kernel[1] = -1.0; kernel[2] = -1.0;
        kernel[3] = -1.0; kernel[4] =  9.0; kernel[5] = -1.0;
        kernel[6] = -1.0; kernel[7] = -1.0; kernel[8] = -1.0;
        
        vec4 sum = vec4(0.0);
        for (int i = -1; i <= 1; i++) {
          for (int j = -1; j <= 1; j++) {
            vec2 offset = vec2(float(i), float(j)) * texelSize;
            int index = (i + 1) * 3 + (j + 1);
            sum += texture2D(u_image, v_texCoord + offset) * kernel[index];
          }
        }
        
        gl_FragColor = sum;
      }
    `;

    return this.applyFilter(imageData, vertexShader, fragmentShader, {});
  }

  private applyFilter(imageData: ImageData, vertexSource: string, fragmentSource: string, uniforms: Record<string, number>): ImageData {
    if (!this.gl) return imageData;

    this.canvas.width = imageData.width;
    this.canvas.height = imageData.height;

    const program = this.createProgram(vertexSource, fragmentSource);
    if (!program) return imageData;

    this.gl.useProgram(program);

    // Create texture
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, imageData);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

    // Set up geometry
    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      this.gl.STATIC_DRAW
    );

    const texCoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]),
      this.gl.STATIC_DRAW
    );

    // Set attributes
    const positionLocation = this.gl.getAttribLocation(program, 'a_position');
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.enableVertexAttribArray(positionLocation);
    this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    const texCoordLocation = this.gl.getAttribLocation(program, 'a_texCoord');
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
    this.gl.enableVertexAttribArray(texCoordLocation);
    this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);

    // Set uniforms
    const resolutionLocation = this.gl.getUniformLocation(program, 'u_resolution');
    if (resolutionLocation) {
      this.gl.uniform2f(resolutionLocation, imageData.width, imageData.height);
    }

    for (const [name, value] of Object.entries(uniforms)) {
      const location = this.gl.getUniformLocation(program, name);
      if (location) {
        this.gl.uniform1f(location, value);
      }
    }

    // Draw
    this.gl.viewport(0, 0, imageData.width, imageData.height);
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

    // Read pixels
    const pixels = new Uint8ClampedArray(imageData.width * imageData.height * 4);
    this.gl.readPixels(0, 0, imageData.width, imageData.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);

    return new ImageData(pixels, imageData.width, imageData.height);
  }

  dispose() {
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program);
    }
  }
}
