import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";

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

type ReasonKey = "AI Usage" | "Refund" | "Adjustment" | "Payment";
const reasonColors: Record<ReasonKey, { bg: string; color: string; border: string }> = {
  "AI Usage":   { bg: "#fff1f0", color: "#cf1322", border: "#ffa39e" },
  "Refund":     { bg: "#f6ffed", color: "#389e0d", border: "#b7eb8f" },
  "Adjustment": { bg: "#fffbe6", color: "#d48806", border: "#ffe58f" },
  "Payment":    { bg: "#e6f4ff", color: "#0958d9", border: "#91caff" },
};

const API_URL = "https://api.domrov.app/users/me";

const Icons = {
  Mail:          () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>),
  Phone:         () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1 19.79 19.79 0 0 1 1.64 4.5 2 2 0 0 1 3.6 2.32h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.06 6.06l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17z"/></svg>),
  User:          () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>),
  Calendar:      () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>),
  Clock:         () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
  CheckCircle:   () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>),
  Gender:        () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="5"/><path d="M12 14v7M9 18h6"/></svg>),
  Wallet:        () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>),
  Package:       () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></svg>),
  GraduationCap: () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>),
  BookOpen:      () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>),
  Plus:          () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>),
  Minus:         () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/></svg>),
  Edit:          () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>),
  X:             () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>),
  Save:          () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>),
  Camera:        () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>),
  Loader:        () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{animation:"spin 1s linear infinite"}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>),
  Lock:          () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>),
  Cake:          () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20M12 3v3M8 7v1M16 7v1"/></svg>),
  Upload:        () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>),
  Trash:         () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>),
};

const formatGender = (g: string): string =>
  (({ M: "Male", F: "Female", "": "N/A" } as Record<string, string>)[g] ?? g ?? "N/A");
const formatDate = (d: string | Date | undefined): string => {
  if (!d) return "N/A";
  try { return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }); }
  catch { return String(d); }
};
const formatStatus = (s: string | undefined): string => (s === "ACTIVE" ? "Active" : s ?? "N/A");
const getInitials = (firstName: string, lastName?: string): string => {
  const f = firstName?.[0]?.toUpperCase() ?? "";
  const l = lastName?.[0]?.toUpperCase() ?? "";
  return f + l || "?";
};

interface ExtendedUser {
  id: number;
  firstName: string;
  lastName?: string;
  email: string;
  gender?: string;
  dob?: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  isVerified?: boolean;
  isTwoFactorEnable?: boolean;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  gender: string;
  dob: string;
}

export default function UserProfile() {
  const { user, isLoading: loading, token } = useAuth();
  const profile = user as ExtendedUser | null;

  const [activeTab,     setActiveTab]     = useState<string>("overview");
  const [editOpen,      setEditOpen]      = useState<boolean>(false);
  const [saving,        setSaving]        = useState<boolean>(false);
  const [saveStatus,    setSaveStatus]    = useState<string | null>(null);
  const [form,          setForm]          = useState<FormState>({ firstName: "", lastName: "", email: "", phoneNumber: "", gender: "", dob: "" });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile,    setAvatarFile]    = useState<File | null>(null);
  const [imgError,      setImgError]      = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fullName     = profile ? `${profile.firstName} ${profile.lastName ?? ""}`.trim() : "";
  const initials     = profile ? getInitials(profile.firstName, profile.lastName) : "?";
  const avatarSrc    = avatarPreview ?? (imgError ? undefined : profile?.profilePictureUrl ?? undefined);
  const showInitials = !avatarSrc;
  const isActive     = profile?.status === "ACTIVE";

  const openEdit = () => {
    if (!profile) return;
    setForm({
      firstName:   profile.firstName,
      lastName:    profile.lastName    ?? "",
      email:       profile.email,
      phoneNumber: profile.phoneNumber ?? "",
      gender:      profile.gender      ?? "",
      dob:         profile.dob         ?? "",
    });
    setAvatarPreview(null); setAvatarFile(null); setSaveStatus(null); setImgError(false); setEditOpen(true);
  };
  const closeEdit = () => { setEditOpen(false); setSaveStatus(null); setAvatarPreview(null); setAvatarFile(null); };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setImgError(false);
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true); setSaveStatus(null);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([k, v]) => body.append(k, v));
      if (avatarFile) body.append("profilePicture", avatarFile);
      await fetch(API_URL, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const updated = { ...profile, ...form, profilePictureUrl: avatarPreview ?? profile.profilePictureUrl, updated_at: new Date().toISOString() };
      localStorage.setItem("user", JSON.stringify(updated));
    } catch (_) { /* ignore */ }
    setSaveStatus("success");
    setSaving(false);
    setTimeout(() => { setEditOpen(false); setSaveStatus(null); setAvatarPreview(null); }, 1400);
  };

  if (loading) return <div style={{ padding: 40, fontSize: 15, color: "#888" }}>Loading...</div>;
  if (!profile) return <div style={{ padding: 40, fontSize: 15, color: "#888" }}>No user data found.</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f9", fontFamily: "'Inter','Segoe UI',sans-serif", color: "#111" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes spin    { to { transform:rotate(360deg) } }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes modalIn { from{opacity:0;transform:scale(.97)} to{opacity:1;transform:scale(1)} }
        .fade-in { animation:fadeUp .3s ease forwards; opacity:0; }
        .d1 { animation-delay:.04s } .d2 { animation-delay:.1s }
        .card { background:#fff; border-radius:12px; border:1px solid #e5e5e5; }

        /* Tabs */
        .tab-btn { cursor:pointer; border:none; background:none; font-family:inherit; font-size:13px; font-weight:600; padding:7px 16px; border-radius:7px; transition:all .15s; color:#888; display:flex; align-items:center; gap:6px; }
        .tab-btn:hover { color:#111; background:#f0f0f0; }
        .tab-btn.active { color:#1677ff; background:#e6f4ff; }

        /* Info rows — icon kept, just no icon in section header */
        .info-row { display:flex; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid #f0f0f0; }
        .info-row:last-child { border-bottom:none; }
        .icon-box { width:30px; height:30px; border-radius:7px; display:flex; align-items:center; justify-content:center; flex-shrink:0; background:#f5f5f5; color:#555; }

        .tx-row { transition:background .1s; }
        .tx-row:hover { background:#f5f8ff !important; }

        /* Buttons */
        .btn { cursor:pointer; border:1px solid #e5e5e5; font-family:inherit; font-size:13px; font-weight:600; padding:8px 16px; border-radius:8px; transition:all .15s; display:inline-flex; align-items:center; gap:6px; background:#fff; color:#111; white-space:nowrap; }
        .btn:hover:not(:disabled) { background:#f5f5f5; }
        .btn:disabled { opacity:.45; cursor:not-allowed; }
        .btn-green { background:#f6ffed; color:#389e0d; border-color:#b7eb8f; }
        .btn-green:hover:not(:disabled) { background:#d9f7be; border-color:#95de64; }
        .btn-red   { background:#fff1f0; color:#cf1322; border-color:#ffa39e; }
        .btn-red:hover:not(:disabled)   { background:#ffccc7; border-color:#ff7875; }
        .btn-blue  { background:#1677ff; color:#fff; border-color:#1677ff; }
        .btn-blue:hover:not(:disabled)  { background:#0958d9; border-color:#0958d9; }
        .btn-dark  { background:#111; color:#fff; border-color:#111; }
        .btn-dark:hover:not(:disabled)  { background:#2a2a2a; border-color:#2a2a2a; }

        /* Modal */
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:200; display:flex; align-items:center; justify-content:center; padding:20px; }
        .modal { background:#fff; border-radius:14px; width:100%; max-width:500px; max-height:90vh; overflow-y:auto; border:1px solid #e5e5e5; animation:modalIn .2s ease; }
        .form-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .form-group { margin-bottom:14px; }
        .form-group.full { grid-column:1/-1; }
        .form-label { display:block; font-size:10px; font-weight:700; color:#aaa; margin-bottom:5px; letter-spacing:.05em; text-transform:uppercase; }
        .form-input { width:100%; padding:9px 11px; border-radius:7px; border:1px solid #e5e5e5; font-family:inherit; font-size:13px; font-weight:500; color:#111; background:#fafafa; transition:border .15s,box-shadow .15s; outline:none; }
        .form-input:focus { border-color:#1677ff; background:#fff; box-shadow:0 0 0 3px rgba(22,119,255,.1); }
        .form-select { appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23aaa' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 10px center; padding-right:30px; cursor:pointer; }
        .upload-zone { border:1.5px dashed #d4d4d4; border-radius:10px; padding:22px 16px; text-align:center; cursor:pointer; transition:all .15s; background:#fafafa; }
        .upload-zone:hover { border-color:#1677ff; background:#f0f7ff; }
        .avatar-initials { width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#1677ff,#0958d9); color:#fff; font-size:26px; font-weight:700; }
      `}</style>

      {/* Banner */}
      <div style={{ height: "160px", background: "#0a0f1e", position: "relative", overflow: "hidden" }}>
        <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(22,119,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(22,119,255,.07) 1px,transparent 1px)", backgroundSize:"36px 36px" }}/>
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:"600px", height:"200px", background:"radial-gradient(ellipse,rgba(22,119,255,.12) 0%,transparent 70%)", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", top:"18px", left:"28px", display:"flex", gap:"8px", alignItems:"center" }}>
          <span style={{ color:"rgba(22,119,255,.7)" }}><Icons.GraduationCap/></span>
          <span style={{ fontSize:"12px", fontWeight:"700", letterSpacing:"0.14em", textTransform:"uppercase", color:"rgba(255,255,255,.35)" }}>Domrov</span>
        </div>
      </div>

      <div style={{ maxWidth: "1160px", margin: "0 auto", padding: "0 28px 80px" }}>

        {/* Hero card */}
        <div className="card fade-in d1" style={{ marginTop: "-52px", marginBottom: "20px", padding: "24px 28px", display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{ width: "84px", height: "84px", borderRadius: "50%", border: `3px solid ${isActive ? "#b7eb8f" : "#e5e5e5"}`, overflow: "hidden", background: "#e6f4ff" }}>
              {showInitials ? (
                <div className="avatar-initials">{initials}</div>
              ) : (
                <img src={avatarSrc} alt={fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setImgError(true)}/>
              )}
            </div>
            <div style={{ position: "absolute", bottom: "4px", right: "4px", width: "14px", height: "14px", borderRadius: "50%", background: isActive ? "#52c41a" : "#bbb", border: "2px solid #fff" }}/>
          </div>

          <div style={{ flex: 1, minWidth: "180px" }}>
            <h1 style={{ fontSize: "20px", fontWeight: "700", color: "#111", letterSpacing: "-0.02em", marginBottom: "4px" }}>{fullName}</h1>
            <div style={{ color: "#888", fontSize: "13px", display: "flex", alignItems: "center", gap: "5px" }}>
              <Icons.Mail/> {profile.email}
            </div>
            <div style={{ marginTop: "6px", fontSize: "11px", color: "#bbb" }}>Joined {formatDate(profile.created_at)}</div>
          </div>

          <div style={{ display: "flex", gap: "6px", flexShrink: 0, flexWrap: "wrap" }}>
            <button className="btn btn-green"><Icons.Plus/> Add Credits</button>
            <button className="btn btn-red"><Icons.Minus/> Deduct Credits</button>
            <button className="btn btn-blue" onClick={openEdit}><Icons.Edit/> Edit Profile</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="fade-in d2" style={{ display: "flex", gap: "3px", marginBottom: "18px", background: "#fff", padding: "4px", borderRadius: "9px", width: "fit-content", border: "1px solid #e5e5e5" }}>
          {(["overview", "transactions"] as const).map(val => (
            <button key={val} className={`tab-btn ${activeTab === val ? "active" : ""}`} onClick={() => setActiveTab(val)}>
              {val === "overview" ? <><Icons.BookOpen/><span>Overview</span></> : <><Icons.Wallet/><span>Transactions</span></>}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === "overview" && (
          <div className="fade-in d2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "18px" }}>

            {/* Basic Information — NO icon in header, icons kept in each row */}
            <div className="card" style={{ padding: "22px" }}>
              <div style={{ marginBottom: "18px", paddingBottom: "12px", borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#111" }}>Basic Information</div>
                <div style={{ fontSize: "11px", color: "#bbb", marginTop: "2px" }}>Personal details</div>
              </div>
              {[
                { label: "First Name", value: profile.firstName,            Icon: Icons.User },
                { label: "Last Name",  value: profile.lastName   ?? "N/A",  Icon: Icons.User },
                { label: "Email",      value: profile.email,                Icon: Icons.Mail },
                { label: "Phone",      value: profile.phoneNumber ?? "N/A", Icon: Icons.Phone },
                { label: "Status",     value: formatStatus(profile.status), Icon: Icons.CheckCircle },
              ].map(({ label, value, Icon }) => (
                <div key={label} className="info-row">
                  <div className="icon-box"><Icon/></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "10px", fontWeight: "600", color: "#bbb", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "2px" }}>{label}</div>
                    {label === "Status" ? (
                      <span style={{ display:"inline-flex", alignItems:"center", gap:"5px", padding:"2px 9px", borderRadius:"20px", fontSize:"12px", fontWeight:"700", background: isActive ? "#f6ffed" : "#f5f5f5", color: isActive ? "#389e0d" : "#888", border:`1px solid ${isActive ? "#b7eb8f" : "#e5e5e5"}` }}>
                        <span style={{ width:"6px", height:"6px", borderRadius:"50%", background: isActive ? "#52c41a" : "#bbb", display:"inline-block" }}/>{value}
                      </span>
                    ) : (
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#111" }}>{value}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Account Details — NO icon in header, icons kept in each row */}
            <div className="card" style={{ padding: "22px" }}>
              <div style={{ marginBottom: "18px", paddingBottom: "12px", borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#111" }}>Account Details</div>
                <div style={{ fontSize: "11px", color: "#bbb", marginTop: "2px" }}>Account metadata</div>
              </div>
              {[
                { label: "Date of Birth", value: formatDate(profile.dob),                        Icon: Icons.Cake },
                { label: "Gender",        value: formatGender(profile.gender ?? ""),             Icon: Icons.Gender },
                { label: "Joined",        value: formatDate(profile.created_at),                 Icon: Icons.Calendar },
                { label: "Last Updated",  value: formatDate(profile.updated_at),                 Icon: Icons.Clock },
                { label: "Verification",  value: profile.isVerified ? "Verified" : "Unverified", Icon: Icons.CheckCircle },
              ].map(({ label, value, Icon }) => (
                <div key={label} className="info-row">
                  <div className="icon-box"><Icon/></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "10px", fontWeight: "600", color: "#bbb", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "2px" }}>{label}</div>
                    {label === "Verification" ? (
                      <span style={{ display:"inline-flex", alignItems:"center", gap:"4px", padding:"2px 9px", borderRadius:"20px", fontSize:"12px", fontWeight:"700", background: profile.isVerified ? "#e6f4ff" : "#f5f5f5", color: profile.isVerified ? "#0958d9" : "#888", border:`1px solid ${profile.isVerified ? "#91caff" : "#e5e5e5"}` }}>
                        {profile.isVerified && <Icons.CheckCircle/>}{value}
                      </span>
                    ) : (
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#111" }}>{value}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Credit Balance — NO icon in header, icons kept inside rows */}
            <div className="card" style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ paddingBottom: "12px", borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#111" }}>Credit Balance</div>
                <div style={{ fontSize: "11px", color: "#bbb", marginTop: "2px" }}>Spending summary</div>
              </div>
              <div style={{ background: "linear-gradient(135deg,#f6ffed,#d9f7be)", borderRadius: "9px", padding: "18px", textAlign: "center", border: "1px solid #b7eb8f" }}>
                <div style={{ fontSize: "10px", fontWeight: "700", color: "#52c41a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "5px" }}>Available Balance</div>
                <div style={{ fontSize: "44px", fontWeight: "700", color: "#237804", lineHeight: 1 }}>$0</div>
                <div style={{ fontSize: "11px", color: "#8c8c8c", marginTop: "5px" }}>Total Spent: $0.00</div>
              </div>
              {/* 2FA row — icon kept */}
              <div style={{ background: "#fafafa", borderRadius: "9px", padding: "11px 13px", border: "1px solid #e5e5e5", display: "flex", alignItems: "center", gap: "9px" }}>
                <div className="icon-box"><Icons.Lock/></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#111" }}>Two-Factor Auth</div>
                  <div style={{ fontSize: "11px", color: "#bbb" }}>{profile.isTwoFactorEnable ? "Enabled" : "Not enabled"}</div>
                </div>
                <span style={{ display:"inline-flex", alignItems:"center", padding:"2px 9px", borderRadius:"20px", fontSize:"11px", fontWeight:"700", background: profile.isTwoFactorEnable ? "#fffbe6" : "#f5f5f5", color: profile.isTwoFactorEnable ? "#d48806" : "#888", border:`1px solid ${profile.isTwoFactorEnable ? "#ffe58f" : "#e5e5e5"}` }}>
                  {profile.isTwoFactorEnable ? "ON" : "OFF"}
                </span>
              </div>
              {/* No packages — icon kept */}
              <div style={{ background: "#fafafa", borderRadius: "9px", padding: "18px", border: "1.5px dashed #e5e5e5", textAlign: "center", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "7px" }}>
                <div className="icon-box"><Icons.Package/></div>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#111" }}>No Packages Yet</div>
                <div style={{ fontSize: "11px", color: "#bbb" }}>Purchase a learning package to get started</div>
              </div>
            </div>
          </div>
        )}

        {/* Transactions */}
        {activeTab === "transactions" && (
          <div className="card fade-in d2" style={{ overflow: "hidden" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#111" }}>Recent Transactions</div>
                <div style={{ fontSize: "11px", color: "#bbb", marginTop: "2px" }}>{transactions.length} records</div>
              </div>
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                {(Object.keys(reasonColors) as ReasonKey[]).map(r => {
                  const rc = reasonColors[r];
                  return (
                    <span key={r} style={{ display:"inline-flex", alignItems:"center", gap:"4px", padding:"2px 10px", borderRadius:"20px", fontSize:"11px", fontWeight:"600", background: rc.bg, color: rc.color, border:`1px solid ${rc.border}` }}>
                      <span style={{ width:"5px", height:"5px", borderRadius:"50%", background: rc.color, display:"inline-block" }}/>{r}
                    </span>
                  );
                })}
              </div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  {["ID","Amount","Reason","Balance Before","Balance After","Date"].map(h => (
                    <th key={h} style={{ padding: "11px 22px", textAlign: "left", fontSize: "10px", fontWeight: "700", color: "#aaa", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => {
                  const rc = (reasonColors as Record<string, { bg: string; color: string; border: string }>)[tx.reason]
                    || { bg: "#f5f5f5", color: "#555", border: "#e5e5e5" };
                  return (
                    <tr key={tx.id} className="tx-row" style={{ borderTop: "1px solid #f0f0f0", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "13px 22px", fontSize: "12px", fontWeight: "600", color: "#bbb" }}>#{tx.id}</td>
                      <td style={{ padding: "13px 22px" }}><span style={{ fontSize: "14px", fontWeight: "700", color: "#111" }}>${tx.amount.toLocaleString()}</span></td>
                      <td style={{ padding: "13px 22px" }}>
                        <span style={{ display:"inline-flex", alignItems:"center", gap:"4px", padding:"2px 10px", borderRadius:"20px", fontSize:"11px", fontWeight:"600", background: rc.bg, color: rc.color, border:`1px solid ${rc.border}` }}>
                          <span style={{ width:"5px", height:"5px", borderRadius:"50%", background: rc.color, display:"inline-block" }}/>{tx.reason}
                        </span>
                      </td>
                      <td style={{ padding: "13px 22px", fontSize: "13px", color: "#555", fontWeight: "500" }}>${tx.balanceBefore.toLocaleString()}</td>
                      <td style={{ padding: "13px 22px", fontSize: "13px", color: "#555", fontWeight: "500" }}>${tx.balanceAfter.toLocaleString()}</td>
                      <td style={{ padding: "13px 22px", fontSize: "12px", color: "#bbb", fontWeight: "500" }}>{tx.date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeEdit()}>
          <div className="modal">
            <div style={{ padding: "22px 26px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f0f0f0" }}>
              <div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#111" }}>Edit Profile</div>
                <div style={{ fontSize: "12px", color: "#aaa", marginTop: "2px" }}>Update your personal information</div>
              </div>
              <button className="btn" style={{ padding: "5px 9px" }} onClick={closeEdit}><Icons.X/></button>
            </div>

            <div style={{ padding: "22px 26px" }}>
              <div className="form-group full" style={{ marginBottom: "18px" }}>
                <label className="form-label">Profile Picture</label>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange}/>
                {avatarPreview ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", border: "1px solid #b7eb8f", borderRadius: "9px", background: "#f6ffed" }}>
                    <div style={{ width: "48px", height: "48px", borderRadius: "50%", overflow: "hidden", border: "2px solid #b7eb8f", flexShrink: 0 }}>
                      <img src={avatarPreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#389e0d", marginBottom: "2px" }}>New photo ready</div>
                      <div style={{ fontSize: "11px", color: "#aaa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>{avatarFile?.name}</div>
                    </div>
                    <div style={{ display: "flex", gap: "5px" }}>
                      <button className="btn" style={{ padding: "5px 10px", fontSize: "12px" }} onClick={() => fileInputRef.current?.click()}><Icons.Camera/> Change</button>
                      <button className="btn btn-red" style={{ padding: "5px 9px", fontSize: "12px" }} onClick={() => { setAvatarPreview(null); setAvatarFile(null); }}><Icons.Trash/></button>
                    </div>
                  </div>
                ) : (
                  <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "9px" }}>
                      <div className="icon-box" style={{ width: "40px", height: "40px", borderRadius: "9px", background: "#e6f4ff", color: "#1677ff" }}><Icons.Upload/></div>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: "#111" }}>Click to upload a new photo</div>
                        <div style={{ fontSize: "11px", color: "#aaa", marginTop: "3px" }}>PNG, JPG, WEBP — max 5 MB</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "7px", padding: "5px 12px", background: "#fff", borderRadius: "7px", border: "1px solid #e5e5e5" }}>
                        <div style={{ width: "22px", height: "22px", borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "#e6f4ff" }}>
                          {showInitials ? (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#1677ff,#0958d9)", color: "#fff", fontSize: "9px", fontWeight: "700" }}>{initials}</div>
                          ) : (
                            <img src={profile.profilePictureUrl} alt="current" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setImgError(true)}/>
                          )}
                        </div>
                        <span style={{ fontSize: "11px", color: "#888" }}>Current photo</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input className="form-input" placeholder="First name" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input className="form-input" placeholder="Last name" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}/>
                </div>
                <div className="form-group full">
                  <label className="form-label">Email Address</label>
                  <input className="form-input" type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input className="form-input" placeholder="0123456789" value={form.phoneNumber} onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select className="form-input form-select" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="">Select gender</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group full">
                  <label className="form-label">Date of Birth</label>
                  <input className="form-input" type="date" value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))}/>
                </div>
              </div>

              {saveStatus === "success" && (
                <div style={{ background: "#f6ffed", border: "1px solid #b7eb8f", borderRadius: "7px", padding: "11px 13px", display: "flex", alignItems: "center", gap: "7px", color: "#389e0d", fontSize: "13px", fontWeight: "600" }}>
                  <Icons.CheckCircle/> Profile updated successfully!
                </div>
              )}
              {saveStatus === "error" && (
                <div style={{ background: "#fff1f0", border: "1px solid #ffa39e", borderRadius: "7px", padding: "11px 13px", color: "#cf1322", fontSize: "13px", fontWeight: "600" }}>
                  Something went wrong. Please try again.
                </div>
              )}
            </div>

            <div style={{ padding: "14px 26px 22px", display: "flex", gap: "8px", justifyContent: "flex-end", borderTop: "1px solid #f0f0f0" }}>
              <button className="btn" onClick={closeEdit} disabled={saving}><Icons.X/> Cancel</button>
              <button className="btn btn-dark" onClick={handleSave} disabled={saving}>
                {saving ? <Icons.Loader/> : <Icons.Save/>}
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}