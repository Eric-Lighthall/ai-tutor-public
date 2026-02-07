// toggle switch  - used for "unlock all steps" in the sidebar
import React from "react";

const ToggleSwitch = ({ isOn = false, onToggle, label, id }) => (
  <div className="flex items-center space-x-2.5">
    {label && (
      <label htmlFor={id} className="text-sm font-medium text-white">
        {label}
      </label>
    )}
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={isOn}
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isOn ? "bg-blue-600" : "bg-neutral-600"}`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isOn ? "translate-x-4" : "translate-x-0"}`}
      />
    </button>
  </div>
);

export default ToggleSwitch;
