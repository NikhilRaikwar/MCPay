import OpenAI from 'openai'
import fetch from 'node-fetch'
import { execSync } from 'child_process'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { Client as XmtpClient, IdentifierKind } from '@xmtp/node-sdk'
import { Wallet } from 'ethers'
import * as crypto from 'node:crypto'
import * as fs from 'fs'

// Load .env from root
dotenv.config({ path: path.join(__dirname, '../../../.env') })

// ==========================================
// CONFIG
// ==========================================
const OWS_BIN = "/mnt/d/ows hackathon/ows/target/debug/ows"
const AGENT_WALLET_NAME = process.env.OWS_WALLET_NAME || 'mcpay-agent'
const TOOL_SERVER = 'http://localhost:3001'
const BASE_URL = process.env.ANTHROPIC_BASE_URL || 'https://api.aimlapi.com/v1'
const MODEL = process.env.ANTHROPIC_MODEL || 'anthropic/claude-opus-4-6'

const openai = new OpenAI({
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseURL: BASE_URL
})

async function sendXmtpReceipt(message: string) {
  if (!process.env.XMTP_PRIVATE_KEY) {
    console.log('[XMTP] Skip: No private key provided for XMTP receipts')
    return
  }
  
  try {
    const wallet = new Wallet(process.env.XMTP_PRIVATE_KEY)
    const signer = {
      type: 'EOA' as const,
      getIdentifier: () => ({
        identifier: wallet.address.toLowerCase(),
        identifierKind: IdentifierKind.Ethereum,
      }),
      signMessage: async (msg: string): Promise<Uint8Array> => {
        const sig = await wallet.signMessage(msg)
        return Buffer.from(sig.slice(2), 'hex')
      },
    }

    // Stable DB encryption key
    const dbEncryptionKey = crypto.createHash('sha256').update(process.env.XMTP_PRIVATE_KEY).digest()
    
    // NUCLEAR FIX: Delete existing .xmtp folder to avoid PRAGMA issues
    // Check both local and workspace root for the database folder
    const pathsToClean = [
        path.join(process.cwd(), '.xmtp'),
        path.join(__dirname, '../.xmtp')
    ]
    
    pathsToClean.forEach(p => {
        if (fs.existsSync(p)) {
            try {
                fs.rmSync(p, { recursive: true, force: true })
                console.log(`[XMTP] Cleaned up existing database at ${p}`)
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    })

    const client = await XmtpClient.create(signer, { 
      dbEncryptionKey
    })
    console.log(`[XMTP] Client created for ${wallet.address}`)
    
    const recipient = process.env.RECEIPT_RECIPIENT_ADDRESS || wallet.address
    const dm = await client.conversations.fetchDmByIdentifier({
      identifier: recipient,
      identifierKind: IdentifierKind.Ethereum,
    })
    
    if (dm) {
      await dm.sendText(message)
      console.log(`[XMTP] Receipt sent to ${recipient}`)
    } else {
      console.log(`[XMTP] Could not create DM with ${recipient}`)
    }
  } catch (e) {
    console.error(`[XMTP] Error: ${e}`)
  }
}

async function owsFetch(url: string, options: any) {
  const resp = await fetch(url, options)
  
  if (resp.status === 402) {
    console.log(`\n[OWS] Payment Required (402) from ${url}`)
    console.log(`   [OWS] Attempting to pay with wallet: ${AGENT_WALLET_NAME}...`)
    
    try {
      const owsOutput = execSync(
        `"${OWS_BIN}" pay request "${url}" --wallet ${AGENT_WALLET_NAME} --method ${options.method || 'POST'} --body '${options.body || ''}'`,
        { encoding: 'utf-8' }
      )
      console.log(`   [OWS] Settlement Success!`)
      
      const endpointName = url.split('/').pop()
      const receiptMsg = `
--- MCPay Settlement Receipt ---
Tool Called: ${endpointName}
Status: Succeeded (x402)
Payment Network: Base Sepolia (eip155:84532)
Agent Identity: ${AGENT_WALLET_NAME}
--------------------------------
      `.trim()
      
      // Send XMTP receipt with rich structure
      await sendXmtpReceipt(receiptMsg)
      
      return {
          status: 200,
          json: async () => JSON.parse(owsOutput)
      } as any
    } catch (e: any) {
      console.error(`   [OWS] Settlement Failed: ${e.message}`)
      throw e
    }
  }
  
  return resp
}

// ==========================================
// TOOLS
// ==========================================
const tools: any[] = [
  {
    type: "function",
    function: {
      name: 'get_weather',
      description: 'Get real-time weather for a city. Costs $0.01 per call (paid via OWS)',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'City name' }
        },
        required: ['city']
      }
    }
  },
  {
    type: "function",
    function: {
      name: 'summarize_url',
      description: 'Summarize a webpage. Costs $0.02 per call (paid via OWS)',
      parameters: {
        type: 'object', 
        properties: {
          url: { type: 'string', description: 'URL to summarize' }
        },
        required: ['url']
      }
    }
  },
  {
    type: "function",
    function: {
      name: 'check_portfolio',
      description: 'Check crypto portfolio value for a wallet address via Zerion API. Costs $0.05 per call (paid via OWS)',
      parameters: {
        type: 'object', 
        properties: {
          address: { type: 'string', description: 'Ethereum/EVM wallet address' }
        },
        required: ['address']
      }
    }
  }
]

async function runAgent(userQuery: string) {
  console.log(`\nAgent starting (Model: ${MODEL})`)
  console.log(`Query: "${userQuery}"`)
  
  const messages: any[] = [{ role: 'user', content: userQuery }]
  
  while (true) {
    const response = await (openai.chat.completions.create({
      model: MODEL,
      messages,
      tools
    } as any) as any)
    
    const message = response.choices[0].message
    
    if (message.tool_calls) {
      messages.push({
          role: 'assistant',
          content: message.content || null,
          tool_calls: message.tool_calls
      })
      
      for (const toolCall of (message.tool_calls as any[])) {
        console.log(`\nTool suggested: ${toolCall.function.name}`)
        const args = JSON.parse(toolCall.function.arguments)
        
        let result: any
        if (toolCall.function.name === 'get_weather') {
          result = await (await owsFetch(`${TOOL_SERVER}/tools/weather-data`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ city: args.city })
          })).json()
        } else if (toolCall.function.name === 'summarize_url') {
          result = await (await owsFetch(`${TOOL_SERVER}/tools/url-summarizer`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: args.url })
          })).json()
        } else if (toolCall.function.name === 'check_portfolio') {
          result = await (await owsFetch(`${TOOL_SERVER}/tools/check-portfolio`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ address: args.address })
          })).json()
        }
        
        console.log(`   Result received: ${JSON.stringify(result).substring(0, 50)}...`)
        
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify(result)
        })
      }
    } else {
      console.log(`\nFinal Response:\n${message.content}\n`)
      return
    }
  }
}

const query = process.argv[2] || "What is the weather in Delhi?"
runAgent(query).catch(console.error)
