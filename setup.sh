#!/bin/bash

# OWS setup script for MCPAY Hackathon
# Automatically finds the compiled OWS binary

# Resolve the absolute path to your binary
OWS_BIN="/mnt/d/ows hackathon/ows/target/debug/ows"

# Function to run ows with the correct path
run_ows() {
  "$OWS_BIN" "$@"
}

echo "🚀 Setting up OWS wallets for MCPAY..."

# 1. Create the Agent Wallet
echo "--- Creating Agent Wallet ---"
run_ows wallet create --name mcpay-agent

# 2. Create the Tool Developer Wallet
echo "--- Creating Tool Wallet ---"
run_ows wallet create --name tool-wallet

# 3. List wallets to confirm
run_ows wallet list

# 4. Create a spending policy for the Agent
echo '{
  "id": "mcpay-agent-policy",
  "name": "MCPay Agent Spending Limit",
  "version": 1,
  "created_at": "2026-04-03T10:00:00Z",
  "rules": [
    { "type": "allowed_chains", "chain_ids": ["eip155:84532"] }
  ],
  "action": "deny"
}' > mcpay-policy.json

echo "--- Registering Policy ---"
run_ows policy create --file mcpay-policy.json

# 5. Create an API Key for the Agent
echo "--- Creating API Key ---"
run_ows key create --name mcpay-key --wallet mcpay-agent --policy "mcpay-agent-policy"

echo "\n✅ OWS setup complete!"
echo "💰 Next step: Fund your 'mcpay-agent' wallet with Base Sepolia USDC."
echo "🔗 Faucet: https://faucet.circle.com"
echo "   (Get your address via: ows wallet info --name mcpay-agent)"
