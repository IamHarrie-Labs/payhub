"use client";
import Link from "next/link";

const AMBER  = "#E8A020";
const INK    = "#0D1117";
const MUTED  = "#5B6470";
const BORDER = "#E8E7E2";
const CREAM  = "#FAF9F6";
const GREEN  = { text:"#1B7A4B", bg:"#E9F7EF", border:"#BBE5CF" };

function Code({ children }) {
  return <code style={{ fontFamily:"monospace",fontSize:13,background:CREAM,border:`1px solid ${BORDER}`,borderRadius:5,padding:"2px 7px",color:"#C8841A" }}>{children}</code>;
}

function Block({ children }) {
  return (
    <pre style={{ background:"#0D1117",color:"#E8E7E2",borderRadius:12,padding:"20px 22px",fontSize:13,lineHeight:1.7,overflowX:"auto",fontFamily:"monospace",margin:"12px 0 0" }}>
      {children}
    </pre>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom:48 }}>
      <h2 style={{ fontSize:22,fontWeight:700,letterSpacing:"-.5px",marginBottom:16,paddingBottom:12,borderBottom:`1px solid ${BORDER}` }}>{title}</h2>
      {children}
    </div>
  );
}

function Endpoint({ method, path, desc }) {
  const colors = { POST:"#3B82F6", GET:"#22A05E", DELETE:"#B91C1C" };
  return (
    <div style={{ display:"flex",alignItems:"flex-start",gap:12,padding:"12px 16px",border:`1px solid ${BORDER}`,borderRadius:10,marginBottom:8,background:"#fff" }}>
      <span style={{ fontSize:11,fontWeight:800,color:"#fff",background:colors[method]||MUTED,padding:"3px 8px",borderRadius:5,flexShrink:0,letterSpacing:".3px" }}>{method}</span>
      <div>
        <code style={{ fontSize:13.5,fontFamily:"monospace",color:INK,fontWeight:600 }}>{path}</code>
        <div style={{ fontSize:13,color:MUTED,marginTop:3 }}>{desc}</div>
      </div>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div style={{ background:"#fff",color:INK,minHeight:"100vh",fontFamily:"'Space Grotesk',system-ui,sans-serif" }}>

      {/* NAV */}
      <nav style={{ position:"sticky",top:0,zIndex:100,background:"rgba(255,255,255,.92)",backdropFilter:"saturate(180%) blur(14px)",borderBottom:`1px solid ${BORDER}` }}>
        <div style={{ maxWidth:900,margin:"0 auto",padding:"0 24px",height:64,display:"flex",alignItems:"center",justifyContent:"space-between",gap:16 }}>
          <Link href="/" style={{ display:"flex",alignItems:"baseline",textDecoration:"none",color:INK,fontSize:22,letterSpacing:"-1px" }}>
            <span style={{ fontWeight:300 }}>Pay</span><span style={{ fontWeight:700 }}>Hub</span>
            <span style={{ width:6,height:6,borderRadius:"50%",background:AMBER,display:"inline-block",marginLeft:3,marginBottom:4,alignSelf:"flex-end" }} />
          </Link>
          <div style={{ display:"flex",alignItems:"center",gap:20,fontSize:14,color:MUTED }}>
            <Link href="/demo" style={{ textDecoration:"none",color:MUTED,fontWeight:500,transition:"color .2s" }} onMouseEnter={e=>e.currentTarget.style.color=INK} onMouseLeave={e=>e.currentTarget.style.color=MUTED}>Demo</Link>
            <Link href="/dashboard" style={{ textDecoration:"none",color:MUTED,fontWeight:500,transition:"color .2s" }} onMouseEnter={e=>e.currentTarget.style.color=INK} onMouseLeave={e=>e.currentTarget.style.color=MUTED}>Dashboard</Link>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth:860,margin:"0 auto",padding:"52px 24px 96px",display:"flex",gap:48 }}>

        {/* Sidebar */}
        <div style={{ width:180,flexShrink:0,display:"none" }} className="ph-sidebar">
          {[["Overview","#overview"],["Auth","#auth"],["Endpoints","#endpoints"],["Preflight","#preflight"],["Payment","#payment"],["Disputes","#disputes"],["Audit","#audit"],["Contract","#contract"],["Compliance","#compliance"]].map(([l,h])=>(
            <a key={h} href={h} style={{ display:"block",fontSize:13.5,color:MUTED,textDecoration:"none",padding:"5px 0",fontWeight:500,transition:"color .2s" }} onMouseEnter={e=>e.currentTarget.style.color=INK} onMouseLeave={e=>e.currentTarget.style.color=MUTED}>{l}</a>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex:1,minWidth:0 }}>

          <div style={{ marginBottom:40 }}>
            <div style={{ fontSize:12,fontWeight:700,color:"#C8841A",letterSpacing:".4px",textTransform:"uppercase",marginBottom:10 }}>API Reference</div>
            <h1 style={{ fontSize:"clamp(26px,4vw,40px)",letterSpacing:"-1.2px",fontWeight:700,marginBottom:12 }}>PayHub API</h1>
            <p style={{ fontSize:16,color:MUTED,lineHeight:1.65,maxWidth:600 }}>
              REST API for integrating PayHub's dispute and chargeback rail into your agent payment system.
              Base URL: <Code>http://localhost:3001</Code> (self-hosted).
            </p>
          </div>

          <Section title="Authentication" id="auth">
            <p style={{ fontSize:15,color:MUTED,lineHeight:1.7,marginBottom:16 }}>
              All requests are unauthenticated except <Code>POST /payments/:id/resolve</Code>, which requires an arbiter token in the request body.
            </p>
            <Block>{`// Arbiter auth — include in resolve requests
{
  "authToken": "your_arbiter_token"   // set via ARBITER_AUTH_TOKEN in .env
}`}</Block>
          </Section>

          <Section title="Endpoints" id="endpoints">
            <Endpoint method="POST" path="/payments/preflight" desc="A-Pass + CCP compliance check for both parties before any token moves" />
            <Endpoint method="POST" path="/payments/register" desc="Store enriched payment metadata after on-chain initiatePayment" />
            <Endpoint method="GET"  path="/payments/:id" desc="Fetch payment details including on-chain status" />
            <Endpoint method="POST" path="/payments/:id/dispute/preflight" desc="Verify the caller is the original A-Pass-verified payer" />
            <Endpoint method="POST" path="/payments/:id/dispute/register" desc="Store dispute metadata after on-chain openDispute" />
            <Endpoint method="POST" path="/payments/:id/resolve" desc="Arbiter resolves — CCP screens the refund leg before execution" />
            <Endpoint method="POST" path="/payments/:id/auto-resolve" desc="Auto-refund to payer after merchant response window expires" />
            <Endpoint method="GET"  path="/payments/:id/audit" desc="Fetch the signed HMAC audit bundle" />
            <Endpoint method="GET"  path="/health" desc="Service health check" />
          </Section>

          <Section title="POST /payments/preflight" id="preflight">
            <p style={{ fontSize:15,color:MUTED,lineHeight:1.7,marginBottom:4 }}>
              Run before calling <Code>initiatePayment</Code> on-chain. Verifies both parties hold a valid A-Pass, checks A-Token transfer eligibility via the CCP protocol, and generates a Travel Rule reference.
            </p>
            <Block>{`// Request
POST /payments/preflight
{
  "payerAddress":    "0xABC...",
  "merchantAddress": "0xDEF...",
  "amount":          "50000000",   // in token base units (6 decimals)
  "asset":           "0x...",      // A-Token contract address
  "orderId":         "order_123"
}

// Response 200
{
  "cleared":       true,
  "apassPayer":    "434",          // Cleanverse A-Pass ID — store and pass to contract
  "apassMerchant": "435",
  "ccpRiskScore":  2,
  "payerTier":     "20",
  "merchantTier":  "20",
  "travelRuleId":  "tr_pre_abc..."
}

// Response 403 — payment blocked
{
  "error": "Payer does not hold a valid A-Pass",
  "detail": { ... }
}`}</Block>
          </Section>

          <Section title="POST /payments/register" id="payment">
            <p style={{ fontSize:15,color:MUTED,lineHeight:1.7,marginBottom:4 }}>
              Call immediately after <Code>initiatePayment</Code> confirms on-chain. Stores enriched metadata so the audit trail can be reconstructed.
            </p>
            <Block>{`// Request
POST /payments/register
{
  "paymentId":       "0x...",    // bytes32 returned from initiatePayment event
  "orderId":         "order_123",
  "payerAddress":    "0xABC...",
  "merchantAddress": "0xDEF...",
  "amount":          "50000000",
  "asset":           "0x...",
  "apassPayer":      "434",
  "apassMerchant":   "435",
  "travelRuleId":    "tr_pre_abc...",
  "txHash":          "0x..."
}

// Response 200
{ "ok": true, "paymentId": "0x..." }`}</Block>
          </Section>

          <Section title="Disputes" id="disputes">
            <p style={{ fontSize:15,color:MUTED,lineHeight:1.7,marginBottom:16 }}>
              Disputes are identity-bound — only the original A-Pass-verified payer can open one. The backend re-verifies identity at dispute time before the on-chain transaction is submitted.
            </p>
            <Block>{`// Step 1 — verify payer identity (before submitting on-chain)
POST /payments/:id/dispute/preflight
{ "callerAddress": "0xABC..." }

// Response 200
{ "eligible": true, "apassId": "434", "windowClosesAt": "2026-06-21T..." }

// Step 2 — register after on-chain openDispute confirms
POST /payments/:id/dispute/register
{ "reason": "Merchant did not deliver", "txHash": "0x..." }

// Step 3 — arbiter resolves (CCP screens refund leg first)
POST /payments/:id/resolve
{
  "inFavorOfPayer": true,
  "verdict":        "Merchant did not provide delivery proof. Refund issued.",
  "authToken":      "your_arbiter_token"
}`}</Block>
          </Section>

          <Section title="GET /payments/:id/audit" id="audit">
            <p style={{ fontSize:15,color:MUTED,lineHeight:1.7,marginBottom:4 }}>
              Returns a signed HMAC audit bundle generated at resolution time. Contains the full compliance trail for regulators.
            </p>
            <Block>{`// Response 200
{
  "payment": {
    "id":     "0x...",
    "status": "REFUNDED"
  },
  "identity": {
    "payerAPass":    "434",
    "merchantAPass": "435"
  },
  "compliance": {
    "ccpPayment": { "cleared": true, "riskScore": 2 },
    "ccpRefund":  { "cleared": true },
    "travelRule": ["tr_pre_abc..."]
  },
  "resolution": {
    "verdict":    "Merchant did not provide delivery proof. Refund issued.",
    "resolvedAt": "2026-06-18T10:00:00Z",
    "txHash":     "0x..."
  },
  "signature": "sha256=..."    // HMAC-signed — tamper-evident
}`}</Block>
          </Section>

          <Section title="Smart Contract" id="contract">
            <p style={{ fontSize:15,color:MUTED,lineHeight:1.7,marginBottom:12 }}>
              Deployed at <Code>0x7BBDa4409e300eaDB0A61F137498480c96173C9e</Code> on Monad Testnet (Chain ID 10143).
            </p>
            <Block>{`// Key functions

// Payer calls after backend preflight
initiatePayment(
  address merchant,
  address token,
  uint256 amount,
  string  orderId,
  string  apassPayer,      // A-Pass ID stored on-chain for audit
  string  apassMerchant,
  uint256 customFinality   // 0 = use 3-day default
) returns (bytes32 paymentId)

// Payer opens dispute during dispute window (2 days)
openDispute(bytes32 paymentId, string reason)

// Merchant submits evidence (24h response window)
respondToDispute(bytes32 paymentId, string evidence)

// Arbiter (or owner) resolves
// inFavorOfPayer=true → refund to original payer
resolveDispute(bytes32 paymentId, bool inFavorOfPayer, string verdict)

// Anyone can call after merchant misses response window
autoResolveExpiredDispute(bytes32 paymentId)`}</Block>
          </Section>

          <Section title="Cleanverse Compliance Primitives" id="compliance">
            <p style={{ fontSize:15,color:MUTED,lineHeight:1.7,marginBottom:16 }}>
              PayHub enforces compliance at every gate using the Cleanverse Cooperate API. No on-chain transaction is submitted without a backend pre-check.
            </p>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10 }}>
              {[
                ["A-Pass","Identity","Both payer and merchant verified before payment. Re-verified at dispute time."],
                ["A-Token","Token policy","Transfer eligibility checked for both parties on every payment leg."],
                ["CCP","Sanctions + AML","Screens payment AND refund legs against global AML and sanctions databases."],
                ["Travel Rule","Regulatory","Originator/beneficiary metadata attached to every transfer automatically."],
              ].map(([name,tag,desc])=>(
                <div key={name} style={{ background:CREAM,border:`1px solid ${BORDER}`,borderRadius:12,padding:"16px 16px 18px" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                    <span style={{ fontSize:11,fontWeight:800,color:"#C8841A",background:"#FCF4E4",border:"1px solid #F4E3C0",padding:"3px 8px",borderRadius:5 }}>{name}</span>
                    <span style={{ fontSize:12,color:MUTED,fontWeight:600 }}>{tag}</span>
                  </div>
                  <p style={{ fontSize:13,color:MUTED,lineHeight:1.6,margin:0 }}>{desc}</p>
                </div>
              ))}
            </div>
          </Section>

          <div style={{ padding:"24px",background:CREAM,border:`1px solid ${BORDER}`,borderRadius:14 }}>
            <div style={{ fontSize:14,fontWeight:700,marginBottom:6 }}>Try it live</div>
            <p style={{ fontSize:14,color:MUTED,marginBottom:14,lineHeight:1.6 }}>Walk through the full integration flow — compliance checks, escrow, dispute, and audit download.</p>
            <Link href="/demo" style={{ display:"inline-flex",padding:"10px 20px",borderRadius:9,background:AMBER,color:INK,fontWeight:700,fontSize:14,textDecoration:"none" }}>Open demo →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
