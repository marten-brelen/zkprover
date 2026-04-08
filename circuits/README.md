# circuits

Expected **`snarkjs`** artifacts (exact names):

- `exam_pass.wasm`
- `exam_pass_final.zkey`

They are tracked with **Git LFS** (see root `.gitattributes` and **README.md** → **Ship proving artifacts**). Large ceremony files (`*.ptau`) stay gitignored.

The HTTP service defaults **`ZK_WASM_PATH`** / **`ZK_ZKEY_PATH`** to these paths next to `src/` at runtime, so you usually do not set env vars on Railway.
