import { z } from "zod";

import type { DeploymentManifest, DeploymentTargetInput } from "../utils/deployments.js";

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Expected EVM address.");
const privateKeySchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Expected 32-byte private key.");

export const deploymentTargetAddressesSchema = z.object({
  vault: addressSchema,
  manager: addressSchema,
  token0: addressSchema,
  token1: addressSchema,
  weth9: addressSchema,
  stk: addressSchema.optional(),
  factory: addressSchema.optional(),
  swapRouter: addressSchema.optional(),
  positionManager: addressSchema.optional(),
  quoterV2: addressSchema.optional()
});

export const deploymentTargetMetadataSchema = z.object({
  networkName: z.string().min(1).optional(),
  chainId: z.number().int().positive().optional(),
  rpcUrl: z.string().url().optional(),
  poolFee: z.number().int().positive().optional(),
  minimumRebalanceInterval: z.number().int().nonnegative().optional()
}).optional();

export const deploymentTargetSchema = z.object({
  profileId: z.string().min(1).optional(),
  deploymentsFile: z.string().min(1).optional(),
  manifest: z.custom<DeploymentManifest>((value) => typeof value === "object" && value !== null).optional(),
  addresses: deploymentTargetAddressesSchema.optional(),
  metadata: deploymentTargetMetadataSchema
}).optional();

const envSignerAuthSchema = z.object({
  policy: z.literal("env-signer").optional()
});

const requestSignerAuthSchema = z.object({
  policy: z.literal("request-signer"),
  signerPrivateKey: privateKeySchema
});

const delegatedAuthSchema = z.object({
  policy: z.literal("delegated"),
  executorAddress: addressSchema
});

export const executionAuthSchema = z.union([
  envSignerAuthSchema,
  requestSignerAuthSchema,
  delegatedAuthSchema
]).optional();

export type ExecutionAuthInput = z.infer<typeof executionAuthSchema>;

export type ValidatedDeploymentTargetInput = z.infer<typeof deploymentTargetSchema> & DeploymentTargetInput;

export function resolveExecutionPolicy(auth?: ExecutionAuthInput): "env-signer" | "request-signer" | "delegated" {
  return auth?.policy ?? "env-signer";
}

export type { DeploymentTargetInput } from "../utils/deployments.js";
