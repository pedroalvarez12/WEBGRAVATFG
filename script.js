let mouseX = 0.5;
let mouseY = 0.5;
window.addEventListener("mousemove", (e) => {
  mouseX = e.clientX / window.innerWidth;
  mouseY = 1.0 - (e.clientY / window.innerHeight);
});

/*******************************************************
 * LOAD IMAGES → ATLAS TEXTURE
 *******************************************************/
const imageSources = [
  "media/000014-2 1.jpg",
  "media/000016 1.jpg",
  "media/000019 1 1.jpg"
];

let images = [];
let loaded = 0;
let videoEl = null;
let hasVideo = false;

imageSources.forEach((src, i) => {
  let img = new Image();
  img.src = src;
  img.onload = () => {
    images[i] = img;
    loaded++;
    if (loaded === imageSources.length) initCRT();
  };
});

window.addEventListener("DOMContentLoaded", () => {
  videoEl = document.getElementById("carousel-video");
  if (!videoEl) return;
  videoEl.muted = true;
  videoEl.loop = true;
  videoEl.autoplay = true;
  videoEl.playsInline = true;
  videoEl.addEventListener("ended", () => {
    videoEl.currentTime = 0;
    videoEl.play().catch(() => {});
  });
  videoEl.addEventListener("canplay", () => {
    hasVideo = true;
    videoEl.play().catch(() => {});
  });
  videoEl.addEventListener("error", () => {
    hasVideo = false;
  });
});


/*******************************************************
 * SCROLL-JACKING
 *******************************************************/
let current = 0;
let isAnimating = false;
const slides = document.querySelectorAll(".slide");
let slideLoc = null;

function scrollToSlide(index) {
  if (index < 0 || index >= slides.length) return;

  current = index;

  if (slideLoc) gl.uniform1f(slideLoc, current);

  isAnimating = true;
  const target = index * window.innerHeight;
  const start = window.scrollY;
  const duration = 1000;
  const startTime = performance.now();

  function anim(t) {
    const p = Math.min((t - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    window.scrollTo(0, start + (target - start) * ease);

    if (p < 1) requestAnimationFrame(anim);
    else isAnimating = false;
  }

  requestAnimationFrame(anim);
}

window.addEventListener("wheel", (e) => {
  if (isAnimating) {
    e.preventDefault();
    return;
  }
  if (e.deltaY > 20) {
    e.preventDefault();
    scrollToSlide(current + 1);
  }
  else if (e.deltaY < -20) {
    e.preventDefault();
    scrollToSlide(current - 1);
  }
}, { passive: false });

/*******************************************************
 * DISTORTION PASS — "gas turbulence" around mouse
 *******************************************************/
let glDist, distortProg, distortTex, distortBuffer;

function initDistortion(canvas, atlasTexture) {
  glDist = canvas.getContext("webgl", { premultipliedAlpha:false });

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const vsDist = `
  attribute vec2 pos;
  varying vec2 uv;
  void main(){
    uv = (pos + 1.0) * 0.5;
    gl_Position = vec4(pos,0.0,1.0);
  }
  `;

  const fsDist = `
  precision mediump float;
  varying vec2 uv;
  uniform sampler2D atlas;
  uniform float time;
  uniform vec2 mouse;

  // Perlin-ish noise
  float noise(vec2 p){
    return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453);
  }

  void main(){

    float dist = distance(uv, mouse);
    float strength = exp(-dist * 8.0);

    float t = time * 0.5;

    float n = noise(uv * 10.0 + t);
    float n2 = noise(uv * 20.0 + t*2.0);

    float offset = (n - 0.5) * 0.02 * strength;

    vec2 uv2 = uv;
    uv2 += vec2(offset, offset * 0.5);

    gl_FragColor = texture2D(atlas, uv2);
  }
  `;

  // compile
  function comp(type, src){
    const s = glDist.createShader(type);
    glDist.shaderSource(s,src);
    glDist.compileShader(s);
    return s;
  }

  distortProg = glDist.createProgram();
  glDist.attachShader(distortProg, comp(glDist.VERTEX_SHADER, vsDist));
  glDist.attachShader(distortProg, comp(glDist.FRAGMENT_SHADER, fsDist));
  glDist.linkProgram(distortProg);
  glDist.useProgram(distortProg);

  const quad = new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]);
  distortBuffer = glDist.createBuffer();
  glDist.bindBuffer(glDist.ARRAY_BUFFER, distortBuffer);
  glDist.bufferData(glDist.ARRAY_BUFFER, quad, glDist.STATIC_DRAW);

  const pos = glDist.getAttribLocation(distortProg,"pos");
  glDist.enableVertexAttribArray(pos);
  glDist.vertexAttribPointer(pos,2,glDist.FLOAT,false,0,0);

  glDist.uniform1i(glDist.getUniformLocation(distortProg,"atlas"),0);

  distortTex = atlasTexture;
}



/*******************************************************
 * CRT INIT
 *******************************************************/
let gl;

function initCRT() {

  const crt = document.getElementById("crt80s");
  gl = crt.getContext("webgl", { premultipliedAlpha:false });

  function resize() {
    crt.width = window.innerWidth;
    crt.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);


  /*******************************************************
   * BUILD ATLAS TEXTURE (3 images stacked vertically)
   *******************************************************/
  const buffer = document.getElementById("carousel-buffer");
  const ctx = buffer.getContext("2d");

  buffer.width = images[0].width;
  buffer.height = images[0].height * imageSources.length;

  const slideW = images[0].width;
  const slideH = images[0].height;

  const drawAtlas = () => {
    ctx.drawImage(images[0], 0, 0, slideW, slideH);
    if (videoEl && hasVideo && videoEl.readyState >= 2) ctx.drawImage(videoEl, 0, slideH, slideW, slideH);
    else ctx.drawImage(images[1], 0, slideH, slideW, slideH);
    ctx.drawImage(images[2], 0, slideH * 2, slideW, slideH);
  };

  drawAtlas();

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
                gl.RGBA, gl.UNSIGNED_BYTE, buffer);


  /*******************************************************
   * SHADERS
   *******************************************************/
  const vs = `
    attribute vec2 pos;
    varying vec2 uv;
    void main(){
      uv = (pos + 1.0) * 0.5;
      gl_Position = vec4(pos, 0.0, 1.0);
    }
  `;

  const fs = `
    precision mediump float;

    varying vec2 uv;
    uniform float time;
    uniform vec2 resolution;
    uniform sampler2D atlas;
    uniform float slide;

    float rand(vec2 p){
      return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);
    }

    float glitch(float y, float t){
      float g = rand(vec2(floor(t*4.0), floor(y*500.0)));
      return smoothstep(0.99,1.0,g);
    }

    vec2 curve(vec2 p){
      p = p*2.0 - 1.0;
      float r = dot(p,p);
      p *= 1.0 + 0.25*r;
      return p*0.5 + 0.5;
    }

    vec3 rgbSplit(vec2 uv, float amt){
      float r = texture2D(atlas, uv + vec2( amt, 0.0 )).r;
      float g = texture2D(atlas, uv).g;
      float b = texture2D(atlas, uv - vec2( amt, 0.0 )).b;
      return vec3(r,g,b);
    }

    float scan(float y){
      return 0.9 + 0.1*sin(y * resolution.y);
    }

    float flick(float t){
      return 0.95 + 0.05*sin(t*376.0);
    }

    float vign(vec2 uv){
      uv = uv * (1.0 - uv);
      return pow(uv.x*uv.y*20.0, 0.25);
    }

    void main(){
      float total = float(${imageSources.length});
      float scale = 1.0 / total;
      float offset = slide * scale;

      vec2 uv2 = uv;

      // FIX: NO MÁS IMÁGENES BOCA ABAJO
      uv2.y = 1.0 - uv2.y;

      uv2.y = uv2.y * scale + offset;

      uv2 = curve(uv2);

      float g = glitch(uv2.y, time);
      float amt = 0.004 * g;

      vec3 col = rgbSplit(uv2, amt);

      col *= scan(uv2.y);
      col *= flick(time);

      col += (rand(uv2 * time * 300.0) - 0.5) * 0.15;

      col *= vign(uv);

      gl_FragColor = vec4(col, 1.0);
    }
  `;


  /*******************************************************
   * BUILD PROGRAM
   *******************************************************/
  function compile(type, src){
    let s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const quad = new Float32Array([
    -1,-1, 1,-1, -1,1,
    -1,1, 1,-1, 1,1
  ]);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

  const posLoc = gl.getAttribLocation(prog, "pos");
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const timeLoc = gl.getUniformLocation(prog, "time");
  const resLoc  = gl.getUniformLocation(prog, "resolution");

  slideLoc = gl.getUniformLocation(prog, "slide");
  gl.uniform1f(slideLoc, 0);

  gl.uniform1i(gl.getUniformLocation(prog, "atlas"), 0);


  /*******************************************************
   * RENDER LOOP
   *******************************************************/
  function draw(t){
    t *= 0.001;
    gl.viewport(0, 0, crt.width, crt.height);

    drawAtlas();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, buffer);

    gl.uniform1f(timeLoc, t);
    gl.uniform2f(resLoc, crt.width, crt.height);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
}
