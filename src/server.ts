import http from 'node:http'
import { promises as fs } from 'node:fs'
import * as snarkjs from 'snarkjs'
import { toHex } from 'viem'
import { buildExamPassPublicInputs } from './publicSignals.js'

type ProverRequest = {
  attemptId: `0x${string}`
  courseTokenId: string
  learnerAddress: `0x${string}`
  questionsRoot: `0x${string}`
  passThresholdBps: number
  scoreBps: number
  questionCount: number
  nullifier: `0x${string}`
  commitmentDigest: `0x${string}`
}

function isHex32(value: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(value)
}

function isAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value)
}

function isPositiveIntegerString(value: string): boolean {
  return /^[0-9]+$/.test(value) && BigInt(value) > 0n
}

function json(res: http.ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Connection', 'close')
  res.end(JSON.stringify(body))
}

function parseBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

const EXPECTED_PUBLIC_INPUTS = 9

async function runSnarkjsProver(input: ProverRequest): Promise<{
  proof: `0x${string}`
  publicInputs: bigint[]
}> {
  const wasmPath = process.env.ZK_WASM_PATH
  const zkeyPath = process.env.ZK_ZKEY_PATH
  if (!wasmPath || !zkeyPath) {
    throw new Error('snarkjs mode requires ZK_WASM_PATH and ZK_ZKEY_PATH.')
  }
  await fs.access(wasmPath)
  await fs.access(zkeyPath)

  // Keep these keys aligned to your circuit's `signal input` names.
  const witnessInput: Record<string, string> = {
    attemptId: BigInt(input.attemptId).toString(),
    courseTokenId: input.courseTokenId,
    learnerAddress: BigInt(input.learnerAddress).toString(),
    questionsRoot: BigInt(input.questionsRoot).toString(),
    passThresholdBps: String(input.passThresholdBps),
    scoreBps: String(input.scoreBps),
    questionCount: String(input.questionCount),
    nullifier: BigInt(input.nullifier).toString(),
    commitmentDigest: BigInt(input.commitmentDigest).toString(),
  }

  const timeoutMs = Number(process.env.ZK_SNARKJS_TIMEOUT_MS || 120000)
  const proofPromise = snarkjs.groth16.fullProve(witnessInput, wasmPath, zkeyPath)
  const { proof, publicSignals } = (await Promise.race([
    proofPromise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`groth16.fullProve timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ])) as { proof: unknown; publicSignals: string[] }

  if (!Array.isArray(publicSignals) || publicSignals.length !== EXPECTED_PUBLIC_INPUTS) {
    throw new Error(
      `snarkjs produced ${publicSignals?.length ?? 0} public inputs; expected ${EXPECTED_PUBLIC_INPUTS}.`
    )
  }

  return {
    proof: toHex(JSON.stringify(proof)),
    publicInputs: publicSignals.map((v) => BigInt(v)),
  }
}

async function handleExamPass(input: ProverRequest): Promise<{
  proof: `0x${string}`
  publicInputs: bigint[]
  mode: 'http' | 'mock'
}> {
  const mode = String(process.env.ZK_PROVER_IMPLEMENTATION || 'snarkjs').trim().toLowerCase()
  if (mode === 'snarkjs') {
    const out = await runSnarkjsProver(input)
    return { ...out, mode: 'http' }
  }

  const publicInputs = buildExamPassPublicInputs({
    attemptId: input.attemptId,
    courseTokenId: BigInt(input.courseTokenId),
    learnerAddress: input.learnerAddress,
    questionsRoot: input.questionsRoot,
    passThresholdBps: input.passThresholdBps,
    scoreBps: input.scoreBps,
    questionCount: input.questionCount,
    nullifier: input.nullifier,
    commitmentDigest: input.commitmentDigest,
  })

  return { proof: '0x01', publicInputs, mode: 'mock' }
}

const authToken = String(process.env.ZK_PROVER_AUTH_TOKEN || '')

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && (req.url === '/healthz' || req.url === '/')) {
      return json(res, 200, {
        ok: true,
        service: 'medoxie-exam-zk-prover',
        implementation: process.env.ZK_PROVER_IMPLEMENTATION || 'snarkjs',
        hasWasm: Boolean(process.env.ZK_WASM_PATH),
        hasZkey: Boolean(process.env.ZK_ZKEY_PATH),
      })
    }

    if (req.method !== 'POST' || req.url !== '/exam-pass') {
      return json(res, 404, { error: 'Not found' })
    }

    if (authToken) {
      const bearer = String(req.headers.authorization || '')
      if (bearer !== `Bearer ${authToken}`) {
        return json(res, 401, { error: 'Unauthorized' })
      }
    }

    const body = (await parseBody(req)) as Partial<ProverRequest>
    const attemptId = String(body.attemptId || '')
    const learnerAddress = String(body.learnerAddress || '')
    const questionsRoot = String(body.questionsRoot || '')
    const nullifier = String(body.nullifier || '')
    const commitmentDigest = String(body.commitmentDigest || '')
    const courseTokenId = String(body.courseTokenId || '')
    const passThresholdBps = Number(body.passThresholdBps || 0)
    const scoreBps = Number(body.scoreBps || 0)
    const questionCount = Number(body.questionCount || 0)

    if (
      !isHex32(attemptId) ||
      !isAddress(learnerAddress) ||
      !isHex32(questionsRoot) ||
      !isHex32(nullifier) ||
      !isHex32(commitmentDigest)
    ) {
      return json(res, 400, { error: 'Invalid prover payload.' })
    }

    if (!isPositiveIntegerString(courseTokenId)) {
      return json(res, 400, { error: 'Invalid courseTokenId.' })
    }

    if (!Number.isInteger(passThresholdBps) || passThresholdBps < 0 || passThresholdBps > 10000) {
      return json(res, 400, { error: 'Invalid passThresholdBps.' })
    }

    if (!Number.isInteger(scoreBps) || scoreBps < 0 || scoreBps > 10000) {
      return json(res, 400, { error: 'Invalid scoreBps.' })
    }

    if (!Number.isInteger(questionCount) || questionCount <= 0) {
      return json(res, 400, { error: 'Invalid questionCount.' })
    }

    const output = await handleExamPass({
      attemptId: attemptId as `0x${string}`,
      courseTokenId,
      learnerAddress: learnerAddress as `0x${string}`,
      questionsRoot: questionsRoot as `0x${string}`,
      passThresholdBps,
      scoreBps,
      questionCount,
      nullifier: nullifier as `0x${string}`,
      commitmentDigest: commitmentDigest as `0x${string}`,
    })

    return json(res, 200, {
      proof: output.proof,
      publicInputs: output.publicInputs.map((v) => v.toString()),
      mode: output.mode,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal prover error'
    console.error('[exam-pass]', message)
    return json(res, 500, { error: message })
  }
})

const port = Number(process.env.PORT || process.env.ZK_PROVER_PORT || 8787)
server.listen(port, '0.0.0.0', () => {
  console.log(`medoxie-exam-zk-prover http://0.0.0.0:${port}`)
})
