// fullscreen overlay shown before first interaction on editor/chat steps
import React from 'react';
import Button from './Button';

const IntroOverlay = ({ title, description, buttonText, onBegin, animationElement }) => (
  <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-800/80 backdrop-blur-sm p-4">
    <div className="w-full max-w-lg p-6 rounded-md shadow-xl bg-neutral-700 border border-neutral-600">
      <div className="flex flex-col sm:flex-row-reverse items-center gap-6">
        {animationElement && (
          <div className="flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center">
            {animationElement}
          </div>
        )}

        <div className="text-center sm:text-left">
          <h3 className="mb-2 text-2xl font-bold text-neutral-100">
            {title}
          </h3>
          <p className="mb-4 text-neutral-300">
            {description}
          </p>
          <Button
            onClick={onBegin}
            variant="primary"
            size="large"
            className="shadow-md transition-transform duration-200 hover:scale-105 active:scale-100 hover:shadow-lg"
          >
            {buttonText}
          </Button>
        </div>
      </div>
    </div>
  </div>
);

export default IntroOverlay;
