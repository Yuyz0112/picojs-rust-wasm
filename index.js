const mod = import('./wasm_example');

mod.then((mod) => {
  mod.greet('World');
});
