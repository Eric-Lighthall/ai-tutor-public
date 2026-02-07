import { EditorView, Decoration, keymap } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { indentUnit } from "@codemirror/language";
import { indentationMarkers } from "@replit/codemirror-indentation-markers";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { indentMore } from "@codemirror/commands";
import { acceptCompletion } from "@codemirror/autocomplete";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";

const langExtensionMap = {
    python: python(),
    java: java(),
    c: cpp(),       // codemirror doesn't have a dedicated c/c# mode
    cpp: cpp(),
    csharp: cpp(),
    javascript: javascript(),
};

export const getLangExtension = (key) => langExtensionMap[key] || python();

export const FATAL_STATUSES = new Set([
    "compilation_error",
    "runtime_error",
    "error_executing_tests",
    "error_fetching_test_cases",
    "no_test_cases_found",
]);

export const lspTooltipTheme = EditorView.theme({}, { dark: true });

export const greenGutterTheme = EditorView.theme({
    ".cm-lineNumbers .cm-gutterElement": { position: "relative" },
    ".cm-lineNumbers .cm-gutterElement::before": {
        content: '""',
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: "3px",
        backgroundColor: "#046113",
    },
    ".cm-lineNumbers .cm-gutterElement.cm-activeLineGutter::before": {
        backgroundColor: "#009118",
    },
});

export const fontSizeTheme = EditorView.theme({
    ".cm-content": { fontSize: "16px", fontWeight: "400" },
});

export function createCursorUpdateListener(setCursor) {
    return EditorView.updateListener.of((update) => {
        if (!update.selectionSet) return;
        const pos = update.view.state.selection.main.head;
        const lineObj = update.view.state.doc.lineAt(pos);
        setCursor({ line: lineObj.number, col: pos - lineObj.from + 1 });
    });
}

export function createEditorKeymaps(tabSize) {
    return [
        {
            key: "Tab",
            run: (view) => {
                // prefer accepting autocomplete over inserting spaces
                if (acceptCompletion(view)) return true;
                const spaces = " ".repeat(tabSize);
                const { from, to } = view.state.selection.main;
                view.dispatch({
                    changes: { from, to, insert: spaces },
                    selection: { anchor: from + spaces.length },
                });
                return true;
            },
        },
        { key: "Shift-Tab", run: indentMore },
    ];
}

export function createErrorHighlighter(incorrectLines) {
    return EditorView.decorations.compute([incorrectLines], (state) => {
        const builder = new RangeSetBuilder();
        incorrectLines.forEach((ln) => {
            if (typeof ln !== "number" || ln <= 0 || ln > state.doc.lines) return;
            const line = state.doc.line(ln);
            builder.add(
                line.from,
                line.from,
                Decoration.line({
                    attributes: {
                        style: "background-color: rgba(255,0,0,0.15)",
                    },
                })
            );
        });
        return builder.finish();
    });
}

const INDENTATION_COLORS = {
    dark: "#444",
    activeDark: "#666",
};

export function buildBaseExtensions({ selectedLanguage, tabSize, editorKeymaps, cursorUpdateListener }) {
    const dynamicThemeExtensions = [
        vscodeDark,
        EditorView.theme({ ".cm-gutters": { borderRight: "none" } }),
    ];

    return [
        ...dynamicThemeExtensions,
        fontSizeTheme,
        getLangExtension(selectedLanguage),
        EditorView.lineWrapping,
        indentationMarkers({
            highlightActiveBlock: false,
            hideFirstIndent: false,
            markerType: "codeOnly",
            thickness: 1,
            colors: INDENTATION_COLORS,
        }),
        indentUnit.of(" ".repeat(tabSize)),
        keymap.of(editorKeymaps),
        cursorUpdateListener,
        greenGutterTheme,
    ];
}


export function buildAdditionalExtensions({ gutterExtension, readOnly, normalizedIncorrectLines, errorHighlighter }) {
    if (readOnly) {
        return [
            ...(gutterExtension ? [gutterExtension] : []),
            EditorView.editable.of(false),
            EditorView.theme({
                "&": { opacity: 0.8 },
                ".cm-content": { cursor: "default" },
            }),
        ];
    }

    return [
        ...(gutterExtension ? [gutterExtension] : []),
        ...(normalizedIncorrectLines.length > 0 ? [errorHighlighter] : []),
    ];
}
