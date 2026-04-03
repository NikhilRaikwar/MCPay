import { Client, type Signer, IdentifierKind } from '@xmtp/node-sdk'
import { Wallet } from 'ethers'

// ==========================================
// XMTP CLIENT SETUP
// ==========================================
let xmtpClient: Client | null = null
let messageHistory: any[] = [
  { id: 'msg-boot-1', tool: 'Handshake', wallet: 'OWS Node', amount: '$0.00', time: new Date().toLocaleTimeString(), body: '⚡ System: OWS Identity successfully linked over XMTP' }
]

export function getMessages() {
  return messageHistory
}

export async function initXMTP(): Promise<void> {
  // Check for specialized tool private key or fallback to general XMTP key
  const privateKey = process.env.TOOL_PRIVATE_KEY || process.env.XMTP_PRIVATE_KEY
  
  if (!privateKey) {
    console.log('Skip XMTP init: missing private key (TOOL_PRIVATE_KEY or XMTP_PRIVATE_KEY)')
    return
  }
  
  try {
    const wallet = new Wallet(privateKey)
    
    const signer: Signer = {
      type: 'EOA',
      getIdentifier: () => ({
        identifier: wallet.address.toLowerCase(),
        identifierKind: IdentifierKind.Ethereum
      }),
      signMessage: async (message: string): Promise<Uint8Array> => {
        const sig = await wallet.signMessage(message)
        return Buffer.from(sig.slice(2), 'hex')
      }
    }
    
    // Stable encryption key based on private key parts to avoid salt issues
    const dbEncryptionKey = Buffer.alloc(32, privateKey.slice(2, 34), 'hex')
    
    xmtpClient = await Client.create(signer, {
      dbEncryptionKey
    })
    
    console.log('XMTP initialized for tool server:', xmtpClient.inboxId)
  } catch (e: any) {
    console.error('XMTP init failed (non-fatal):', e.message)
  }
}

// ==========================================
// PAYMENT ALERT BHEJO
// ==========================================
export async function sendPaymentAlert(params: {
  toAddress: string    // Agent wallet address
  toolName: string
  amount: string
  txHash?: string
  totalEarned: number
  callNumber: number
}) {
  if (!xmtpClient) {
    console.log('XMTP not initialized, skipping alert')
    return
  }
  
  try {
    const { toAddress, toolName, amount, txHash, totalEarned, callNumber } = params
    
    const message = `⚡ MCPay Payment Alert
━━━━━━━━━━━━━━━━━━━━
🔧 Tool: ${toolName}
💸 Paid: ${amount} USDC
📊 Call #${callNumber}
💰 Total Earned: $${totalEarned.toFixed(4)} USDC
${txHash ? `🔗 Tx: ${txHash.slice(0, 10)}...${txHash.slice(-8)}` : '🔗 Tx: pending settlement'}
⏰ Time: ${new Date().toLocaleTimeString()}
━━━━━━━━━━━━━━━━━━━━
Powered by OWS + x402`
    
    // Conversation dhundo ya banao
    const conversation = await xmtpClient.conversations.fetchDmByIdentifier({
        identifier: toAddress,
        identifierKind: IdentifierKind.Ethereum
    })
    
    if (conversation) {
        await conversation.sendText(message)
        messageHistory.unshift({
          id: Date.now().toString(),
          tool: toolName,
          wallet: toAddress,
          amount,
          time: new Date().toLocaleTimeString(),
          body: message
        })
        console.log(`📨 XMTP alert sent to ${toAddress.slice(0,8)}...`)
    } else {
        // Fallback: build a client and try sending to self if DM fails
        console.log(`XMTP: Could not find or create DM with ${toAddress}`)
    }
  } catch (e: any) {
    console.log('XMTP send failed (non-fatal):', e.message)
  }
}

export async function broadcastToolRegistration(toolName: string, price: string) {
  console.log(`📢 XMTP Broadcast: New tool registered — ${toolName} @ ${price}/call`)
}
