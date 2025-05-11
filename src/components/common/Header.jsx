// Page header
import { useState } from "react";
import FeedbackModal from "./FeedbackModal";

export default function Header() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState("bug");

    const openModal = (type) => {
        setModalType(type);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    const handleFeedbackSubmit = (text, imageFile) => {
        console.log("Feedback Submitted in Header:", {
            type: modalType,
            text,
            imageFile,
        });
    };

    const linkStyleClasses =
        "text-base font-semibold text-white hover:text-blue-400 cursor-pointer";

    return (
        <>
            <header className="py-4 px-6 border-b border-neutral-700 flex items-center space-x-6">
                {/* Top left feedback links */}
                <div className="flex space-x-4">
                    <button
                        onClick={() => openModal("bug")}
                        className={linkStyleClasses}
                        title="Report a problem or bug"
                    >
                        Report Bug
                    </button>
                    <button
                        onClick={() => openModal("feature")}
                        className={linkStyleClasses}
                        title="Suggest a new feature or improvement"
                    >
                        Request Feature
                    </button>
                </div>
            </header>

            {/* Modal */}
            <FeedbackModal
                isOpen={isModalOpen}
                onClose={closeModal}
                // onSubmit={handleFeedbackSubmit}
                type={modalType}
            />
        </>
    );
}
