/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
    NEXT_PUBLIC_PAYHUB_CONTRACT: process.env.NEXT_PUBLIC_PAYHUB_CONTRACT || "",
    NEXT_PUBLIC_ATOKEN_ADDRESS: process.env.NEXT_PUBLIC_ATOKEN_ADDRESS || "",
    NEXT_PUBLIC_CHAIN_ID: "10143",
    NEXT_PUBLIC_CHAIN_NAME: "Monad Testnet",
    NEXT_PUBLIC_RPC: "https://testnet-rpc.monad.xyz",
  },
};
module.exports = nextConfig;
