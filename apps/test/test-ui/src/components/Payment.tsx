import React, { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { io, Socket } from "socket.io-client";

interface PaymentComponentProps {
  userId: number;
  packageId: number;
}

interface QRReadyPayload {
  qr: string;
}

interface PaymentStatusPayload {
  status: string;
}

export default function PaymentComponent({
  userId,
  packageId,
}: PaymentComponentProps) {
  const [qrValue, setQrValue] = useState<string>("");
  const [status, setStatus] = useState<string>("PENDING");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [paymentStarted, setPaymentStarted] = useState<boolean>(false);

  // ✅ Connect WebSocket on mount
  useEffect(() => {
    // ✅ Only create one socket
    const newSocket: Socket = io("http://localhost:3000", {
      query: { userId },
      transports: ["websocket"],
      auth: {
        token: localStorage.getItem("jwtToken") ?? "",
      }
    });

    setSocket(newSocket);

    newSocket.on("connect", () => console.log("Socket connected ✅"));
    newSocket.on("disconnect", () => console.log("Socket disconnected ❌"));
    newSocket.on("connect_error", (err) =>
      console.error("Connection error:", err.message),
    );

    newSocket.on("QR_READY", (payload: QRReadyPayload) => {
      setQrValue(payload.qr);
    });

    newSocket.on("PAYMENT_STATUS", (payload: PaymentStatusPayload) => {
      setStatus(payload.status);
    });

    // 🔒 Cleanup on unmount
    return () => {
      if (newSocket.connected) newSocket.disconnect();
      console.log("Socket cleanup done");
    };
  }, []); // ✅ empty dependency array ensures it runs only once

  const startPayment = async (): Promise<void> => {
    try {
      const res = await fetch(
        `https://api.domrov.app/payment/start-payment/${packageId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("jwtToken") ?? ""}`,
          },
        },
      );

      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      const data = await res.json();
      console.log("Payment initiated:", data);

      setPaymentStarted(true); // only used for UI feedback
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto rounded-lg overflow-hidden shadow-lg border border-gray-200 bg-white">
      <div className="bg-red-600 p-4 sm:p-6 text-white font-bold text-xl sm:text-2xl rounded-t-lg flex justify-between items-center">
        <span>KHQR Payment</span>
        <div className="w-0 h-0 border-t-[40px] sm:border-t-[50px] border-t-transparent border-l-[40px] sm:border-l-[50px] border-l-white -mt-4 -mr-4 sm:-mt-6 sm:-mr-6"></div>
      </div>

      <div className="px-6 py-4 text-center border-b border-dashed">
        <h2 className="text-xl sm:text-2xl text-black font-semibold">
          User {userId}
        </h2>
        <p className="text-3xl sm:text-4xl text-black font-bold mt-2">
          ${status === "PENDING" ? "0.00" : "PAID"}
        </p>
        <p className="mt-2 font-semibold text-gray-700">Status: {status}</p>
      </div>

      <div className="bg-white p-6 flex flex-col items-center justify-center">
        {qrValue ? (
          <div
            style={{
              height: "auto",
              margin: "0 auto",
              maxWidth: 200,
              width: "100%",
            }}
          >
            <QRCode
              size={256}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              value={qrValue}
              viewBox={`0 0 256 256`}
            />
          </div>
        ) : (
          <div className="text-gray-500 text-center py-10">
            {paymentStarted ? "Generating QR code..." : "Click Start Payment"}
          </div>
        )}

        {!paymentStarted && status === "PENDING" && (
          <button
            onClick={startPayment}
            className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Start Payment
          </button>
        )}

        {status === "PAID" && (
          <div className="mt-4 text-green-600 font-bold text-lg">
            Payment Successful!
          </div>
        )}
      </div>
    </div>
  );
}