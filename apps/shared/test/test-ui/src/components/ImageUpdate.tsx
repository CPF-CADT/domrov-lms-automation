import React, { useState, useRef } from "react";

interface ImageUpdateProps {
    /** JWT token for authorization */
    token: string;
    /** Backend base URL, e.g., http://localhost:3000 */
    baseUrl: string;
    /** Callback when image is successfully uploaded */
    onSuccess?: (result: any) => void;
    /** Callback when upload fails */
    onError?: (error: string) => void;
}

interface CloudinaryParams {
    signature: string;
    timestamp: number;
    folder: string;
    public_id: string;
    cloud_name: string;
    api_key: string;
}

export const ImageUpdate: React.FC<ImageUpdateProps> = ({
    token,
    baseUrl,
    onSuccess,
    onError,
}) => {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string>("");
    const [cloudinaryResponse, setCloudinaryResponse] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getPresignedUrl = async (): Promise<CloudinaryParams> => {
        const response = await fetch(`${baseUrl}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to get presigned URL: ${response.statusText}`);
        }

        const result = await response.json();

        // Handle different response formats
        if (result.success && result.data) {
            // Backend returns {success: true, data: {...}}
            return result.data;
        } else if (result.signature && result.timestamp && result.api_key) {
            // Backend returns Cloudinary params directly
            return result as CloudinaryParams;
        } else {
            throw new Error("Invalid response format");
        }
    };

    const uploadToCloudinary = async (file: File, params: CloudinaryParams) => {
        const formData = new FormData();

        // Add the required Cloudinary parameters
        formData.append("file", file);
        formData.append("signature", params.signature);
        formData.append("timestamp", params.timestamp.toString());
        formData.append("folder", params.folder);
        formData.append("public_id", params.public_id);
        formData.append("api_key", params.api_key);

        const uploadUrl = `https://api.cloudinary.com/v1_1/${params.cloud_name}/image/upload`;

        const response = await fetch(uploadUrl, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        return await response.json();
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith("image/")) {
                setError("Please select an image file");
                return;
            }

            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                setError("File size must be less than 10MB");
                return;
            }

            setSelectedFile(file);
            setError("");

            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setError("Please select an image first");
            return;
        }

        setError("");
        setSuccess("");
        setUploading(true);
        setProgress(0);

        try {
            // Step 1: Get presigned URL parameters from server
            setProgress(25);
            const params = await getPresignedUrl();

            // Step 2: Upload to Cloudinary
            setProgress(50);
            const result = await uploadToCloudinary(selectedFile, params);

            setProgress(100);
            setSuccess("Image uploaded successfully!");
            setCloudinaryResponse(result);

            // Reset form
            setSelectedFile(null);
            setPreview("");
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            // Call success callback
            if (onSuccess) {
                onSuccess(result);
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Upload failed";
            setError(errorMessage);
            if (onError) {
                onError(errorMessage);
            }
        } finally {
            setUploading(false);
        }
    };

    const handleCancel = () => {
        setSelectedFile(null);
        setPreview("");
        setError("");
        setSuccess("");
        setCloudinaryResponse(null);
    };

    return (
        <div style={{
            maxWidth: "500px",
            margin: "20px auto",
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            fontFamily: "Arial, sans-serif"
        }}>
            <h3>Update Image</h3>

            {/* File Input */}
            <div style={{ marginBottom: "20px" }}>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    style={{ display: "none" }}
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                        padding: "10px 20px",
                        backgroundColor: uploading ? "#ccc" : "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: uploading ? "not-allowed" : "pointer"
                    }}
                >
                    {selectedFile ? "Change Image" : "Select Image"}
                </button>
            </div>

            {/* Image Preview */}
            {preview && (
                <div style={{ margin: "20px 0", textAlign: "center" }}>
                    <h4>Preview:</h4>
                    <img
                        src={preview}
                        alt="Selected image preview"
                        style={{
                            maxWidth: "300px",
                            maxHeight: "300px",
                            objectFit: "contain",
                            border: "1px solid #ddd",
                            borderRadius: "4px"
                        }}
                    />
                </div>
            )}

            {/* File Info */}
            {selectedFile && (
                <div style={{
                    backgroundColor: "#f8f9fa",
                    padding: "10px",
                    borderRadius: "4px",
                    margin: "10px 0"
                }}>
                    <p><strong>File:</strong> {selectedFile.name}</p>
                    <p><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <p><strong>Type:</strong> {selectedFile.type}</p>
                </div>
            )}

            {/* Progress Bar */}
            {uploading && (
                <div style={{ margin: "20px 0" }}>
                    <div style={{
                        width: "100%",
                        height: "20px",
                        backgroundColor: "#e9ecef",
                        borderRadius: "10px",
                        overflow: "hidden"
                    }}>
                        <div
                            style={{
                                width: `${progress}%`,
                                height: "100%",
                                backgroundColor: "#28a745",
                                transition: "width 0.3s ease"
                            }}
                        ></div>
                    </div>
                    <p style={{ textAlign: "center", marginTop: "5px" }}>{progress}% complete</p>
                </div>
            )}

            {/* Action Buttons */}
            <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
                {selectedFile && !uploading && (
                    <>
                        <button
                            onClick={handleUpload}
                            style={{
                                padding: "10px 20px",
                                backgroundColor: "#28a745",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer"
                            }}
                        >
                            Upload Image
                        </button>
                        <button
                            onClick={handleCancel}
                            style={{
                                padding: "10px 20px",
                                backgroundColor: "#dc3545",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer"
                            }}
                        >
                            Cancel
                        </button>
                    </>
                )}
            </div>

            {/* Messages */}
            {error && (
                <div style={{
                    marginTop: "10px",
                    padding: "10px",
                    borderRadius: "4px",
                    backgroundColor: "#f8d7da",
                    border: "1px solid #f5c6cb",
                    color: "#721c24"
                }}>
                    {error}
                </div>
            )}
            {success && (
                <div style={{
                    marginTop: "10px",
                    padding: "10px",
                    borderRadius: "4px",
                    backgroundColor: "#d4edda",
                    border: "1px solid #c3e6cb",
                    color: "#155724"
                }}>
                    {success}
                </div>
            )}

            {/* Cloudinary Response Data */}
            {cloudinaryResponse && (
                <div style={{
                    marginTop: "20px",
                    padding: "15px",
                    border: "1px solid #17a2b8",
                    borderRadius: "4px",
                    backgroundColor: "#d1ecf1"
                }}>
                    <h4 style={{ margin: "0 0 10px 0", color: "#0c5460" }}>Cloudinary Upload Response:</h4>
                    <div style={{
                        backgroundColor: "#f8f9fa",
                        padding: "10px",
                        borderRadius: "4px",
                        fontFamily: "monospace",
                        fontSize: "12px",
                        overflow: "auto",
                        maxHeight: "400px",
                        whiteSpace: "pre-wrap"
                    }}>
                        {JSON.stringify(cloudinaryResponse, null, 2)}
                    </div>
                    <div style={{ marginTop: "10px" }}>
                        <h5 style={{ margin: "5px 0", color: "#0c5460" }}>Key Properties:</h5>
                        <ul style={{ margin: "5px 0", paddingLeft: "20px", color: "#0c5460" }}>
                            <li><strong>secure_url:</strong> {cloudinaryResponse.secure_url}</li>
                            <li><strong>public_id:</strong> {cloudinaryResponse.public_id}</li>
                            <li><strong>asset_id:</strong> {cloudinaryResponse.asset_id}</li>
                            <li><strong>width:</strong> {cloudinaryResponse.width}px</li>
                            <li><strong>height:</strong> {cloudinaryResponse.height}px</li>
                            <li><strong>bytes:</strong> {cloudinaryResponse.bytes} ({(cloudinaryResponse.bytes / 1024 / 1024).toFixed(2)} MB)</li>
                            <li><strong>format:</strong> {cloudinaryResponse.format}</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};