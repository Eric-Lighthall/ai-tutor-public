import React, { createContext, useMemo } from "react";
import { Routes, Route } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

import Header from "./components/common/Header";
import LandingPage from "./LandingPage.jsx";
import ModulePage from "./pages/ModulePage.jsx";
import DynamicProblemPage from "./pages/DynamicProblemPage.jsx";
import LessonPage from "./pages/LessonPage.jsx";

export const UserIdContext = createContext(null);

export default function App() {
    // check local storage and save new uuid
    // used for keeping track of user sessions
    const userId = useMemo(() => {
        const KEY = "edu_user_id";
        let id = localStorage.getItem(KEY);
        if (!id) {
            id = uuidv4();
            localStorage.setItem(KEY, id);
        }
        return id;
    }, []);

    return (
        <UserIdContext.Provider value={userId}>
            <div className="min-h-screen flex flex-col bg-neutral-900">
                <Header />
                <div className="flex-1">
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route
                            path="/modules/:moduleId"
                            element={<ModulePage />}
                        />
                        <Route
                            path="/modules/:moduleId/lessons/:lessonId"
                            element={<LessonPage />}
                        />
                        <Route
                            path="/problems/:problemId"
                            element={<DynamicProblemPage />}
                        />
                    </Routes>
                </div>
            </div>
        </UserIdContext.Provider>
    );
}
