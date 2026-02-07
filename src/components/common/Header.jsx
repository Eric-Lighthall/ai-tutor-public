// top navigation bar  - logo, back button on problem pages, feedback/bug report
import React from "react";
import { useLocation, Link } from "react-router-dom";
import FeedbackModal from "./FeedbackModal";
import { ArrowLeft } from "lucide-react";

const ACTION_BUTTON_CLASSES =
  "px-3 py-1.5 text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-700 rounded-md transition-all duration-200 cursor-pointer";
const DIVIDER_CLASSES = "w-px h-5 bg-neutral-600";

export default function Header() {
  const location = useLocation();
  const [feedbackModal, setFeedbackModal] = React.useState({
    isOpen: false,
    type: "bug",
  });

  const isProblemPage = location.pathname.startsWith('/problems/');

  return (
    <>
      <header className="py-2.5 px-4 sm:px-6 bg-neutral-800 border-b border-neutral-700 shadow-sm flex items-center justify-between sticky top-0 z-50">
        <div className="flex-shrink-0 flex items-center">
          {isProblemPage ? (
            <Link
              to="/"
              className="flex items-center gap-2 text-neutral-300 hover:text-neutral-100 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Back to Problems</span>
            </Link>
          ) : (
            <span className="text-lg font-semibold text-neutral-100">
              AI Tutor
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setFeedbackModal({ isOpen: true, type: "bug" })
            }
            className={ACTION_BUTTON_CLASSES}
            title="Report an issue"
            aria-label="Report an issue"
          >
            Report Bug
          </button>

          <div className={DIVIDER_CLASSES} />

          <button
            onClick={() =>
              setFeedbackModal({ isOpen: true, type: "feature" })
            }
            className={ACTION_BUTTON_CLASSES}
            title="Suggest a feature"
            aria-label="Suggest a feature"
          >
            Feedback
          </button>
        </div>
      </header>

      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal((prev) => ({ ...prev, isOpen: false }))}
        type={feedbackModal.type}
      />
    </>
  );
}
