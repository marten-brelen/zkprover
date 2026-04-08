# circuits

Expected **`snarkjs`** artifacts (exact names):

- `exam_pass.wasm`
- `exam_pass_final.zkey`

These files are **not tracked in git**. They are stored in the Railway persistent volume **`zkprover-circuits`**, mounted at `/app/circuits` at runtime.

To populate the volume, upload the artifacts directly to the Railway volume at `/app/circuits/exam_pass.wasm` and `/app/circuits/exam_pass_final.zkey`.

The HTTP service defaults **`ZK_WASM_PATH`** / **`ZK_ZKEY_PATH`** to these paths at runtime, so you usually do not need to set env vars on Railway.
