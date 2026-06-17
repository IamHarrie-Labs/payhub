"use client";
import { useState } from "react";
import Link from "next/link";
import { connectWallet, connectWalletConnect } from "../lib/wallet";

const AMBER  = "#E8A020";
const INK    = "#0D1117";
const MUTED  = "#5B6470";
const BORDER = "#E8E7E2";
const CREAM  = "#FAF9F6";

// ─── Wallet modal ──────────────────────────────────────────────────────────────
function WalletModal({ onClose, onConnect }) {
  const [busy, setBusy] = useState(null);
  const [err,  setErr]  = useState(null);

  async function connect(id) {
    setBusy(id); setErr(null);
    try {
      let w;
      if (id === "walletconnect") {
        w = await connectWalletConnect();
      } else {
        let raw = window.ethereum;
        if (id === "coinbase" && window.coinbaseWalletExtension) raw = window.coinbaseWalletExtension;
        if (!raw) throw new Error("Wallet not found. Install MetaMask from metamask.io");
        w = await connectWallet(raw);
      }
      onConnect(w);
    } catch (e) {
      setErr(e.code === 4001 ? "Connection cancelled." : e.message);
      setBusy(null);
    }
  }

  const wallets = [
    { id: "metamask",      label: "MetaMask",        sub: "Browser extension",       bg: "#F97316", letter: "M" },
    { id: "walletconnect", label: "WalletConnect",    sub: "Scan QR with any wallet", bg: "#3B99FC", letter: "W" },
    { id: "coinbase",      label: "Coinbase Wallet",  sub: "Browser extension",       bg: "#0052FF", letter: "C" },
  ];

  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,zIndex:200,background:"rgba(13,17,23,.52)",backdropFilter:"blur(5px)",display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#fff",borderRadius:20,padding:32,width:"100%",maxWidth:400,boxShadow:"0 40px 80px -24px rgba(13,17,23,.35)" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24 }}>
          <span style={{ fontSize:20,fontWeight:700,letterSpacing:"-.5px",color:INK }}>Connect a wallet</span>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:8,background:CREAM,border:"none",cursor:"pointer",fontSize:20,color:MUTED,lineHeight:"32px",fontFamily:"inherit" }}>×</button>
        </div>
        {err && (
          <div style={{ background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:"#B91C1C" }}>{err}</div>
        )}
        <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
          {wallets.map(({ id, label, sub, bg, letter }) => (
            <button key={id} onClick={() => connect(id)} disabled={!!busy}
              style={{ display:"flex",alignItems:"center",gap:14,padding:"14px 16px",border:`1px solid ${busy===id ? AMBER : BORDER}`,borderRadius:12,background:busy===id ? "#FFFBF2" : "#fff",cursor:busy?"wait":"pointer",fontFamily:"inherit",textAlign:"left",width:"100%",transition:"all .15s",opacity:busy&&busy!==id?0.5:1 }}
              onMouseEnter={e => { if (!busy) { e.currentTarget.style.background=CREAM; e.currentTarget.style.borderColor=AMBER; }}}
              onMouseLeave={e => { if (busy!==id) { e.currentTarget.style.background="#fff"; e.currentTarget.style.borderColor=BORDER; }}}>
              <div style={{ width:40,height:40,borderRadius:11,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:16,color:"#fff",flexShrink:0 }}>{letter}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15.5,fontWeight:600,color:INK }}>{label}</div>
                <div style={{ fontSize:13,color:"#9AA3AC",marginTop:2 }}>{busy===id ? "Check your wallet for a popup..." : sub}</div>
              </div>
              {busy===id && <div style={{ width:16,height:16,border:"2px solid "+AMBER,borderTopColor:"transparent",borderRadius:"50%",flexShrink:0,animation:"phspin .6s linear infinite" }} />}
            </button>
          ))}
        </div>
        <p style={{ fontSize:12.5,color:"#B0B8C1",textAlign:"center",marginTop:20,lineHeight:1.55 }}>By connecting you agree to PayHub's Terms of Service.</p>
      </div>
      <style>{`@keyframes phspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── Amber CTA button ──────────────────────────────────────────────────────────
function AmberBtn({ onClick, full, children }) {
  return (
    <button onClick={onClick}
      style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,padding:"13px 26px",borderRadius:10,border:"none",background:AMBER,color:INK,fontWeight:700,fontSize:15,fontFamily:"inherit",cursor:"pointer",boxShadow:"0 4px 18px -6px rgba(232,160,32,.6)",transition:"transform .15s,box-shadow .2s",width:full?"100%":undefined }}
      onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 10px 26px -8px rgba(232,160,32,.8)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=""; }}>
      {children}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [wallet,     setWallet]     = useState(null);

  function onConnected(w) { setWallet(w); setWalletOpen(false); }
  const walletLabel = wallet ? `${wallet.address.slice(0,6)}...${wallet.address.slice(-4)}` : "Connect Wallet";

  const NAV_LINKS = [["Platform","#features"],["How it works","/demo"],["Docs","/demo"]];

  const FEATURES = [
    { code:"AP",  title:"A-Pass",     body:"Cryptographic identity for every agent. KYC-backed, on-chain, revocable in one click. Know exactly who is moving money before a single token clears." },
    { code:"AT",  title:"A-Token",    body:"Programmable money with policy baked in. Spend caps, merchant allowlists, and expiry dates enforced at the protocol level, not by a human reviewer." },
    { code:"CCP", title:"CCP",        body:"Real-time counterparty clearing. The CCP protocol screens both legs of every transaction, payment and refund, against global sanctions and AML databases." },
    { code:"TR",  title:"Travel Rule",body:"FATF Travel Rule compliance, automated. Originator and beneficiary data is exchanged and encrypted between institutions on every transfer." },
  ];

  return (
    <>
      <div style={{ background:"#fff",color:INK,minHeight:"100vh",fontFamily:"'Space Grotesk',system-ui,sans-serif",overflowX:"hidden" }}>

        {/* NAV */}
        <nav style={{ position:"sticky",top:0,zIndex:100,background:"rgba(255,255,255,.92)",backdropFilter:"saturate(180%) blur(14px)",borderBottom:`1px solid ${BORDER}` }}>
          <div style={{ maxWidth:1180,margin:"0 auto",padding:"0 24px",height:68,display:"flex",alignItems:"center",justifyContent:"space-between",gap:20 }}>
            <Link href="/" style={{ display:"flex",alignItems:"baseline",textDecoration:"none",color:INK,fontSize:23,letterSpacing:"-1px",flexShrink:0 }}>
              <span style={{ fontWeight:300 }}>Pay</span><span style={{ fontWeight:700 }}>Hub</span>
              <span style={{ width:7,height:7,borderRadius:"50%",background:AMBER,display:"inline-block",marginLeft:3,marginBottom:4,alignSelf:"flex-end" }} />
            </Link>
            <div className="ph-nd" style={{ display:"flex",alignItems:"center",gap:28,fontSize:15,color:MUTED,fontWeight:500 }}>
              {NAV_LINKS.map(([l,h]) => (
                <a key={l} href={h} style={{ textDecoration:"none",color:MUTED,transition:"color .2s" }}
                  onMouseEnter={e => e.currentTarget.style.color=INK}
                  onMouseLeave={e => e.currentTarget.style.color=MUTED}>{l}</a>
              ))}
            </div>
            <div className="ph-nd" style={{ display:"flex",alignItems:"center",gap:14 }}>
              <Link href="/demo" style={{ fontSize:15,fontWeight:500,color:MUTED,textDecoration:"none",transition:"color .2s" }}
                onMouseEnter={e => e.currentTarget.style.color=INK}
                onMouseLeave={e => e.currentTarget.style.color=MUTED}>Live demo</Link>
              <AmberBtn onClick={() => wallet ? null : setWalletOpen(true)}>{walletLabel}</AmberBtn>
            </div>
            <button className="ph-nm" onClick={() => setMobileOpen(o => !o)}
              style={{ display:"none",flexDirection:"column",gap:5,background:"none",border:"none",cursor:"pointer",padding:6,flexShrink:0 }} aria-label="Menu">
              <span style={{ display:"block",width:22,height:2,background:INK,borderRadius:2 }} />
              <span style={{ display:"block",width:22,height:2,background:INK,borderRadius:2 }} />
              <span style={{ display:"block",width:22,height:2,background:INK,borderRadius:2 }} />
            </button>
          </div>
          {mobileOpen && (
            <div style={{ background:"#fff",borderTop:`1px solid ${BORDER}`,padding:"20px 24px 24px",display:"flex",flexDirection:"column",gap:16 }}>
              {NAV_LINKS.map(([l,h]) => (
                <a key={l} href={h} onClick={() => setMobileOpen(false)} style={{ fontSize:16,fontWeight:500,color:"#3A424C",textDecoration:"none" }}>{l}</a>
              ))}
              <div style={{ height:1,background:"#F0EFEA" }} />
              <AmberBtn onClick={() => { setMobileOpen(false); wallet ? null : setWalletOpen(true); }} full>{walletLabel}</AmberBtn>
            </div>
          )}
        </nav>

        {/* HERO */}
        <section style={{ maxWidth:1180,margin:"0 auto",padding:"80px 24px 64px",display:"flex",gap:56,alignItems:"center",flexWrap:"wrap" }}>
          <div style={{ flex:"1 1 400px",minWidth:280 }}>
            <div className="ph-a ph-d0" style={{ display:"inline-flex",alignItems:"center",gap:8,fontSize:13,fontWeight:700,color:"#C8841A",background:"#FCF4E4",border:"1px solid #F4E3C0",padding:"7px 14px",borderRadius:100,marginBottom:24 }}>
              <span style={{ width:6,height:6,borderRadius:"50%",background:AMBER,display:"inline-block" }} />
              Payment infrastructure for AI agents
            </div>
            <h1 className="ph-a ph-d1" style={{ fontSize:"clamp(34px,5vw,62px)",lineHeight:1.04,letterSpacing:"-2.2px",fontWeight:700,marginBottom:20 }}>
              Payments your AI agents can actually make.
            </h1>
            <p className="ph-a ph-d2" style={{ fontSize:18,lineHeight:1.65,color:MUTED,maxWidth:480,marginBottom:34 }}>
              PayHub gives every agent a verifiable identity, programmable spending limits, and built-in regulatory compliance so autonomous payments clear safely, every time.
            </p>
            <div className="ph-a ph-d3" style={{ display:"flex",gap:12,flexWrap:"wrap",alignItems:"center" }}>
              <AmberBtn onClick={() => wallet ? null : setWalletOpen(true)}>{walletLabel}</AmberBtn>
              <Link href="/demo" style={{ display:"inline-flex",alignItems:"center",padding:"13px 24px",borderRadius:10,border:`1px solid ${BORDER}`,color:INK,fontWeight:600,fontSize:15,textDecoration:"none",transition:"border-color .2s,transform .15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=INK; e.currentTarget.style.transform="translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=BORDER; e.currentTarget.style.transform=""; }}>
                See how it works
              </Link>
            </div>
            <div className="ph-a ph-d4" style={{ display:"flex",gap:0,marginTop:44,borderTop:`1px solid ${BORDER}`,paddingTop:28 }}>
              {[["Under 200ms","Authorization latency"],["100%","Travel Rule coverage"],["Day 1","Policy enforcement"]].map(([val,sub],i) => (
                <div key={val} style={{ flex:1,paddingRight:20,borderRight:i<2?`1px solid ${BORDER}`:"none",paddingLeft:i>0?20:0 }}>
                  <div style={{ fontSize:24,fontWeight:800,letterSpacing:"-1px" }}>{val}</div>
                  <div style={{ fontSize:12,color:"#9AA3AC",fontWeight:500,marginTop:3,lineHeight:1.4 }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment card */}
          <div className="ph-a ph-d4" style={{ flex:"1 1 340px",minWidth:280,display:"flex",justifyContent:"center" }}>
            <div style={{ width:"100%",maxWidth:390,background:"#fff",border:`1px solid ${BORDER}`,borderRadius:20,overflow:"hidden",boxShadow:"0 24px 56px -28px rgba(13,17,23,.2),0 2px 6px rgba(13,17,23,.04)" }}>
              <div style={{ padding:"17px 22px",borderBottom:`1px solid #F0EFEA`,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                <span style={{ fontSize:12,fontWeight:700,color:"#9AA3AC",letterSpacing:".4px",textTransform:"uppercase" }}>Agent payment</span>
                <span style={{ display:"flex",alignItems:"center",gap:5,fontSize:12,fontWeight:700,color:"#1B7A4B",background:"#E9F7EF",padding:"4px 10px",borderRadius:100 }}>
                  <span style={{ width:6,height:6,borderRadius:"50%",background:"#22A05E",display:"inline-block" }} />Authorized
                </span>
              </div>
              <div style={{ padding:"20px 22px 18px" }}>
                <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:17 }}>
                  <div style={{ width:40,height:40,borderRadius:10,background:INK,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:14,flexShrink:0 }}>AC</div>
                  <div>
                    <div style={{ fontSize:15,fontWeight:700 }}>Acquisitions Agent</div>
                    <div style={{ fontSize:12.5,color:"#9AA3AC",marginTop:1 }}>A-Pass verified identity</div>
                  </div>
                </div>
                <div style={{ display:"flex",alignItems:"baseline",justifyContent:"space-between",padding:"13px 0",borderTop:`1px solid #F0EFEA`,borderBottom:`1px solid #F0EFEA`,marginBottom:15 }}>
                  <span style={{ fontSize:13,color:"#9AA3AC" }}>Paying Stripe Inc.</span>
                  <span style={{ fontSize:26,fontWeight:800,letterSpacing:"-1px" }}>$1,240<span style={{ fontSize:15,color:"#9AA3AC",fontWeight:500 }}>.00</span></span>
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                  {[["A-Pass identity","Verified","#1B7A4B"],["Spend policy","Within $5k cap","#1B7A4B"],["Travel Rule","Data sent","#1B7A4B"],["CCP settlement","Clearing...","#C8841A"]].map(([l,v,c]) => (
                    <div key={l} style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                      <span style={{ fontSize:13.5,color:"#3A424C",fontWeight:500 }}>{l}</span>
                      <span style={{ fontSize:12.5,fontWeight:700,color:c }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background:INK,color:"#fff",padding:"13px 22px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                <span style={{ fontSize:12,color:"#8A929C" }}>Settled in 0.18s</span>
                <span style={{ display:"flex",alignItems:"center",gap:5,fontSize:13,fontWeight:700 }}>
                  Powered by PayHub <span style={{ width:5,height:5,borderRadius:"50%",background:AMBER,display:"inline-block" }} />
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" style={{ background:CREAM,borderTop:`1px solid #F0EFEA`,borderBottom:`1px solid #F0EFEA`,padding:"88px 24px" }}>
          <div style={{ maxWidth:1180,margin:"0 auto" }}>
            <div style={{ maxWidth:560,marginBottom:48 }}>
              <div style={{ fontSize:12,fontWeight:700,color:"#C8841A",letterSpacing:".5px",textTransform:"uppercase",marginBottom:14 }}>The platform</div>
              <h2 style={{ fontSize:"clamp(26px,3.6vw,40px)",lineHeight:1.08,letterSpacing:"-1.5px",fontWeight:700,marginBottom:14 }}>Four primitives. One compliant payment rail.</h2>
              <p style={{ fontSize:17,lineHeight:1.65,color:MUTED }}>Everything an autonomous agent needs to move money: identity, programmable value, settlement, and regulation in a single API.</p>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:16 }}>
              {FEATURES.map(({ code, title, body }) => (
                <div key={code} className="ph-card" style={{ background:"#fff",border:`1px solid ${BORDER}`,borderRadius:16,padding:"24px 22px 26px",cursor:"default" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:13 }}>
                    <div style={{ width:36,height:36,borderRadius:9,background:"#FCF4E4",border:"1px solid #F4E3C0",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:code.length>2?10:13,color:"#C8841A",flexShrink:0 }}>{code}</div>
                    <h3 style={{ fontSize:17,fontWeight:700,letterSpacing:"-.3px" }}>{title}</h3>
                  </div>
                  <p style={{ fontSize:14,lineHeight:1.7,color:MUTED }}>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* DARK CTA */}
        <section style={{ background:INK,color:"#fff",padding:"88px 24px",textAlign:"center" }}>
          <div style={{ maxWidth:580,margin:"0 auto" }}>
            <div style={{ fontSize:12,fontWeight:700,color:AMBER,marginBottom:18,letterSpacing:".4px",textTransform:"uppercase" }}>Start building</div>
            <h2 style={{ fontSize:"clamp(26px,4vw,46px)",lineHeight:1.07,letterSpacing:"-1.8px",fontWeight:700,marginBottom:16 }}>The future of agent payments starts here.</h2>
            <p style={{ fontSize:17,lineHeight:1.65,color:"#8A929C",marginBottom:34 }}>Connect your wallet, explore the demo, and start building on PayHub.</p>
            <div style={{ display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap" }}>
              <AmberBtn onClick={() => wallet ? null : setWalletOpen(true)}>{walletLabel}</AmberBtn>
              <Link href="/demo" style={{ display:"inline-flex",alignItems:"center",padding:"13px 24px",borderRadius:10,border:"1px solid #2A323C",color:"#fff",fontWeight:600,fontSize:15,textDecoration:"none",transition:"border-color .2s" }}
                onMouseEnter={e => e.currentTarget.style.borderColor="#8A929C"}
                onMouseLeave={e => e.currentTarget.style.borderColor="#2A323C"}>
                Live demo
              </Link>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ background:"#fff",borderTop:`1px solid ${BORDER}`,padding:"34px 24px" }}>
          <div style={{ maxWidth:1180,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16 }}>
            <Link href="/" style={{ display:"flex",alignItems:"baseline",fontSize:20,letterSpacing:"-.9px",textDecoration:"none",color:INK }}>
              <span style={{ fontWeight:300 }}>Pay</span><span style={{ fontWeight:700 }}>Hub</span>
              <span style={{ width:6,height:6,borderRadius:"50%",background:AMBER,display:"inline-block",marginLeft:3,marginBottom:4,alignSelf:"flex-end" }} />
            </Link>
            <div style={{ display:"flex",gap:22,fontSize:14,color:"#9AA3AC",fontWeight:500 }}>
              {[["Platform","#features"],["Demo","/demo"],["Dashboard","/dashboard"]].map(([l,h]) => (
                <a key={l} href={h} style={{ textDecoration:"none",color:"#9AA3AC",transition:"color .2s" }}
                  onMouseEnter={e => e.currentTarget.style.color=INK}
                  onMouseLeave={e => e.currentTarget.style.color="#9AA3AC"}>{l}</a>
              ))}
            </div>
            <span style={{ fontSize:13,color:"#B0B8C1" }}>2026 PayHub. All rights reserved.</span>
          </div>
        </footer>
      </div>

      <style>{`
        @media(max-width:768px){.ph-nd{display:none!important}.ph-nm{display:flex!important}}
      `}</style>

      {walletOpen && <WalletModal onClose={() => setWalletOpen(false)} onConnect={onConnected} />}
    </>
  );
}
