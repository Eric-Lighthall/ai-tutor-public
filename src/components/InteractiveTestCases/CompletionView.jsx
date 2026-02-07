// "step complete" message shown after finishing all challenges
import { motion } from "framer-motion";
import { CheckIcon } from "@heroicons/react/24/outline";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { mdComponents } from "./mdComponents";

export default function CompletionView({ completionMessage }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
        >
            <div className="flex items-center gap-2 text-emerald-400">
                <CheckIcon className="w-5 h-5" />
                <h3 className="text-base font-semibold">Step Complete</h3>
            </div>
            <div className="prose prose-sm prose-invert max-w-none text-neutral-400">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                    {completionMessage}
                </ReactMarkdown>
            </div>
        </motion.div>
    );
}
