# batchmint-4337

**Account Abstraction token factory (ERC-4337).**

Batch-deploy ERC-20 tokens through a SimpleAccount using **raw UserOperations (no bundler)**.

Stack: **Next.js + TypeScript + viem/wagmi**, **Foundry/Anvil**.

## Live Demo

The dApp is deployed on Vercel: [https://batchmint.vercel.app](https://batchmint.vercel.app)

## Testnet Contracts (Sepolia)

**EntryPoint (v0.8)**: [0x5d4038FC16eaA07Bfc20E09D678301bCd29b2a32](https://sepolia.etherscan.io/address/0x5d4038FC16eaA07Bfc20E09D678301bCd29b2a32)

**SimpleAccountFactory**: [0xadB62ae59Daf7e03ccd960012f0bf80C1bffD218](https://sepolia.etherscan.io/address/0xadB62ae59Daf7e03ccd960012f0bf80C1bffD218)

**BatchMintTokenFactory**: [0xA014fb8dDEc6583Eff1822bE7764f435042DA5b6](https://sepolia.etherscan.io/address/0xA014fb8dDEc6583Eff1822bE7764f435042DA5b6)

## TL;DR — Run Locally

### Prerequisites

- Node 18+ (or 20+), NPM(recommended)/Yarn/PNPM
- Foundry (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)
- `anvil` for a local EVM (comes with Foundry)

### 1) Start Anvil

```bash
anvil

# Grab one of the private keys from the output (for the deployer/EOA)
```

### 2) Deploy Contracts (local)

```bash
# Go to contracts directory
cd contracts

# Build the contracts
forge build

# Run deploy script
# Replace <PK> with the anvil key you copied earlier
forge script script/Deploy.s.sol \
  --rpc-url http://127.0.0.1:8545 --private-key <PK> --broadcast

# Copy the resulting addresses (EntryPoint, SimpleAccountFactory, BatchMintTokenFactory)
```

### 3) Configure the dApp

Create `frontend/.env`:

```
# Locally deployed contracts (fill from your deploy output)
NEXT_PUBLIC_LOCAL_ENTRY_POINT=<0x...>
NEXT_PUBLIC_LOCAL_SIMPLE_ACCOUNT_FACTORY=<0x...>
NEXT_PUBLIC_LOCAL_BATCH_MINT_TOKEN_FACTORY=<0x...>

# Testnet contracts (no need to change)
# The app still works locally even if these variables are not set
NEXT_PUBLIC_TESTNET_ENTRY_POINT=0x5d4038FC16eaA07Bfc20E09D678301bCd29b2a32
NEXT_PUBLIC_TESTNET_SIMPLE_ACCOUNT_FACTORY=0xadB62ae59Daf7e03ccd960012f0bf80C1bffD218
NEXT_PUBLIC_TESTNET_BATCH_MINT_TOKEN_FACTORY=0xA014fb8dDEc6583Eff1822bE7764f435042DA5b6
NEXT_PUBLIC_TESTNET_BATCH_MINT_TOKEN_FACTORY_DEPLOY_BLOCK=9147733
```

### 4) Run the App

```bash
# from repo root

# install packages
npm run setup:app

# start app
npm run start:app

# or: cd frontend && npm install && npm run dev
```

### 5) (Optional) Manual UserOp Tests

Low-level, no-UI manual tests (for fast iteration):

#### 5a) Create `ops/.env`:

```
EOA_PRIVATE_KEY=<grab any anvil PK>

# Locally deployed contracts (fill from your deploy output)
ENTRY_POINT=<0x...>
SIMPLE_ACCOUNT_FACTORY=<0x...>
BATCH_MINT_TOKEN_FACTORY=<0x...>
```

#### 5b) Run the script

```bash
# from repo root

# install packages
npm run setup:ops

# run script
npm run test:ops

# or: cd ops && npm install && npm run dev
```

### Run contract tests

```bash
# from repo root
npm run test:contracts

# or: cd contracts && forge test -vvv
```

### Scripts (at project root, for convenience)

```json
{
  "build:contracts": "cd contracts && forge build",
  "test:contracts": "cd contracts && forge test -vvv",
  "setup:ops": "cd ops && npm install",
  "test:ops": "cd ops && npm run dev",
  "setup:app": "cd frontend && npm install",
  "start:app": "cd frontend && npm run dev"
}
```

### CI

GitHub Actions runs fmt/build/test on contracts

### Dev Chain Resets & “BlockOutOfRange”

If you run a fresh Anvil node and the app (or your browser cache) still has a saved block number from a previous run, you might see errors like:

> `BlockOutOfRangeError: block height is 2 but requested was 15`

**To fix**: In MetaMask, remove and re-add the Localhost/Anvil network (this cleared it for me).

### Wallet & Network Support

This dApp is wired for **MetaMask** by default. No WalletConnect/Coinbase adapters included.

## Core Components

### Contracts

- `contracts/src/BatchMintToken.sol` — Minimal ERC-20 implementation used as the output artifact for batch deployments.
- `contracts/src/BatchMintTokenFactory.sol` — Exposes `deployTokens(params[])` to batch-create multiple ERC-20s in a single operation. Emits `TokenDeployed` and `TokenSkipped` events so the dApp can render results deterministically.

### Utilities (manual testing)

- `ops/src/index.ts` — **Debug sandbox only**. A throwaway ethers-based script that constructs, signs (EIP-712), and submits raw PackedUserOperation objects directly to EntryPoint (no bundler). Useful for debugging gas packing, domain/typed-data, and EntryPoint deposit math outside the UI. It isn’t used by the app, not production-grade, and may drift from the main flow.

### Frontend

Next.js + TypeScript (viem/wagmi) with a provider that drives the AA flow end-to-end.

- **Account init:** On first run, builds `initCode` via `concatHex(factory, encodeFunctionData(createAccount(owner, 0)))`; otherwise uses `"0x"`.
- **Call data:** Encodes `BatchMintTokenFactory.deployTokens(params[])` and wraps it in `SimpleAccount.executeBatch(calls)`.
- **Nonce:** Reads from `EntryPoint.getNonce(sender, 0)`.
- **Gas & fees:** Delegates to **`frontend/src/utils/GasHandler.ts`**. This keeps all AA gas/prefund logic in one place, so that the strategy is easy to tweak or swap for a bundler later.
- **UserOp:** Constructs the 9-field `PackedUserOperation` (empty `paymasterAndData`), then EIP-712 signs the struct over the EntryPoint v0.8 domain.
- **Prefund:** Uses `GasHandler.getRequiredDepositForUserOp(...)` to compute the EntryPoint deposit deficit.
- **Submit:** `simulateContract(handleOps)` → `walletClient.writeContract(sim.request)` → `waitForTransactionReceipt`.
- **Events:** Parses receipt to surface `TokenDeployed` / `TokenSkipped`.
- **UX:** Deterministic flow: `idle → building → signing → simulating-prefund → submitting-prefund → mining-prefund → simulating-handleOps → submitting-handleOps → mining-handleOps → success/error`.

## Reading Resources

The following resources were instrumental in understanding and implementing ERC-4337 AA:

- [https://eips.ethereum.org/EIPS/eip-4337](https://eips.ethereum.org/EIPS/eip-4337)
- [https://docs.erc4337.io/](https://docs.erc4337.io)
- [https://github.com/eth-infinitism/account-abstraction?tab=readme-ov-file](https://github.com/eth-infinitism/account-abstraction?tab=readme-ov-file)
- [https://docs.pimlico.io/references/bundler/entrypoint-errors](https://docs.pimlico.io/references/bundler/entrypoint-errors)
- [https://github.com/ethers-io/ethers.js/issues/555](https://github.com/ethers-io/ethers.js/issues/555)
