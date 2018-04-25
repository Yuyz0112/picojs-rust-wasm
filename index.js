const modPromise = import('./wasm_example');

const img = document.getElementById('image');
const ctx = document.getElementById('canvas').getContext('2d');

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

const width = 225;
const height = 225;

ctx.drawImage(img, 0, 0);
const rgba = ctx.getImageData(0, 0, width, height).data;

Promise.all([
  modPromise,
  fetch('http://localhost:5500/facefinder').then((res) => res.arrayBuffer()),
]).then(([mod, buffer]) => {
  const bytes = new Uint8Array(buffer);
  // 152
  console.time('unpack');
  const pico = mod.Pico.new();
  pico.unpack_cascade(bytes);
  console.timeEnd('unpack');

  // max_size: f32, min_size: f32, scale_factor: f32, shift_factor: f32
  const params = mod.RunParams.new(1000, 20, 1.1, 0.1);

  // ldim: i32, ncols: usize, nrows: usize, pixels: Vec<u8>
  const image = mod.Image.new(
    height,
    height,
    width,
    rgba_to_grayscale(rgba, width, height)
  );

  // image: &Image, params: &RunParams
  console.time('dets');
  pico.run_cascade(image, params);
  console.timeEnd('dets');

  // iou_threshold: f32
  const dets = pico.cluster_detections(0.2);

  qthresh = 5.0;
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
});
