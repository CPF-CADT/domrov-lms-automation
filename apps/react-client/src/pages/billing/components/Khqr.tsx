
import QRCode from 'react-qr-code';

export default function Khqr({
    name = "Rathanak",
    amount = 0,
    qrValue = ""
}) {
    // ✅ Validate QR string: Must start with "0002" and be long enough (KHQR format)
    const isValidQRString = qrValue && typeof qrValue === 'string' && 
                           qrValue.startsWith("0002") && 
                           qrValue.length > 20;

    if (!isValidQRString) {
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
        <div className="w-full max-w-sm mx-auto overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
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
