# picojs-rust-wasm

> This project is a Rust webassembly implementation of picojs.

Recently I found a great project [picojs](https://github.com/tehnokv/picojs) on Github, which is a mini face detection library written in JavaScript.

Since I'm a front-end engineer who is keen on Rust, I decided to implement picojs in rust and portal it to the browser via webassembly. I use [wasm-bindgen](https://github.com/rustwasm/wasm-bindgen) to interact between Rust and JavaScript.

## What I already learned

1.  The basic workflow of writing a webassembly module in rust.
2.  Some pattern of interact between Rust and JavaScript in webassembly.

## Todo

I think webassembly has a great potential in this application. Although I'm just a beginner of Rust, the webassembly module I wrote seems to be two times faster than the JavaScript version in some basic tests. So there must be a lot of improvements can be done.

1.  Add a comprehensive performance stats or benchmark, compare to the JavaScript version and the C webassembly version.
2.  Improve the quality of Rust part code.
