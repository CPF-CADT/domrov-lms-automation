import React, { useState, useEffect } from "react";
// import { FileUploader } from "./components/FileUploader";
// import { FileDownloader } from "./components/FileDownloader";
// import PaymentComponent from "./components/Payment";

import GoogleOAuthButton from "./components/GoogleOAuthButton";
import GitHubOAuthButton from "./components/GitHubOAuthButton";
import PaymentComponent from "./components/Payment";
import { FileUploader } from "./components/FileUploader";
import { FileDownloader } from "./components/FIleDownloader";


type TestUI = "payment" | "uploader" | "downloader" | "oauth";

const App: React.FC = () => {

  // return (
  //   <div style={{ padding: "2rem" }}>
  //     <h1>OAuth Login</h1>
  //     <GoogleOAuthButton redirectUrl="http://localhost:3000/auth/google/login" />
  //     <div>
  //       <h2 style={{ marginTop: "2rem" }}>OR</h2>
  //     </div>
  //     <GitHubOAuthButton redirectUrl="http://localhost:3000/auth/github/login" />
  //   </div>
  // );


  // 1️⃣ Load token from localStorage on mount
  const [token, setToken] = useState<string>(() => {
    return localStorage.getItem("jwtToken") || "";
  });

  // UI switcher state
  const [selectedUI, setSelectedUI] = useState<TestUI>("payment");

  // // 2️⃣ Update localStorage whenever token changes
  useEffect(() => {
    if (token) {
      localStorage.setItem("jwtToken", token);
    } else {
      localStorage.removeItem("jwtToken");
    }
  }, [token]);


  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <label>
          <b>Switch Test UI: </b>
          <select value={selectedUI} onChange={e => setSelectedUI(e.target.value as TestUI)}>
            <option value="payment">Payment</option>
            <option value="uploader">File Uploader</option>
            <option value="downloader">File Downloader</option>
            <option value="oauth">OAuth Login</option>
          </select>
        </label>
      </div>

      {/* Render selected UI */}
      {selectedUI === "payment" && <PaymentComponent userId={1} packageId={4} />}
      {selectedUI === "uploader" && (
        <FileUploader
          presignedUrlEndpoint="http://localhost:3000/file/presigned-url"
          notifyEndpoint="http://localhost:3000/file/notify-upload"
          token={token}
          resourceId={2}
          resourceType="assessment"
          onUploadSuccess={key => console.log("Uploaded:", key)}
          onUploadError={err => console.error("Error:", err)}
        />
      )}
      {selectedUI === "downloader" && (
        <div>
          <h1>Download File from R2 via Backend</h1>
          <FileDownloader
            resourceId={3}
            downloadEndpoint="http://localhost:3000/file/download/"
            token={token}
          />
        </div>
      )}
      {selectedUI === "oauth" && (
        <div>
          <h1>OAuth Login</h1>
          <GoogleOAuthButton redirectUrl="http://localhost:3000/auth/google/login" />
          <div>
            <h2 style={{ marginTop: "2rem" }}>OR</h2>
          </div>
          <GitHubOAuthButton redirectUrl="http://localhost:3000/auth/github/login" />
        </div>
      )}

      {/* JWT token input */}
      <div style={{ marginBottom: "1rem", marginTop: "2rem" }}>
        <label>
          JWT Token:{" "}
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            style={{ width: "400px" }}
            placeholder="Enter your JWT token"
          />
        </label>
        {token && (
          <p style={{ color: "green" }}>Token saved to localStorage ✅</p>
        )}
      </div>

    </div>
  );
}

export default App;
