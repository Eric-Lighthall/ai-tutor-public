// three-panel layout for problem pages: description (left), main content (center), steps sidebar (right)
import React, { useState } from "react";
import ChatPanel from "../chat/ChatPanel";
import { useDragResize } from "./hooks/useDragResize";
import { LAYOUT } from "./constants";

export default function ProblemPageLayout({
  problemPanel,
  mainContent,
  stepsPanel,
  isStepsCollapsed = false,
}) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { sidebarWidth, sidebarRef, isDragging, startDragging } = useDragResize();

  const toggleChat = () => setIsChatOpen((prev) => !prev);

  return (
    <div className="relative flex flex-row gap-0 md:gap-[3px] px-2 md:px-3 pt-2 pb-2 md:pt-3 md:pb-3 h-[calc(100vh-4rem)] overflow-hidden bg-neutral-950">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black"></div>
        <div className="absolute -top-64 -left-64 w-[1200px] h-[1200px] bg-blue-500/4 rounded-full blur-[120px]"></div>
      </div>

      <aside
        ref={sidebarRef}
        style={{ width: `${sidebarWidth}px` }}
        className="relative z-10 flex-shrink-0 h-full overflow-hidden"
      >
        <div className="h-full overflow-y-auto custom-scrollbar">
          {problemPanel}
        </div>
      </aside>

      <div
        onMouseDown={startDragging}
        style={{ width: `${LAYOUT.HANDLE.WIDTH}px` }}
        className="group flex-shrink-0 h-full cursor-ew-resize select-none relative z-10"
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={sidebarWidth}
        aria-valuemin={LAYOUT.SIDEBAR.MIN_WIDTH}
        aria-valuemax={LAYOUT.SIDEBAR.MAX_WIDTH}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2.5px] h-6 lg:h-8 bg-neutral-600 pointer-events-none rounded-full" />
        <div
          className={`absolute inset-0 pointer-events-none rounded-sm transition-colors duration-0 ${
            isDragging
              ? "bg-sky-500"
              : "bg-transparent"
          } group-hover:bg-sky-500`}
        />
      </div>

      <main
        id="main-content-area"
        className="relative z-10 flex-grow min-w-0 h-full overflow-hidden"
      >
        {mainContent}
      </main>

      <div style={{ width: `${LAYOUT.HANDLE.WIDTH}px` }} className="flex-shrink-0 h-full z-10" />

      <aside
        id="steps-sidebar-panel"
        style={{
          width: isStepsCollapsed ? `${LAYOUT.STEPS.COLLAPSED_WIDTH}px` : `${LAYOUT.STEPS.WIDTH}px`,
          transition: "width 300ms ease-in-out",
        }}
        className="relative z-10 flex-shrink-0 h-full overflow-hidden"
      >
        {stepsPanel && React.cloneElement(stepsPanel, { onToggleChat: toggleChat })}
      </aside>

      <ChatPanel isOpen={isChatOpen} onClose={toggleChat} />
    </div>
  );
}
