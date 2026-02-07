// module page  - lists problems with difficulty badges for a given module
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import NotImplementedModal from "../components/common/NotImplementedModal";

const moduleJsons = import.meta.glob("../content/modules/*/module.json", {
  eager: true,
  import: "default",
});

const emptyModal = { isOpen: false, problemTitle: "" };

const getDifficultyMeta = (difficulty) => {
  switch ((difficulty || "").toLowerCase()) {
    case "easy":
      return { badge: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" };
    case "medium":
      return { badge: "bg-amber-500/20 text-amber-400 border border-amber-500/30" };
    case "hard":
      return { badge: "bg-rose-500/20 text-rose-400 border border-rose-500/30" };
    default:
      return { badge: "bg-neutral-500/20 text-neutral-400 border border-neutral-500/30" };
  }
};

const formatModuleTitle = (moduleId = "") =>
  moduleId ? moduleId[0].toUpperCase() + moduleId.slice(1) : "Module";

export default function ModulePage() {
  const { moduleId } = useParams();
  const [moduleData, setModuleData] = useState(null);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalState, setModalState] = useState(emptyModal);

  useEffect(() => {
    const path = `../content/modules/${moduleId}/module.json`;
    const mod = moduleJsons[path];
    setModuleData(mod || null);
    setError(mod ? "" : `Module "${moduleId}" not found.`);
  }, [moduleId]);

  if (error) return <div className="p-6 text-red-400">{error}</div>;
  if (!moduleData) return null;

  const filteredProblems = (moduleData.problems || []).filter((problem) => {
    const query = searchQuery.toLowerCase();
    return (
      problem.title.toLowerCase().includes(query) ||
      problem.description.toLowerCase().includes(query) ||
      problem.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  const handleProblemClick = (e, problem) => {
    if (problem.id === "two-sum") return;
    e.preventDefault();
    setModalState({ isOpen: true, problemTitle: problem.title });
  };

  const moduleTitle = formatModuleTitle(moduleId);

  return (
    <div className="relative min-h-screen bg-neutral-950 flex flex-col overflow-hidden">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black" />
        <div className="absolute -top-64 -left-64 w-[1200px] h-[1200px] bg-blue-500/4 rounded-full blur-[120px]" />
        <div className="absolute -top-32 left-32 w-[1000px] h-[1000px] bg-purple-500/3 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex-grow">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <header className="mb-12">
            <nav className="text-sm text-neutral-400 mb-6">
              <Link to="/" className="text-neutral-400">Home</Link>
              <span className="mx-2">/</span>
              <span className="text-white">{moduleTitle}</span>
            </nav>
            <h1 className="text-3xl font-bold text-white mb-2">{moduleTitle} Problems</h1>
            <p className="text-neutral-400">
              {moduleData.problems?.length || 0} problems to solve
            </p>
          </header>

          <div className="mb-8 mt-4">
            <div className="relative max-w-sm">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500"
                size={18}
              />
              <input
                type="text"
                placeholder="Search problems..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-4">
            {filteredProblems.map((problem, idx) => {
              const style = getDifficultyMeta(problem.difficulty);
              return (
                <div
                  key={problem.id}
                  className="relative bg-neutral-900 rounded-lg p-6 pb-16"
                >
                  <div className="flex items-start">
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-4 mb-2">
                        <span className="text-neutral-500 font-mono text-sm">#{idx + 1}</span>
                        <Link
                          to={`/problems/${problem.id}`}
                          className="text-white"
                          onClick={(e) => handleProblemClick(e, problem)}
                        >
                          <h3 className="text-xl font-semibold text-white">{problem.title}</h3>
                        </Link>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${style.badge}`}>
                          {problem.difficulty}
                        </span>
                      </div>
                      <p className="text-neutral-400 text-sm">{problem.description}</p>
                    </div>
                  </div>

                  <div className="absolute bottom-6 left-6 flex items-center gap-3">
                    {problem.tags?.map((tag) => (
                      <span key={tag} className="text-xs text-neutral-500">{tag}</span>
                    ))}
                  </div>

                  <div className="absolute bottom-6 right-6">
                    <Link
                      to={`/problems/${problem.id}`}
                      className="inline-flex items-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-semibold"
                      onClick={(e) => handleProblemClick(e, problem)}
                    >
                      Solve
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {searchQuery && filteredProblems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-neutral-400">
                No problems found matching &quot;{searchQuery}&quot;
              </p>
            </div>
          )}
        </div>
      </div>

      <NotImplementedModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState(emptyModal)}
        problemTitle={modalState.problemTitle}
      />
    </div>
  );
}
