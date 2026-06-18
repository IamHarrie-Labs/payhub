/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_PAYHUB_CONTRACT: process.env.NEXT_PUBLIC_PAYHUB_CONTRACT || "",
    NEXT_PUBLIC_ATOKEN_ADDRESS:  process.env.NEXT_PUBLIC_ATOKEN_ADDRESS  || "",
    NEXT_PUBLIC_CHAIN_ID:        "10143",
    NEXT_PUBLIC_CHAIN_NAME:      "Monad Testnet",
    NEXT_PUBLIC_RPC:             "https://testnet-rpc.monad.xyz",
    NEXT_PUBLIC_ARBITER_TOKEN:   process.env.NEXT_PUBLIC_ARBITER_TOKEN   || "demo_arbiter_token",
  },
  // Allow ethers.js in API routes
  serverExternalPackages: ["ethers"],
};
module.exports = nextConfig;
