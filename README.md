## medoxie-exam-zk-prover

Small Node 20 + TypeScript HTTP service for Medoxie exam-pass Groth16 proofs on Railway/Docker.

### Endpoints

- `GET /healthz` and `GET /` for health.
- `POST /exam-pass` only (same request contract as Medoxie `lib/zk/proof.ts`).

#### `GET /healthz` response (snarkjs)

When `ZK_PROVER_IMPLEMENTATION` is `snarkjs` (or unset; default is snarkjs), the server checks that `ZK_WASM_PATH` and `ZK_ZKEY_PATH` point to **readable files**:

- `wasmExists` — `true` if the wasm path exists and is readable.
- `zkeyExists` — `true` if the zkey path exists and is readable.
- `snarkjsArtifactsReady` — `true` when both are present (use this as a readiness hint on Railway).

In **mock** mode, `wasmExists` and `zkeyExists` stay `false` (no filesystem probe for proving keys).

### Request Body (`POST /exam-pass`)

```json
{
  "attemptId": "0x...",
  "courseTokenId": "1",
  "learnerAddress": "0x...",
  "questionsRoot": "0x...",
  "passThresholdBps": 6000,
  "scoreBps": 8000,
  "questionCount": 20,
  "nullifier": "0x...",
  "commitmentDigest": "0x..."
}
```

### Response Shape

```json
{
  "proof": "0x...",
  "publicInputs": ["...9 strings total..."],
  "mode": "http"
}
```

### Modes

Default when `ZK_PROVER_IMPLEMENTATION` is unset is **snarkjs** (real proofs).

- `ZK_PROVER_IMPLEMENTATION=snarkjs`  
  Runs `snarkjs.groth16.fullProve` and requires:
  - `ZK_WASM_PATH`
  - `ZK_ZKEY_PATH`
- `ZK_PROVER_IMPLEMENTATION=mock`  
  Returns `proof: "0x01"` and uses `buildExamPassPublicInputs`.

### Optional Auth

If `ZK_PROVER_AUTH_TOKEN` is set, calls to `POST /exam-pass` must include:

`Authorization: Bearer <token>`

### Railway deploy checklist

**A plain git deploy is not enough:** `.wasm` / `.zkey` are gitignored, so the Docker build only copies whatever is under `circuits/` at build time (often just `README.md`). You must deliver `exam_pass.wasm` and `exam_pass_final.zkey` by **one** of the following.

#### Primary: persistent volume (good for large binaries)

1. In Railway, add a **volume** mounted at e.g. `/data/circuits`.
2. One-time: upload `exam_pass.wasm` and `exam_pass_final.zkey` onto that volume (Railway shell, `scp`/`rsync`, or a small init job).
3. Set environment variables:

   - `ZK_WASM_PATH=/data/circuits/exam_pass.wasm`
   - `ZK_ZKEY_PATH=/data/circuits/exam_pass_final.zkey`

4. Keep `ZK_PROVER_IMPLEMENTATION` unset or `snarkjs`.
5. Redeploy or restart so the service sees the files.

#### Alternative: bake artifacts into the image (CI-friendly)

1. Run your Circom/snarkjs pipeline in CI (or locally) and produce `exam_pass.wasm` and `exam_pass_final.zkey`.
2. Before `docker build`, place those files under `circuits/` in the build context (or download them from GitHub Actions artifacts, S3, etc. in a CI step — do not commit large binaries to git unless you use Git LFS).
3. The Dockerfile `COPY circuits ./circuits` will include them at `/app/circuits/` in the image.
4. Set:

   - `ZK_WASM_PATH=/app/circuits/exam_pass.wasm`
   - `ZK_ZKEY_PATH=/app/circuits/exam_pass_final.zkey`

### Railway / Docker env notes

- Service binds to `0.0.0.0` and `process.env.PORT` (Railway-compatible).
- Paths in `ZK_WASM_PATH` / `ZK_ZKEY_PATH` must match where files actually live at runtime (volume vs image).

### Verify after deploy

1. `GET /healthz` — confirm `snarkjsArtifactsReady` is `true` (and `wasmExists` / `zkeyExists` are `true`).
2. `POST /exam-pass` with a valid JSON body; if `ZK_PROVER_AUTH_TOKEN` is set, include `Authorization: Bearer <token>`. Expect **200** with `proof`, nine `publicInputs`, and `mode: "http"`.

### curl Example

```bash
curl -X POST "http://localhost:8787/exam-pass" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ZK_PROVER_AUTH_TOKEN" \
  -d '{
    "attemptId":"0x1111111111111111111111111111111111111111111111111111111111111111",
    "courseTokenId":"1",
    "learnerAddress":"0x2222222222222222222222222222222222222222",
    "questionsRoot":"0x3333333333333333333333333333333333333333333333333333333333333333",
    "passThresholdBps":6000,
    "scoreBps":8000,
    "questionCount":20,
    "nullifier":"0x4444444444444444444444444444444444444444444444444444444444444444",
    "commitmentDigest":"0x5555555555555555555555555555555555555555555555555555555555555555"
  }'
```
