# circuits

Expected **`snarkjs`** artifacts (exact names):

- `exam_pass.wasm`
- `exam_pass_final.zkey`

These are tracked with **Git LFS** (see root `.gitattributes`). Large ceremony inputs (`*.ptau`) are gitignored.

The HTTP service defaults **`ZK_WASM_PATH`** / **`ZK_ZKEY_PATH`** to these paths next to `src/` at runtime.
