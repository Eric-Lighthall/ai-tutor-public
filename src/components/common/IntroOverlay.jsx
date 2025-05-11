// This is the popup which is displayed for the chat pages and code pages.
// It's a little modal with a title, description, button, and dotlottie animation
export const IntroOverlay = ({
    title,
    description,
    buttonText,
    onBegin,
    animationElement,
    buttonClassName = "bg-blue-600 hover:bg-blue-700",
}) => {
    const baseButtonClassName =
        "px-6 py-2 text-white font-semibold rounded-md duration-200 focus:outline-none hover:scale-105 active:scale-100 shadow-md hover:shadow-lg cursor-pointer";

    return (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-800/80 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-neutral-700 rounded-md shadow-xl p-6 max-w-lg w-full border border-neutral-600">
                <div className="flex flex-col sm:flex-row-reverse items-center gap-6">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 flex items-center justify-center">
                        {animationElement}
                    </div>
                    <div className="text-center sm:text-left">
                        <h3 className="text-2xl font-bold mb-2 text-neutral-100">
                            {title}
                        </h3>
                        <p className="text-neutral-300 mb-4">{description}</p>
                        <button
                            onClick={onBegin}
                            className={`${baseButtonClassName} ${buttonClassName}`}
                        >
                            {buttonText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IntroOverlay;
