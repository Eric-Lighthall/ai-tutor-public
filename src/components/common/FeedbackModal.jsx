// bug report / feedback form  - opens from the header
import React, { useState, useEffect, useRef } from "react";
import { X, Upload } from "lucide-react";
import Lottie from "lottie-react";
import successAnim from "../../assets/success.json";
import clsx from "clsx";

const CHAR_LIMIT = 500;
const MAX_IMAGES = 3;
const WORKER_URL = "https://feedback-worker.ericlighthall.workers.dev";

export default function FeedbackModal({ isOpen, onClose, type }) {
    const [feedbackText, setFeedbackText] = useState("");
    const [images, setImages] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setFeedbackText("");
            setImages([]);
            setIsSubmitting(false);
            setIsSubmitted(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }, [isOpen, type]);

    const handleImageChange = (e) => {
        const newFiles = Array.from(e.target.files).filter((f) =>
            f.type.startsWith("image/")
        );
        if (!newFiles.length) {
            alert("Please select image files only (e.g., JPG, PNG, GIF).");
            return;
        }
        const slotsLeft = MAX_IMAGES - images.length;
        if (newFiles.length > slotsLeft) {
            alert(`You can upload up to ${MAX_IMAGES} images total.`);
            newFiles.length = slotsLeft;
        }
        newFiles.forEach((file) => {
            const reader = new FileReader();
            reader.onloadend = () =>
                setImages((prev) => [...prev, { file, url: reader.result }]);
            reader.readAsDataURL(file);
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
    };
    const handleRemoveImage = (idx) =>
        setImages((prev) => prev.filter((_, i) => i !== idx));

    const handleSubmit = () => {
        if (!feedbackText.trim()) return;
        setIsSubmitting(true);

        if (import.meta.env.DEV) {
            setTimeout(() => {
                setIsSubmitting(false);
                setIsSubmitted(true);
            }, 1000);
            return;
        }

        const formData = new FormData();
        formData.append("text", feedbackText.trim());
        images.forEach(({ file }) => formData.append("images", file));

        fetch(WORKER_URL, { method: "POST", body: formData })
            .then((res) => {
                if (!res.ok) throw new Error(res.statusText);
                setIsSubmitting(false);
                setIsSubmitted(true);
            })
            .catch((err) => {
                console.error(err);
                alert("Failed to submit feedback. Please try again.");
                setIsSubmitting(false);
            });
    };

    if (!isOpen) return null;

    const canSubmit = !!feedbackText.trim();

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
            <div className="bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-700 p-8 w-full max-w-lg min-h-[600px] relative text-white animate-fade-in-scale">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-300 transition-colors rounded-lg hover:bg-neutral-800 cursor-pointer"
                    aria-label="Close modal"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-2xl font-semibold mb-6 text-white">
                    {type === "bug" ? "Report an Issue" : "Share Feedback"}
                </h2>

                {isSubmitted ? (
                    <div className="text-center py-8 flex flex-col items-center">
                        <Lottie
                            animationData={successAnim}
                            loop={false}
                            style={{ width: 120, marginBottom: "0.75rem" }}
                        />
                        <p className="text-lg font-medium mb-2 text-white">
                            Thank you!
                        </p>
                        <p className="text-sm text-neutral-400">
                            Your feedback has been submitted successfully.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="relative mb-6">
                            <textarea
                                value={feedbackText}
                                onChange={(e) =>
                                    setFeedbackText(e.target.value)
                                }
                                placeholder={
                                    type === "bug"
                                        ? "Please describe the issue you encountered..."
                                        : "Describe your idea or suggestion..."
                                }
                                className={clsx(
                                    "w-full h-60 p-4 border border-neutral-600 rounded-lg bg-neutral-800",
                                    "text-white placeholder-neutral-400 focus:outline-none resize-none pr-16 transition-all"
                                )}
                                maxLength={CHAR_LIMIT}
                            />
                            <div className="absolute bottom-3 right-3 text-xs text-neutral-400">
                                {feedbackText.length}/{CHAR_LIMIT}
                            </div>
                        </div>

                        <div className="mb-6 flex items-center">
                            <label
                                htmlFor="imageUpload"
                                className={clsx(
                                    "inline-flex items-center px-4 py-2 border border-neutral-600 rounded-lg",
                                    "text-sm font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700",
                                    "focus:outline-none transition-all cursor-pointer"
                                )}
                            >
                                <Upload className="w-4 h-4 mr-2 inline-block" />
                                Add Images
                            </label>
                            {images.length > 0 && (
                                <span className="ml-3 text-sm text-neutral-400">
                                    {images.length}/{MAX_IMAGES} images
                                </span>
                            )}
                            <input
                                id="imageUpload"
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageChange}
                                className="hidden"
                            />
                        </div>

                        {images.length > 0 && (
                            <div className="mb-6 grid grid-cols-3 gap-3">
                                {images.map((img, idx) => (
                                    <div
                                        key={idx}
                                        className="relative w-full aspect-square overflow-hidden rounded-lg border border-neutral-600"
                                    >
                                        <img
                                            src={img.url}
                                            alt={`Preview ${idx + 1}`}
                                            className="object-contain w-full h-full"
                                        />
                                        <button
                                            onClick={() =>
                                                handleRemoveImage(idx)
                                            }
                                            className={clsx(
                                                "absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full",
                                                "hover:bg-red-600 transition-colors transition-all cursor-pointer"
                                            )}
                                            aria-label="Remove image"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <p className="text-xs mb-6 text-neutral-400">
                            Your feedback is anonymous. Only the timestamp,
                            submitted text, and optional images are stored.
                        </p>

                        {!isSubmitting && (
                            <button
                                onClick={handleSubmit}
                                disabled={!canSubmit}
                                className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
                                    canSubmit
                                        ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                                        : "bg-neutral-700 text-neutral-500 cursor-not-allowed"
                                }`}
                            >
                                Submit {type === "bug" ? "Report" : "Feedback"}
                            </button>
                        )}
                        {isSubmitting && (
                            <div className="w-full flex justify-center items-center py-3">
                                <span
                                    className="w-5 h-5 mr-2 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"
                                    aria-hidden="true"
                                />
                                <span className="text-neutral-300 font-medium">
                                    Submitting...
                                </span>
                            </div>
                        )}
                    </>
                )}
            </div>

            <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in-scale {
          animation: fadeInScale 0.2s ease-out forwards;
        }
      `}</style>
        </div>
    );
}
