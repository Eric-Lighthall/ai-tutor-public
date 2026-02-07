// left panel  - problem title, difficulty badge, description, constraints, examples
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FiBook } from "react-icons/fi";
import { InlineCode, CodeBlock } from "./CodeHighlighting";

const SECTION_HEADING_CLASSES =
  "text-lg font-semibold text-neutral-100 mb-2";
const MUTED_LABEL_CLASSES = "text-neutral-400 mr-1";

const mdComponents = {
  code: InlineCode,
  pre: CodeBlock,
  p: (props) => <p {...props} className="leading-relaxed my-3" />,
};

const getDifficultyColor = (difficulty) =>
  ({
    Easy: "text-green-400",
    Medium: "text-yellow-400",
    Hard: "text-red-400",
  }[difficulty] || "text-gray-400");

const FallbackMessage = () => (
  <div className="p-4 bg-neutral-800 rounded-xl h-full text-neutral-400">
    Problem description is missing.
  </div>
);

const HeaderBar = () => (
  <div className="flex items-center gap-2 h-10 px-4 bg-neutral-700/30 border-b border-neutral-700 rounded-t-lg">
    <FiBook size={18} className="text-sky-400" />
    <span className="text-sm font-medium text-neutral-200">
      Description
    </span>
  </div>
);

const ProblemTitle = ({ title, difficulty }) => (
  <div className="mb-5 border-b border-neutral-700 pb-4">
    <h1 className="text-2xl font-bold text-neutral-100 mb-1">
      {title || "Problem"}
    </h1>
    {difficulty && (
      <span className={`text-sm font-semibold ${getDifficultyColor(difficulty)}`}>
        {difficulty}
      </span>
    )}
  </div>
);

const MainDescription = ({ description }) => (
  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
    {description}
  </ReactMarkdown>
);

const Objective = ({ objective }) => (
  <section>
    <h3 className={SECTION_HEADING_CLASSES}>Objective</h3>
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
      {objective}
    </ReactMarkdown>
  </section>
);

const Example = ({ example }) => (
  <div className="mb-6 rounded bg-neutral-900 border border-neutral-700/60 p-4">
    {example.title && (
      <p className="font-medium text-neutral-200 mb-2">
        {example.title}
      </p>
    )}
    {example.input && (
      <div className="mb-2">
        <span className={MUTED_LABEL_CLASSES}>Input:</span>
        <InlineCode language="text">{example.input}</InlineCode>
      </div>
    )}
    {example.output && (
      <div className="mb-2">
        <span className={MUTED_LABEL_CLASSES}>Output:</span>
        <InlineCode language="text">{example.output}</InlineCode>
      </div>
    )}
    {example.explanation && (
      <div className="text-neutral-400/80">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
          {example.explanation}
        </ReactMarkdown>
      </div>
    )}
  </div>
);

const Examples = ({ examples }) => (
  <section>
    <h3 className={SECTION_HEADING_CLASSES}>Examples</h3>
    {examples.map((example, i) => (
      <Example key={i} example={example} />
    ))}
  </section>
);

const Constraints = ({ constraints }) => (
  <section>
    <h3 className={SECTION_HEADING_CLASSES}>Constraints</h3>
    <ul className="list-disc ml-5 space-y-1">
      {constraints.map((constraint, i) => (
        <li key={i}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {constraint}
          </ReactMarkdown>
        </li>
      ))}
    </ul>
  </section>
);

export default function ProblemDescription({ data, title, difficulty }) {
  if (!data) return <FallbackMessage />;

  return (
    <div className="bg-neutral-800 rounded-xl shadow-lg h-full flex flex-col overflow-hidden border border-neutral-700">
      <HeaderBar />
      <div className="flex-1 overflow-y-auto p-6 text-neutral-300 problem-description-scroll">
        <ProblemTitle title={title} difficulty={difficulty} />
        <article className="space-y-6 prose prose-sm prose-invert max-w-none">
          {data.mainDescription && <MainDescription description={data.mainDescription} />}
          {data.objective && <Objective objective={data.objective} />}
          {Array.isArray(data.examples) && data.examples.length > 0 && (
            <Examples examples={data.examples} />
          )}
          {Array.isArray(data.constraints) && data.constraints.length > 0 && (
            <Constraints constraints={data.constraints} />
          )}
        </article>
      </div>
    </div>
  );
}
