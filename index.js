const modPromise = import('./wasm_example');

function rgba_to_grayscale(rgba, nrows, ncols) {
  const gray = new Uint8Array(nrows * ncols);
  for (let r = 0; r < nrows; ++r) {
    for (let c = 0; c < ncols; ++c) {
      // gray = 0.2*red + 0.7*green + 0.1*blue
      gray[r * ncols + c] =
        (2 * rgba[r * 4 * ncols + 4 * c + 0] +
          7 * rgba[r * 4 * ncols + 4 * c + 1] +
          1 * rgba[r * 4 * ncols + 4 * c + 2]) /
        10;
    }
  }

  return gray;
}

/*
	This code was taken from https://github.com/cbrandolino/camvas and modified to suit our needs
*/
/*
Copyright (c) 2012 Claudio Brandolino
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
// The function takes a canvas context and a `drawFunc` function.
// `drawFunc` receives two parameters, the video and the time since
// the last time it was called.
function camvas(ctx, callback) {
  var self = this;
  this.ctx = ctx;
  this.callback = callback;

  // We can't `new Video()` yet, so we'll resort to the vintage
  // "hidden div" hack for dynamic loading.
  var streamContainer = document.createElement('div');
  this.video = document.createElement('video');

  // If we don't do this, the stream will not be played.
  // By the way, the play and pause controls work as usual
  // for streamed videos.
  this.video.setAttribute('autoplay', '1');
  this.video.setAttribute('playsinline', '1'); // important for iPhones

  // The video should fill out all of the canvas
  this.video.setAttribute('width', 1);
  this.video.setAttribute('height', 1);

  streamContainer.appendChild(this.video);
  document.body.appendChild(streamContainer);

  // The callback happens when we are starting to stream the video.
  navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(
    function(stream) {
      // Yay, now our webcam input is treated as a normal video and
      // we can start having fun
      self.video.srcObject = stream;
      // Let's start drawing the canvas!
      self.update();
    },
    function(err) {
      throw err;
    }
  );

  // As soon as we can draw a new frame on the canvas, we call the `draw` function
  // we passed as a parameter.
  this.update = function() {
    var self = this;
    var last = Date.now();
    var loop = function() {
      stats.begin();
      // For some effects, you might want to know how much time is passed
      // since the last frame; that's why we pass along a Delta time `dt`
      // variable (expressed in milliseconds)
      var dt = Date.now - last;
      self.callback(self.video, dt);
      last = Date.now();
      stats.end();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };
}

// this function was taken from https://github.com/tehnokv/picojs/blob/master/pico.js
// see the following post for explanation: https://tkv.io/posts/picojs-intro/
var instantiate_detection_memory = function(size) {
  /*
    initialize a circular buffer of `size` elements
  */
  var n = 0,
    memory = [];
  for (var i = 0; i < size; ++i) memory.push([]);
  /*
    build a function that:
    (1) inserts the current frame's detections into the buffer;
    (2) merges all detections from the last `size` frames and returns them
  */
  function update_memory(dets) {
    memory[n] = dets;
    n = (n + 1) % memory.length;
    dets = [];
    for (i = 0; i < memory.length; ++i) dets = dets.concat(memory[i]);
    //
    return dets;
  }
  /*
    we're done
  */
  return update_memory;
};
var update_memory = instantiate_detection_memory(5); // last 5 frames

var stats = new Stats();
stats.showPanel(1);
document.body.appendChild(stats.dom);

const btn = document.querySelector('input[type="button"]');
const width = 640;
const height = 480;

Promise.all([
  modPromise,
  fetch(
    'https://raw.githubusercontent.com/nenadmarkus/pico/c2e81f9d23cc11d1a612fd21e4f9de0921a5d0d9/rnt/cascades/facefinder'
  ).then((res) => res.arrayBuffer()),
]).then(([mod, buffer]) => {
  const bytes = new Uint8Array(buffer);
  const pico = mod.Pico.new();
  pico.unpack_cascade(bytes);

  let initialized = false;

  function button_callback() {
    if (initialized) return;
    //
    const ctx = document.getElementsByTagName('canvas')[0].getContext('2d');
    //
    const processfn = function(video, dt) {
      // render the video frame to the canvas element
      ctx.drawImage(video, 0, 0);
      const rgba = ctx.getImageData(0, 0, height, width).data;

      // max_size: f32, min_size: f32, scale_factor: f32, shift_factor: f32
      const params = mod.RunParams.new(1000, 100, 1.1, 0.1);

      // ldim: i32, ncols: usize, nrows: usize, pixels: Vec<u8>
      const image = mod.Image.new(
        height,
        height,
        width,
        rgba_to_grayscale(rgba, width, height)
      );

      pico.run_cascade(image, params);

      // iou_threshold: f32
      const dets = pico.cluster_detections(0.2);
      qthresh = 50.0;
      for (i = 0; i < dets.length; i += 4) {
        // check the detection score
        // if it's above the threshold, draw it
        const r = dets[i];
        const c = dets[i + 1];
        const scale = dets[i + 2];
        const q = dets[i + 3];
        if (q > qthresh) {
          ctx.beginPath();
          ctx.arc(c, r, scale / 2, 0, 2 * Math.PI, false);
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'red';
          ctx.stroke();
        }
      }
    };
    //
    var mycamvas = new camvas(ctx, processfn);
    //
    initialized = true;
  }

  btn.onclick = button_callback;
});
