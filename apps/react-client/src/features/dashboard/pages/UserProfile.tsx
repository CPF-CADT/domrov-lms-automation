import { useState, useRef } from "react";

const transactions = [
  { id: 19,  amount: 2712.72, reason: "AI Usage",    balanceBefore: 18293.79, balanceAfter: 15581.02, date: "3/8/2026" },
  { id: 180, amount: 2876.26, reason: "Refund",       balanceBefore: 23349.7,  balanceAfter: 21073.44, date: "3/8/2026" },
  { id: 209, amount: 2032.06, reason: "Adjustment",   balanceBefore: 15780.33, balanceAfter: 17812.39, date: "3/8/2026" },
  { id: 208, amount: 945.4,   reason: "AI Usage",     balanceBefore: 16725.73, balanceAfter: 15780.33, date: "3/7/2026" },
  { id: 110, amount: 1790.43, reason: "Refund",       balanceBefore: 6923.8,   balanceAfter: 5133.37,  date: "3/7/2026" },
  { id: 142, amount: 268.14,  reason: "AI Usage",     balanceBefore: 23601,    balanceAfter: 23332.86, date: "3/7/2026" },
  { id: 160, amount: 4176.79, reason: "Refund",       balanceBefore: 31923.2,  balanceAfter: 27746.41, date: "3/7/2026" },
  { id: 146, amount: 2403.29, reason: "Payment",      balanceBefore: 25289.79, balanceAfter: 29693.08, date: "3/7/2026" },
  { id: 135, amount: 4188.76, reason: "AI Usage",     balanceBefore: 18423.64, balanceAfter: 14234.88, date: "3/7/2026" },
  { id: 154, amount: 3584.12, reason: "AI Usage",     balanceBefore: 4377.33,  balanceAfter: 793.21,   date: "3/7/2026" },
];

const reasonColors = {
  "AI Usage":   { bg:"#fef2f2", color:"#dc2626", border:"#fecaca" },
  "Refund":     { bg:"#f0fdf4", color:"#16a34a", border:"#86efac" },
  "Adjustment": { bg:"#fffbeb", color:"#d97706", border:"#fcd34d" },
  "Payment":    { bg:"#eff6ff", color:"#2563eb", border:"#93c5fd" },
};

const API_URL = "https://api.domrov.app/users/me";

const MOCK_API_DATA = {
  data: {
    id: 1, firstName: "Choun", lastName: "Rathanak",
    email: "nak4131@gmail.com", gender: "", dob: "", phoneNumber: "",
    profilePictureUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=RathanakEdu&backgroundColor=b6e3f4,c0aede&backgroundType=gradientLinear",
    isVerified: true, isTwoFactorEnable: false, status: "ACTIVE",
    created_at: "2026-03-10T00:00:00Z", updated_at: "2026-03-10T00:00:00Z",
  }
};

const Icons = {
  Mail:         () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>),
  Phone:        () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1 19.79 19.79 0 0 1 1.64 4.5 2 2 0 0 1 3.6 2.32h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.06 6.06l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17z"/></svg>),
  Shield:       () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>),
  User:         () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>),
  Calendar:     () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>),
  Clock:        () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
  CheckCircle:  () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>),
  Gender:       () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="5"/><path d="M12 14v7M9 18h6"/></svg>),
  Wallet:       () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>),
  Package:      () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></svg>),
  GraduationCap:() => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>),
  BookOpen:     () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>),
  Plus:         () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>),
  Minus:        () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/></svg>),
  Edit:         () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>),
  X:            () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>),
  Save:         () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>),
  Camera:       () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>),
  Loader:       () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{animation:"spin 1s linear infinite"}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>),
  Lock:         () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>),
  IdCard:       () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 10h2M16 14h2M7 10h4v4H7z"/></svg>),
  Cake:         () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20M12 3v3M8 7v1M16 7v1"/></svg>),
  Upload:       () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>),
  Trash:        () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>),
};

const formatGender = (g) => ({ "M":"Male","F":"Female","":"N/A" }[g] ?? g ?? "N/A");
const formatDate   = (d) => { if(!d) return "N/A"; try { return new Date(d).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}); } catch { return d; } };
const formatStatus = (s) => s==="ACTIVE" ? "Active" : s ?? "N/A";

export default function UserProfile() {
  const [activeTab,     setActiveTab]     = useState("overview");
  const [editOpen,      setEditOpen]      = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [saveStatus,    setSaveStatus]    = useState(null);
  const [profile,       setProfile]       = useState(MOCK_API_DATA.data);
  const [form,          setForm]          = useState({});
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile,    setAvatarFile]    = useState(null);
  const fileInputRef = useRef(null);

  const fullName  = `${profile.firstName} ${profile.lastName}`;
  const avatarSrc = avatarPreview || profile.profilePictureUrl;

  const openEdit = () => {
    setForm({ firstName:profile.firstName, lastName:profile.lastName, email:profile.email, phoneNumber:profile.phoneNumber||"", gender:profile.gender||"", dob:profile.dob||"" });
    setAvatarPreview(null); setAvatarFile(null); setSaveStatus(null); setEditOpen(true);
  };
  const closeEdit = () => { setEditOpen(false); setSaveStatus(null); setAvatarPreview(null); setAvatarFile(null); };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true); setSaveStatus(null);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([k,v]) => body.append(k, v));
      if (avatarFile) body.append("profilePicture", avatarFile);
      await fetch(API_URL, { method:"PUT", body });
    } catch (_) {}
    setProfile(p => ({ ...p, ...form, profilePictureUrl: avatarPreview||p.profilePictureUrl, updated_at: new Date().toISOString() }));
    setSaveStatus("success");
    setSaving(false);
    setTimeout(() => { setEditOpen(false); setSaveStatus(null); setAvatarPreview(null); }, 1400);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#f0f4f8", fontFamily:"'Plus Jakarta Sans','Segoe UI',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        .fade-in{animation:fadeUp .55s cubic-bezier(.22,.68,0,1.2) forwards;opacity:0}
        .d1{animation-delay:.05s}.d2{animation-delay:.13s}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .card{background:#fff;border-radius:24px;box-shadow:0 2px 8px rgba(15,23,42,.06),0 8px 32px rgba(15,23,42,.04)}
        .tab-btn{cursor:pointer;border:none;background:none;font-family:inherit;font-size:14px;font-weight:700;padding:11px 26px;border-radius:12px;transition:all .22s;color:#94a3b8;display:flex;align-items:center;gap:8px}
        .tab-btn:hover{color:#334155;background:#f1f5f9}
        .tab-btn.active{color:#1d4ed8;background:#eff6ff;box-shadow:0 2px 8px rgba(29,78,216,.12)}
        .info-row{display:flex;align-items:center;gap:16px;padding:16px 0;border-bottom:1px solid #f1f5f9;transition:all .15s;border-radius:10px}
        .info-row:last-child{border-bottom:none}
        .info-row:hover{background:#f8fafc;padding-left:6px}
        .icon-box{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .tx-row{transition:background .15s}
        .tx-row:hover{background:#f8fafc!important}
        .action-btn{cursor:pointer;border:none;font-family:inherit;font-size:14px;font-weight:700;padding:13px 26px;border-radius:14px;transition:all .22s;display:flex;align-items:center;gap:8px}
        .action-btn:hover{transform:translateY(-2px)}
        .edit-profile-btn{cursor:pointer;font-family:inherit;font-size:14px;font-weight:700;padding:13px 22px;border-radius:14px;transition:all .22s;display:flex;align-items:center;gap:8px;background:#fff;color:#1d4ed8;border:1.5px solid #1d4ed8}
        .edit-profile-btn:hover{background:#eff6ff;transform:translateY(-2px);box-shadow:0 4px 12px rgba(29,78,216,.15)}
        .avatar-glow{animation:glow 3s ease-in-out infinite}
        @keyframes glow{0%,100%{box-shadow:0 0 0 4px rgba(99,102,241,.3),0 12px 40px rgba(99,102,241,.2)}50%{box-shadow:0 0 0 7px rgba(99,102,241,.15),0 16px 48px rgba(99,102,241,.3)}}
        .stat-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700}
        .modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:200;display:flex;align-items:center;justify-content:center;padding:24px}
        .modal{background:#fff;border-radius:28px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;box-shadow:0 32px 100px rgba(15,23,42,.3);animation:modalIn .3s cubic-bezier(.22,.68,0,1.2)}
        .modal-header{padding:28px 32px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f1f5f9}
        .modal-body{padding:28px 32px}
        .modal-footer{padding:20px 32px 28px;display:flex;gap:12px;justify-content:flex-end;border-top:1px solid #f1f5f9}
        .form-row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .form-group{margin-bottom:20px}
        .form-group.full{grid-column:1/-1}
        .form-label{display:block;font-size:12px;font-weight:700;color:#64748b;margin-bottom:8px;letter-spacing:.02em}
        .form-input{width:100%;padding:12px 16px;border-radius:12px;border:1.5px solid #e2e8f0;font-family:inherit;font-size:14px;font-weight:500;color:#0f172a;background:#f8fafc;transition:all .2s;outline:none}
        .form-input:focus{border-color:#1d4ed8;background:#fff;box-shadow:0 0 0 3px rgba(29,78,216,.1)}
        .form-input::placeholder{color:#cbd5e1}
        .form-select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:38px;cursor:pointer}
        .save-btn{cursor:pointer;border:none;font-family:inherit;font-size:14px;font-weight:700;padding:13px 28px;border-radius:13px;transition:all .22s;display:flex;align-items:center;gap:8px;background:linear-gradient(135deg,#1d4ed8,#1e40af);color:#fff;box-shadow:0 4px 16px rgba(29,78,216,.35)}
        .save-btn:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.08)}
        .save-btn:disabled{opacity:.65;cursor:not-allowed}
        .cancel-btn{cursor:pointer;border:1.5px solid #e2e8f0;font-family:inherit;font-size:14px;font-weight:700;padding:13px 24px;border-radius:13px;transition:all .22s;display:flex;align-items:center;gap:8px;background:#f8fafc;color:#64748b}
        .cancel-btn:hover:not(:disabled){background:#f1f5f9;color:#334155}
        .upload-zone{border:2px dashed #e2e8f0;border-radius:16px;padding:28px 20px;text-align:center;cursor:pointer;transition:all .2s;background:#fafafa}
        .upload-zone:hover{border-color:#1d4ed8;background:#eff6ff}
        .close-btn{cursor:pointer;border:1.5px solid #e2e8f0;background:#f8fafc;border-radius:10px;padding:8px;display:flex;color:#64748b;transition:all .2s}
        .close-btn:hover{background:#f1f5f9;color:#334155}
      `}</style>

      {/* Banner */}
      <div style={{height:"220px",background:"linear-gradient(135deg,#020c1b 0%,#0a1628 35%,#0d2045 65%,#071530 100%)",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:"-80px",right:"-40px",width:"320px",height:"320px",borderRadius:"50%",background:"radial-gradient(circle,rgba(30,64,175,.35) 0%,transparent 65%)"}}/>
        <div style={{position:"absolute",bottom:"-60px",left:"8%",width:"240px",height:"240px",borderRadius:"50%",background:"radial-gradient(circle,rgba(14,40,100,.5) 0%,transparent 65%)"}}/>
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(59,130,246,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,.03) 1px,transparent 1px)",backgroundSize:"52px 52px"}}/>
        <div style={{position:"absolute",top:"24px",left:"36px",display:"flex",gap:"12px",alignItems:"center"}}>
          <div style={{color:"rgba(96,165,250,.6)"}}><Icons.GraduationCap/></div>
          <span style={{fontSize:"15px",fontWeight:"800",letterSpacing:"0.1em",textTransform:"uppercase",color:"rgba(255,255,255,.55)"}}>Domrov</span>
        </div>
        {[...Array(14)].map((_,i)=>(
          <div key={i} style={{position:"absolute",width:i%4===0?"3px":"2px",height:i%4===0?"3px":"2px",borderRadius:"50%",background:`rgba(148,163,184,${i%3===0?.55:.25})`,left:`${(i*7.1)%92}%`,top:`${(i*13.3)%88}%`}}/>
        ))}
      </div>

      <div style={{maxWidth:"1280px",margin:"0 auto",padding:"0 40px 100px"}}>

        {/* Hero Card */}
        <div className="card fade-in d1" style={{marginTop:"-80px",marginBottom:"32px",padding:"36px 44px",display:"flex",alignItems:"center",gap:"32px",flexWrap:"wrap",borderTop:"4px solid #1d4ed8"}}>
          <div style={{position:"relative",flexShrink:0}}>
            <div className="avatar-glow" style={{width:"120px",height:"120px",borderRadius:"50%",border:"5px solid #fff",overflow:"hidden",background:"linear-gradient(135deg,#eff6ff,#dbeafe)"}}>
              <img src={avatarSrc} alt={fullName} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            </div>
            <div style={{position:"absolute",bottom:"6px",right:"6px",width:"20px",height:"20px",borderRadius:"50%",background:profile.status==="ACTIVE"?"#22c55e":"#94a3b8",border:"3px solid #fff"}}/>
          </div>

          <div style={{flex:1,minWidth:"220px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"14px",flexWrap:"wrap",marginBottom:"6px"}}>
              <h1 style={{fontSize:"28px",fontWeight:"800",color:"#0f172a",letterSpacing:"-0.03em"}}>{fullName}</h1>
              <span className="stat-pill" style={{background:"#f0fdf4",color:"#16a34a",border:"1.5px solid #bbf7d0"}}>
                <span style={{width:"7px",height:"7px",borderRadius:"50%",background:"#22c55e",display:"inline-block"}}/> {formatStatus(profile.status)}
              </span>
            </div>
            <div style={{color:"#64748b",fontSize:"14px",fontWeight:"500",display:"flex",alignItems:"center",gap:"8px"}}>
              <span style={{color:"#94a3b8"}}><Icons.Mail/></span>{profile.email}
            </div>
            <div style={{display:"flex",gap:"10px",marginTop:"14px",flexWrap:"wrap"}}>
              {[
                {label:"Student",color:"#eff6ff",tc:"#1d4ed8"},
                {label:`Joined ${formatDate(profile.created_at)}`,color:"#f5f3ff",tc:"#7c3aed"},
                profile.isVerified&&{label:"✓ Verified",color:"#f0fdf4",tc:"#16a34a"},
              ].filter(Boolean).map(({label,color,tc})=>(
                <span key={label} style={{background:color,color:tc,border:`1.5px solid ${tc}22`,borderRadius:"10px",padding:"6px 14px",fontSize:"12px",fontWeight:"700"}}>{label}</span>
              ))}
            </div>
          </div>

          <div style={{display:"flex",gap:"20px",flexShrink:0}}>
            {[{label:"Courses",value:"0",color:"#1d4ed8"},{label:"Credits",value:"$0",color:"#16a34a"},{label:"Badges",value:"0",color:"#d97706"}].map(({label,value,color})=>(
              <div key={label} style={{textAlign:"center",padding:"14px 18px",background:"#f8fafc",borderRadius:"16px",minWidth:"76px"}}>
                <div style={{fontSize:"24px",fontWeight:"800",color,lineHeight:1}}>{value}</div>
                <div style={{fontSize:"11px",fontWeight:"600",color:"#94a3b8",marginTop:"4px",textTransform:"uppercase",letterSpacing:"0.08em"}}>{label}</div>
              </div>
            ))}
          </div>

          {/* All 3 buttons in one row */}
          <div style={{display:"flex",gap:"10px",flexWrap:"wrap",alignItems:"center"}}>
            <button className="action-btn" style={{background:"linear-gradient(135deg,#16a34a,#15803d)",color:"#fff",boxShadow:"0 4px 16px rgba(22,163,74,.35)"}}>
              <Icons.Plus/> Add Credits
            </button>
            <button className="action-btn" style={{background:"linear-gradient(135deg,#ef4444,#dc2626)",color:"#fff",boxShadow:"0 4px 16px rgba(239,68,68,.35)"}}>
              <Icons.Minus/> Deduct Credits
            </button>
            <button className="edit-profile-btn" onClick={openEdit}>
              <Icons.Edit/> Edit Profile
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="fade-in d2" style={{display:"flex",gap:"6px",marginBottom:"28px",background:"#fff",padding:"7px",borderRadius:"16px",width:"fit-content",boxShadow:"0 2px 8px rgba(15,23,42,.06)"}}>
          {[["overview"],["transactions"]].map(([val])=>(
            <button key={val} className={`tab-btn ${activeTab===val?"active":""}`} onClick={()=>setActiveTab(val)}>
              {val==="overview"?<><Icons.BookOpen/><span>Overview</span></>:<><Icons.Wallet/><span>Transactions</span></>}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab==="overview"&&(
          <div className="fade-in d2" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"24px"}}>

            {/* Basic Information */}
            <div className="card" style={{padding:"36px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"28px",paddingBottom:"20px",borderBottom:"2px solid #f1f5f9"}}>
                <div className="icon-box" style={{background:"#eff6ff",color:"#1d4ed8"}}><Icons.User/></div>
                <div>
                  <div style={{fontSize:"16px",fontWeight:"800",color:"#0f172a"}}>Basic Information</div>
                  <div style={{fontSize:"12px",color:"#94a3b8",fontWeight:"500"}}>Personal details</div>
                </div>
              </div>
              {[
                {label:"First Name", value:profile.firstName,            Icon:Icons.User,          ic:"#eff6ff",cc:"#1d4ed8"},
                {label:"Last Name",  value:profile.lastName,             Icon:Icons.User,          ic:"#f5f3ff",cc:"#7c3aed"},
                {label:"Email",      value:profile.email,                Icon:Icons.Mail,          ic:"#eff6ff",cc:"#1d4ed8"},
                {label:"Phone",      value:profile.phoneNumber||"N/A",   Icon:Icons.Phone,         ic:"#f0fdf4",cc:"#16a34a"},
                {label:"Status",     value:formatStatus(profile.status), Icon:Icons.CheckCircle,   ic:"#f0fdf4",cc:"#16a34a",hl:true},
              ].map(({label,value,Icon,ic,cc,hl})=>(
                <div key={label} className="info-row">
                  <div className="icon-box" style={{background:ic,color:cc}}><Icon/></div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"11px",fontWeight:"700",color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:"3px"}}>{label}</div>
                    <div style={{fontSize:"14px",fontWeight:"700",color:hl?"#16a34a":"#1e293b"}}>{value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Account Details */}
            <div className="card" style={{padding:"36px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"28px",paddingBottom:"20px",borderBottom:"2px solid #f1f5f9"}}>
                <div className="icon-box" style={{background:"#f0fdf4",color:"#16a34a"}}><Icons.Shield/></div>
                <div>
                  <div style={{fontSize:"16px",fontWeight:"800",color:"#0f172a"}}>Account Details</div>
                  <div style={{fontSize:"12px",color:"#94a3b8",fontWeight:"500"}}>Account metadata</div>
                </div>
              </div>
              {[
                
                {label:"Date of Birth",value:formatDate(profile.dob),                   Icon:Icons.Cake,       ic:"#fffbeb",cc:"#d97706"},
                {label:"Gender",       value:formatGender(profile.gender),              Icon:Icons.Gender,     ic:"#faf5ff",cc:"#7c3aed"},
                {label:"Joined",       value:formatDate(profile.created_at),            Icon:Icons.Calendar,   ic:"#fffbeb",cc:"#d97706"},
                {label:"Last Updated", value:formatDate(profile.updated_at),            Icon:Icons.Clock,      ic:"#eff6ff",cc:"#1d4ed8"},
                {label:"Verification", value:profile.isVerified?"Verified":"Unverified",Icon:Icons.CheckCircle,ic:"#f0fdf4",cc:"#16a34a",hl:profile.isVerified},
              ].map(({label,value,Icon,ic,cc,hl})=>(
                <div key={label} className="info-row">
                  <div className="icon-box" style={{background:ic,color:cc}}><Icon/></div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"11px",fontWeight:"700",color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.09em",marginBottom:"3px"}}>{label}</div>
                    <div style={{fontSize:"14px",fontWeight:"700",color:hl?"#16a34a":"#1e293b"}}>{value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Credit Balance */}
            <div className="card" style={{padding:"36px",display:"flex",flexDirection:"column"}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"28px",paddingBottom:"20px",borderBottom:"2px solid #f1f5f9"}}>
                <div className="icon-box" style={{background:"#fffbeb",color:"#d97706"}}><Icons.Wallet/></div>
                <div>
                  <div style={{fontSize:"16px",fontWeight:"800",color:"#0f172a"}}>Credit Balance</div>
                  <div style={{fontSize:"12px",color:"#94a3b8",fontWeight:"500"}}>Spending summary</div>
                </div>
              </div>
              <div style={{background:"linear-gradient(135deg,#f0fdf4,#dcfce7)",borderRadius:"20px",padding:"28px 24px",textAlign:"center",marginBottom:"16px",border:"1.5px solid #bbf7d0"}}>
                <div style={{fontSize:"13px",fontWeight:"700",color:"#16a34a",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"8px"}}>Available Balance</div>
                <div style={{fontSize:"60px",fontWeight:"800",color:"#15803d",lineHeight:1,letterSpacing:"-0.04em"}}>$0</div>
                <div style={{fontSize:"13px",color:"#64748b",fontWeight:"600",marginTop:"8px"}}><span style={{color:"#94a3b8"}}>Total Spent:</span> $0.00</div>
              </div>
              <div style={{background:profile.isTwoFactorEnable?"#fffbeb":"#f8fafc",borderRadius:"14px",padding:"14px 16px",border:`1.5px solid ${profile.isTwoFactorEnable?"#fcd34d":"#e2e8f0"}`,display:"flex",alignItems:"center",gap:"12px",marginBottom:"16px"}}>
                <div style={{width:"36px",height:"36px",borderRadius:"10px",background:profile.isTwoFactorEnable?"rgba(217,151,6,.12)":"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",color:profile.isTwoFactorEnable?"#d97706":"#94a3b8"}}><Icons.Lock/></div>
                <div style={{flex:1}}>
                  <div style={{fontSize:"13px",fontWeight:"700",color:"#334155"}}>Two-Factor Auth</div>
                  <div style={{fontSize:"12px",color:profile.isTwoFactorEnable?"#d97706":"#94a3b8",fontWeight:"600"}}>{profile.isTwoFactorEnable?"Enabled":"Not enabled"}</div>
                </div>
                <span className="stat-pill" style={{background:profile.isTwoFactorEnable?"#fffbeb":"#f1f5f9",color:profile.isTwoFactorEnable?"#d97706":"#94a3b8",border:`1px solid ${profile.isTwoFactorEnable?"#fcd34d":"#e2e8f0"}`,fontSize:"11px"}}>
                  {profile.isTwoFactorEnable?"ON":"OFF"}
                </span>
              </div>
              <div style={{background:"#f8fafc",borderRadius:"16px",padding:"24px",border:"2px dashed #e2e8f0",textAlign:"center",flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"10px"}}>
                <div style={{width:"44px",height:"44px",borderRadius:"14px",background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center",color:"#1d4ed8"}}><Icons.Package/></div>
                <div style={{fontSize:"14px",fontWeight:"700",color:"#334155"}}>No Packages Yet</div>
                <div style={{fontSize:"13px",color:"#94a3b8",lineHeight:1.5}}>Purchase a learning package to get started</div>
              </div>
            </div>
          </div>
        )}

        {/* Transactions */}
        {activeTab==="transactions"&&(
          <div className="card fade-in d2" style={{overflow:"hidden"}}>
            <div style={{padding:"28px 36px",borderBottom:"2px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"16px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
                <div className="icon-box" style={{background:"#eff6ff",color:"#1d4ed8"}}><Icons.Wallet/></div>
                <div>
                  <div style={{fontSize:"18px",fontWeight:"800",color:"#0f172a"}}>Recent Transactions</div>
                  <div style={{fontSize:"13px",color:"#94a3b8",marginTop:"2px",fontWeight:"500"}}>{transactions.length} records found</div>
                </div>
              </div>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                {Object.entries(reasonColors).map(([r,rc])=>(
                  <span key={r} className="stat-pill" style={{background:rc.bg,color:rc.color,border:`1.5px solid ${rc.border}`}}>
                    <span style={{width:"6px",height:"6px",borderRadius:"50%",background:rc.color,display:"inline-block"}}/>{r}
                  </span>
                ))}
              </div>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:"#f8fafc"}}>
                  {["ID","Amount","Reason","Balance Before","Balance After","Date"].map(h=>(
                    <th key={h} style={{padding:"16px 28px",textAlign:"left",fontSize:"11px",fontWeight:"800",color:"#64748b",textTransform:"uppercase",letterSpacing:"0.1em"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx,i)=>{
                  const rc=reasonColors[tx.reason]||{bg:"#f8fafc",color:"#475569",border:"#e2e8f0"};
                  return(
                    <tr key={tx.id} className="tx-row" style={{borderTop:"1px solid #f1f5f9",background:i%2===0?"#fff":"#fafafa"}}>
                      <td style={{padding:"18px 28px",fontSize:"13px",fontWeight:"700",color:"#94a3b8"}}>#{tx.id}</td>
                      <td style={{padding:"18px 28px"}}><span style={{fontSize:"16px",fontWeight:"800",color:"#0f172a"}}>${tx.amount.toLocaleString()}</span></td>
                      <td style={{padding:"18px 28px"}}>
                        <span className="stat-pill" style={{background:rc.bg,color:rc.color,border:`1.5px solid ${rc.border}`}}>
                          <span style={{width:"6px",height:"6px",borderRadius:"50%",background:rc.color,display:"inline-block"}}/>{tx.reason}
                        </span>
                      </td>
                      <td style={{padding:"18px 28px",fontSize:"14px",color:"#64748b",fontWeight:"600"}}>${tx.balanceBefore.toLocaleString()}</td>
                      <td style={{padding:"18px 28px",fontSize:"14px",color:"#64748b",fontWeight:"600"}}>${tx.balanceAfter.toLocaleString()}</td>
                      <td style={{padding:"18px 28px"}}><span style={{fontSize:"13px",color:"#94a3b8",fontWeight:"600",background:"#f1f5f9",padding:"4px 12px",borderRadius:"8px"}}>{tx.date}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {editOpen&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&closeEdit()}>
          <div className="modal">

            {/* Header — clean, no API/code mentions */}
            <div className="modal-header">
              <div>
                <div style={{fontSize:"20px",fontWeight:"800",color:"#0f172a",letterSpacing:"-0.02em"}}>Edit Profile</div>
                <div style={{fontSize:"13px",color:"#94a3b8",marginTop:"3px",fontWeight:"500"}}>Update your personal information</div>
              </div>
              <button className="close-btn" onClick={closeEdit}><Icons.X/></button>
            </div>

            <div className="modal-body">

              {/* Profile Picture */}
              <div className="form-group full" style={{marginBottom:"24px"}}>
                <label className="form-label">Profile Picture</label>
                <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleAvatarChange}/>

                {avatarPreview ? (
                  <div style={{display:"flex",alignItems:"center",gap:"16px",padding:"16px 20px",border:"1.5px solid #bbf7d0",borderRadius:"16px",background:"#f0fdf4"}}>
                    <div style={{width:"64px",height:"64px",borderRadius:"50%",overflow:"hidden",border:"3px solid #fff",boxShadow:"0 4px 12px rgba(0,0,0,.1)",flexShrink:0}}>
                      <img src={avatarPreview} alt="preview" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:"14px",fontWeight:"700",color:"#16a34a",marginBottom:"3px"}}> New photo ready</div>
                      <div style={{fontSize:"12px",color:"#64748b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"200px"}}>{avatarFile?.name}</div>
                    </div>
                    <div style={{display:"flex",gap:"8px"}}>
                      <button onClick={()=>fileInputRef.current?.click()} style={{cursor:"pointer",border:"1.5px solid #e2e8f0",background:"#fff",borderRadius:"10px",padding:"8px 14px",fontSize:"13px",fontWeight:"600",color:"#475569",display:"flex",alignItems:"center",gap:"6px"}}>
                        <Icons.Camera/> Change
                      </button>
                      <button onClick={()=>{setAvatarPreview(null);setAvatarFile(null);}} style={{cursor:"pointer",border:"1.5px solid #fecaca",background:"#fef2f2",borderRadius:"10px",padding:"8px 12px",fontSize:"13px",fontWeight:"600",color:"#dc2626",display:"flex",alignItems:"center",gap:"6px"}}>
                        <Icons.Trash/>
                      </button>
                    </div>
                  </div>
                ):(
                  <div className="upload-zone" onClick={()=>fileInputRef.current?.click()}>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"12px"}}>
                      <div style={{width:"52px",height:"52px",borderRadius:"16px",background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center",color:"#1d4ed8"}}>
                        <Icons.Upload/>
                      </div>
                      <div>
                        <div style={{fontSize:"14px",fontWeight:"700",color:"#334155"}}>Click to upload a new photo</div>
                        <div style={{fontSize:"12px",color:"#94a3b8",marginTop:"4px"}}>PNG, JPG, WEBP — max 5 MB</div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 16px",background:"#fff",borderRadius:"10px",border:"1px solid #e2e8f0"}}>
                        <div style={{width:"26px",height:"26px",borderRadius:"50%",overflow:"hidden",flexShrink:0}}>
                          <img src={profile.profilePictureUrl} alt="current" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                        </div>
                        <span style={{fontSize:"12px",color:"#64748b",fontWeight:"500"}}>Current photo</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Form fields */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input className="form-input" placeholder="First name" value={form.firstName} onChange={e=>setForm(f=>({...f,firstName:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input className="form-input" placeholder="Last name" value={form.lastName} onChange={e=>setForm(f=>({...f,lastName:e.target.value}))}/>
                </div>
                <div className="form-group full">
                  <label className="form-label">Email Address</label>
                  <input className="form-input" type="email" placeholder="email@example.com" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input className="form-input" placeholder="0123456789" value={form.phoneNumber} onChange={e=>setForm(f=>({...f,phoneNumber:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-input form-select" value={form.gender} onChange={e=>setForm(f=>({...f,gender:e.target.value}))}>
                    <option value="">Select gender</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group full">
                  <label className="form-label">Date of Birth</label>
                  <input className="form-input" type="date" value={form.dob} onChange={e=>setForm(f=>({...f,dob:e.target.value}))}/>
                </div>
              </div>

              {/* Status feedback */}
              {saveStatus==="success"&&(
                <div style={{background:"#f0fdf4",border:"1.5px solid #86efac",borderRadius:"12px",padding:"14px 16px",display:"flex",alignItems:"center",gap:"10px",color:"#16a34a",fontSize:"14px",fontWeight:"600"}}>
                  <Icons.CheckCircle/> Profile updated successfully!
                </div>
              )}
              {saveStatus==="error"&&(
                <div style={{background:"#fef2f2",border:"1.5px solid #fecaca",borderRadius:"12px",padding:"14px 16px",color:"#dc2626",fontSize:"14px",fontWeight:"600"}}>
                  Something went wrong. Please try again.
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={closeEdit} disabled={saving}><Icons.X/> Cancel</button>
              <button className="save-btn" onClick={handleSave} disabled={saving}>
                {saving?<Icons.Loader/>:<Icons.Save/>}
                {saving?"Saving…":"Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}