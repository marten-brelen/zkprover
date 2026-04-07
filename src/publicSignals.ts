import type { Hex } from 'viem'

export function hexToUint256(hex: Hex): bigint {
  return BigInt(hex)
}

export function addressToUint256(address: `0x${string}`): bigint {
  return BigInt(address)
}

export function buildExamPassPublicInputs(params: {
  attemptId: `0x${string}`
  courseTokenId: bigint
  learnerAddress: `0x${string}`
  questionsRoot: `0x${string}`
  passThresholdBps: number
  scoreBps: number
  questionCount: number
  nullifier: `0x${string}`
  commitmentDigest: `0x${string}`
}): bigint[] {
  return [
    hexToUint256(params.attemptId),
    params.courseTokenId,
    addressToUint256(params.learnerAddress),
    hexToUint256(params.questionsRoot),
    BigInt(params.passThresholdBps),
    BigInt(params.scoreBps),
    BigInt(params.questionCount),
    hexToUint256(params.nullifier),
    hexToUint256(params.commitmentDigest),
  ]
}
