
import QRCode from 'react-qr-code';

export default function Khqr({
    name = "Rathanak",
    amount = 0,
    qrValue = ""
}) {
    // Debug: Log props received
    console.log("🎨 Khqr component received:", { name, amount, qrValue, qrValueLength: qrValue?.length });

    // ✅ Validate QR string: Must start with "0002" and be long enough (KHQR format)
    const isValidQRString = qrValue && typeof qrValue === 'string' && 
                           qrValue.startsWith("0002") && 
                           qrValue.length > 20;

    if (!isValidQRString) {
        console.warn("⚠️  Invalid or missing QR value - not rendering QR code", { 
            received: qrValue,
            isString: typeof qrValue === 'string',
            length: qrValue?.length,
            startsWithCorrectPrefix: qrValue?.startsWith("0002")
        });
        return (
            <div className="w-full max-w-sm mx-auto rounded-lg overflow-hidden shadow-lg border border-yellow-200 bg-yellow-50">
                <div className="bg-yellow-600 p-4 text-white font-bold text-lg rounded-t-lg">
                    ⏳ Generating QR Code
                </div>
                <div className="px-6 py-6 text-center text-yellow-800">
                    <p>Waiting for QR code from server...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-sm mx-auto rounded-lg overflow-hidden shadow-lg border border-gray-200 bg-white">
            {/* Header with Red Background */}
            <div className="bg-red-600 p-4 sm:p-6 text-white font-bold text-xl sm:text-2xl rounded-t-lg flex justify-between items-center">
                <span>KHQR Payment</span>
                {/* Decorative triangle */}
                <div className="w-0 h-0 border-t-[40px] sm:border-t-[50px] border-t-transparent border-l-[40px] sm:border-l-[50px] border-l-white -mt-4 -mr-4 sm:-mt-6 sm:-mr-6"></div>
            </div>

            {/* Amount Section */}
            <div className="px-6 py-4 text-center border-b border-dashed border-gray-300">
                <h2 className="text-xl sm:text-2xl text-black font-semibold">{name}</h2>
                <p className="text-3xl sm:text-4xl text-black font-bold mt-2">
                    ${amount.toFixed(2)}
                </p>
            </div>

            {/* QR Code Section */}
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
                        {(() => {
                            console.log("🔄 Rendering QRCode component with value:", qrValue);
                            return null;
                        })()}

                        <QRCode
                            size={256}
                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                            value={qrValue}
                            viewBox="0 0 256 256"
                        />
                    </div>
                ) : (
                    <div className="text-gray-500 text-center py-10">
                        Generating QR code...
                    </div>
                )}
            </div>
        </div>
    );
}