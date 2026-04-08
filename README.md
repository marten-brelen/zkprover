## medoxie-exam-zk-prover

Small Node 20 + TypeScript HTTP service for Medoxie exam-pass Groth16 proofs on Railway/Docker.

### Ship proving artifacts (Railway volume)

Proving keys live at **`/app/circuits/exam_pass.wasm`** and **`/app/circuits/exam_pass_final.zkey`** (names must match exactly). They are stored in the Railway persistent volume **`zkprover-circuits`**, mounted at `/app/circuits` — they are **not tracked in git**.

To populate the volume for the first time (or to update artifacts):

1. Build or obtain **`exam_pass.wasm`** and **`exam_pass_final.zkey`**.
2. Upload them directly to the Railway volume at `/app/circuits/` using the Railway CLI or the Railway dashboard volume file browser.

The `circuits/` directory is gitignored. Do not commit binary artifacts to the repository.

**Railway:** You do **not** need **`ZK_WASM_PATH`** / **`ZK_ZKEY_PATH`** unless you want to override defaults. The server resolves defaults relative to `src/server.ts`: `../circuits/exam_pass.wasm` and `../circuits/exam_pass_final.zkey` (works with `tsx` and typical Docker layouts).

### Endpoints

- `GET /healthz` and `GET /` for health.
- `POST /exam-pass` only (same request contract as Medoxie `lib/zk/proof.ts`).

#### `GET /healthz` response (snarkjs)

When `ZK_PROVER_IMPLEMENTATION` is `snarkjs` (or unset; default is snarkjs), the server checks that `ZK_WASM_PATH` and `ZK_ZKEY_PATH` point to **readable files** (including repo defaults when env is unset):

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
  Runs `snarkjs.groth16.fullProve` using **`ZK_WASM_PATH`** and **`ZK_ZKEY_PATH`** (defaults: **`circuits/exam_pass.wasm`** and **`circuits/exam_pass_final.zkey`** next to published `src/`).
- `ZK_PROVER_IMPLEMENTATION=mock`  
  Returns `proof: "0x01"` and uses `buildExamPassPublicInputs`.

### Optional Auth

If `ZK_PROVER_AUTH_TOKEN` is set, calls to `POST /exam-pass` must include:

`Authorization: Bearer <token>`

### Railway / env notes

- Service binds to `0.0.0.0` and `process.env.PORT` (Railway-compatible).
- In **production** with **snarkjs**, if either artifact path is missing or unreadable at startup, the process **exits with code 1** so deploys fail fast instead of returning 500 on every `/exam-pass`.
- Binary artifacts (`circuits/`) are **not** in the repository. They are served from the Railway persistent volume `zkprover-circuits` mounted at `/app/circuits`.
- This repo includes `nixpacks.toml` for build phases:
  - Install: `npm install` (avoids `npm ci` cache-mount `EBUSY` issue in Railpack Docker builds)
  - Build: `npm run typecheck`
  - Start: `npm run start`

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
