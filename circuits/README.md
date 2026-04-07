# circuits

Place your proving artifacts here (or mount them via a Railway volume).

Expected files for `snarkjs` mode:

- `exam_pass.wasm`
- `exam_pass_final.zkey`

This repository ignores large artifacts (`*.wasm`, `*.zkey`, `*.ptau`) in git, so this README is kept as a placeholder.

## Docker image path

The `Dockerfile` copies this folder into the container:

- host repo: `circuits/`
- in container: `/app/circuits/`

Example env:

- `ZK_WASM_PATH=/app/circuits/exam_pass.wasm`
- `ZK_ZKEY_PATH=/app/circuits/exam_pass_final.zkey`

## Railway volume path

If you mount a Railway volume instead of baking artifacts into the image, set env vars to the mounted path, for example:

- `ZK_WASM_PATH=/data/circuits/exam_pass.wasm`
- `ZK_ZKEY_PATH=/data/circuits/exam_pass_final.zkey`

Use the same env names either way; only the paths change.
