## medoxie-exam-zk-prover

Small Node 20 + TypeScript HTTP service for Medoxie exam-pass Groth16 proofs on Railway/Docker.

### Endpoints

- `GET /healthz` and `GET /` for health.
- `POST /exam-pass` only (same request contract as Medoxie `lib/zk/proof.ts`).

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
  "mode": "mock"
}
```

### Modes

- `ZK_PROVER_IMPLEMENTATION=mock`  
  Returns `proof: "0x01"` and uses `buildExamPassPublicInputs`.
- `ZK_PROVER_IMPLEMENTATION=snarkjs`  
  Runs `snarkjs.groth16.fullProve` and requires:
  - `ZK_WASM_PATH`
  - `ZK_ZKEY_PATH`

### Optional Auth

If `ZK_PROVER_AUTH_TOKEN` is set, calls to `POST /exam-pass` must include:

`Authorization: Bearer <token>`

### Railway / Docker env notes

- Service binds to `0.0.0.0` and `process.env.PORT` (Railway-compatible).
- If artifacts are copied into the image under `/app/circuits`, set:
  - `ZK_WASM_PATH=/app/circuits/exam_pass.wasm`
  - `ZK_ZKEY_PATH=/app/circuits/exam_pass_final.zkey`

If you use a Railway volume instead, point env vars at mounted paths (for example `/data/circuits/exam_pass.wasm` and `/data/circuits/exam_pass_final.zkey`).

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
