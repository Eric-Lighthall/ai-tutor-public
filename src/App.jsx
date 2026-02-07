import React, { createContext, useMemo } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

import Header from "./components/common/Header";
import LandingPage from "./pages/LandingPage.jsx";
import ModulePage from "./pages/ModulePage.jsx";
import DynamicProblemPage from "./pages/DynamicProblemPage.jsx";

export const UserIdContext = createContext(null);

function AppContent() {
    const location = useLocation();

    // matches /modules/<anything> but not deeper paths
    const hideHeaderRoutes = [
        '/',
        /^\/modules\/[^/]+$/
    ];

    const shouldHideHeader = hideHeaderRoutes.some(route => {
        if (typeof route === 'string') {
            return location.pathname === route;
        } else {
            return route.test(location.pathname);
        }
    });

    return (
        <div className="min-h-screen flex flex-col bg-neutral-900 text-neutral-200">
            {!shouldHideHeader && <Header />}
            <div className="flex-1">
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route
                        path="/modules/:moduleId"
                        element={<ModulePage />}
                    />
                    <Route
                        path="/problems/:problemId"
                        element={<DynamicProblemPage />}
                    />
                </Routes>
            </div>
        </div>
    );
}

export default function App() {
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
            <AppContent />
        </UserIdContext.Provider>
    );
}
