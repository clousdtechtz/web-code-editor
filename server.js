const STORAGE_KEY = "codecraft-ide-project-v1";

const defaultProject = {
  files: [
    {
      id: "main-java",
      name: "Main.java",
      path: "src/Main.java",
      folder: "src",
      type: "file",
      language: "java",
      content: `public class Main {
    public static void main(String[] args) {
        System.out.println("Welcome to CodeCraft IDE!");
        System.out.println("Write your Java code here.");
    }
}`
    },
    {
      id: "app-cpp",
      name: "App.cpp",
      path: "src/App.cpp",
      folder: "src",
      type: "file",
      language: "cpp",
      content: `#include <iostream>
using namespace std;

int main() {
    cout << "Welcome to CodeCraft IDE!" << endl;
    cout << "Write your C++ code here." << endl;
    return 0;
}`
    },
    {
      id: "hello-py",
      name: "hello.py",
      path: "src/hello.py",
      folder: "src",
      type: "file",
      language: "python",
      content: `print("Hello from CodeCraft IDE!")
print("Python is ready to run.")`
    },
    {
      id: "readme-md",
      name: "README.md",
      path: "README.md",
      folder: "",
      type: "file",
      language: "markdown",
      content: `# CodeCraft IDE

A lightweight browser-based coding workspace inspired by modern IDEs.

## Features
- Java, C++, Python, JS, TS, HTML, and CSS editing
- File explorer and tabs
- Save state in browser storage
- Output console for execution preview

## Run locally
Open this project with a local HTTP server:

\`\`\`bash
python -m http.server 8000
\`\`\`

Then visit http://localhost:8000`
    }
  ]
};

const state = {
  project: loadProject(),
  activeFileId: null,
  editor: null,
  monacoReady: false,
  outputLines: []
};

const projectTreeEl = document.getElementById("project-tree");
const tabBarEl = document.getElementById("tab-bar");
const outputConsoleEl = document.getElementById("output-console");
const languageSelectEl = document.getElementById("language-select");

function loadProject() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(defaultProject);

  try {
    const parsed = JSON.parse(saved);
    if (parsed && Array.isArray(parsed.files) && parsed.files.length) {
      return parsed;
    }
  } catch (error) {
    console.warn("Project load failed:", error);
  }

  return structuredClone(defaultProject);
}

function saveProject() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.project));
}

function getFileById(fileId) {
  return state.project.files.find((file) => file.id === fileId) || null;
}

function uniqueId() {
  return `file-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function detectLanguage(fileName) {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  const map = {
    java: "java",
    cpp: "cpp",
    c: "cpp",
    cc: "cpp",
    py: "python",
    js: "javascript",
    ts: "typescript",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown",
    txt: "plaintext"
  };
  return map[extension] || "plaintext";
}

function logOutput(message) {
  const timestamp = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  state.outputLines.push(`[${timestamp}] ${message}`);
  outputConsoleEl.textContent = state.outputLines.join("\n");
  outputConsoleEl.scrollTop = outputConsoleEl.scrollHeight;
}

function clearOutput() {
  state.outputLines = [];
  outputConsoleEl.textContent = "Console cleared.";
}

function ensureRootFolderTree() {
  const folders = new Map();
  state.project.files.forEach((file) => {
    if (!file.folder || file.folder === "") return;
    if (!folders.has(file.folder)) folders.set(file.folder, []);
    folders.get(file.folder).push(file);
  });
  return folders;
}

function renderTree() {
  const folders = ensureRootFolderTree();
  const rootFiles = state.project.files.filter((file) => !file.folder || file.folder === "");

  projectTreeEl.innerHTML = "";

  rootFiles.forEach((file) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `tree-node tree-node-file ${state.activeFileId === file.id ? "active" : ""}`;
    btn.innerHTML = `<span>📄</span><span>${file.name}</span>`;
    btn.addEventListener("click", () => openFile(file.id));
    projectTreeEl.appendChild(btn);
  });

  [...folders.keys()].sort().forEach((folderName) => {
    const folderWrap = document.createElement("div");
    folderWrap.className = "tree-folder";

    const folderBtn = document.createElement("button");
    folderBtn.type = "button";
    folderBtn.className = "tree-node tree-node-folder";
    folderBtn.innerHTML = `<span>📁</span><span>${folderName}</span>`;
    folderWrap.appendChild(folderBtn);

    const childrenWrap = document.createElement("div");
    childrenWrap.className = "folder-children";

    folders.get(folderName).forEach((file) => {
      const child = document.createElement("button");
      child.type = "button";
      child.className = `tree-node tree-node-file ${state.activeFileId === file.id ? "active" : ""}`;
      child.innerHTML = `<span>📄</span><span>${file.name}</span>`;
      child.addEventListener("click", () => openFile(file.id));
      childrenWrap.appendChild(child);
    });

    folderWrap.appendChild(childrenWrap);
    projectTreeEl.appendChild(folderWrap);
  });
}

function renderTabs() {
  tabBarEl.innerHTML = "";

  state.project.files.forEach((file) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = `tab ${state.activeFileId === file.id ? "active" : ""}`;
    tab.innerHTML = `<span>${file.name}</span><span class="tab-close">×</span>`;
    tab.addEventListener("click", (event) => {
      if (event.target.closest(".tab-close")) {
        event.stopPropagation();
        removeFile(file.id);
        return;
      }
      openFile(file.id);
    });
    tabBarEl.appendChild(tab);
  });
}

function openFile(fileId) {
  const file = getFileById(fileId);
  if (!file) return;

  state.activeFileId = fileId;
  languageSelectEl.value = file.language || detectLanguage(file.name);
  renderTree();
  renderTabs();

  if (!state.monacoReady || !state.editor) return;

  const model = state.editor.getModel();
  if (model) {
    state.editor.setValue(file.content);
    window.monaco.editor.setModelLanguage(model, file.language || detectLanguage(file.name));
  }
}

function saveCurrentFile() {
  const file = getFileById(state.activeFileId);
  if (!file || !state.editor) {
    logOutput("No file is currently open to save.");
    return;
  }

  file.content = state.editor.getValue();
  saveProject();
  logOutput(`Saved: ${file.name}`);
}

function createNewFile() {
  const fileName = prompt("Enter a file name (for example: Main.java, app.py, index.html):", "NewFile.java");
  if (!fileName) return;

  const cleanName = fileName.trim();
  if (!cleanName) return;

  const existing = state.project.files.some((file) => file.name === cleanName);
  if (existing) {
    logOutput(`A file named "${cleanName}" already exists.`);
    return;
  }

  const file = {
    id: uniqueId(),
    name: cleanName,
    path: cleanName,
    folder: "",
    type: "file",
    language: detectLanguage(cleanName),
    content: ""
  };

  state.project.files.push(file);
  saveProject();
  openFile(file.id);
  logOutput(`Created file: ${file.name}`);
}

function createNewFolder() {
  const folderName = prompt("Enter a folder name:", "resources");
  if (!folderName) return;

  const cleanName = folderName.trim();
  if (!cleanName) return;

  const folderAlreadyExists = state.project.files.some(
    (file) => file.folder === cleanName || file.path === cleanName
  );

  if (folderAlreadyExists) {
    logOutput(`Folder "${cleanName}" already exists.`);
    return;
  }

  const newFolder = {
    id: uniqueId(),
    name: cleanName,
    path: cleanName,
    folder: cleanName,
    type: "folder",
    language: "folder",
    content: ""
  };

  state.project.files.push(newFolder);
  saveProject();
  renderTree();
  logOutput(`Created folder: ${cleanName}`);
}

function removeFile(fileId) {
  const file = getFileById(fileId);
  if (!file) return;

  if (state.project.files.length <= 1) {
    logOutput("At least one file should remain in the project.");
    return;
  }

  state.project.files = state.project.files.filter((item) => item.id !== fileId);
  const nextFile = state.project.files[0];
  saveProject();
  openFile(nextFile.id);
  logOutput(`Deleted: ${file.name}`);
}

function resetProject() {
  const confirmReset = window.confirm("Reset the IDE project to the default sample files?");
  if (!confirmReset) return;

  state.project = structuredClone(defaultProject);
  state.activeFileId = state.project.files[0].id;
  saveProject();

  if (state.monacoReady && state.editor) {
    state.editor.setValue(state.project.files[0].content);
    window.monaco.editor.setModelLanguage(
      state.editor.getModel(),
      state.project.files[0].language || detectLanguage(state.project.files[0].name)
    );
  }

  renderTree();
  renderTabs();
  logOutput("Project reset to default sample files.");
}

function getLanguagePreview(language, content) {
  const preview = content.split("\n").slice(0, 10).join("\n");
  if (language === "javascript") {
    try {
      const result = Function(`"use strict";\n${content}`)();
      return result === undefined ? "Execution finished successfully with no return value." : `Result: ${String(result)}`;
    } catch (error) {
      return `Runtime error: ${error.message}`;
    }
  }

  if (language === "python") {
    return `Python preview:\n${preview}`;
  }

  if (language === "java" || language === "cpp") {
    return `Compiled source preview:\n${preview}`;
  }

  return `Preview:\n${preview}`;
}

function runCurrentProject() {
  const file = getFileById(state.activeFileId);
  if (!file) {
    logOutput("Select a file to run.");
    return;
  }

  const code = state.editor ? state.editor.getValue() : file.content;
  const language = file.language || detectLanguage(file.name);

  logOutput(`Running ${file.name} (${language})`);

  if (language === "javascript") {
    try {
      const result = Function(`"use strict";\n${code}`)();
      logOutput(result === undefined ? "Execution finished without a return value." : `JavaScript output: ${String(result)}`);
      return;
    } catch (error) {
      logOutput(`Runtime error: ${error.message}`);
      return;
    }
  }

  if (language === "python") {
    logOutput("Python execution preview is enabled for the browser IDE. The runtime is ready for a connected backend compiler.");
    logOutput(getLanguagePreview(language, code));
    return;
  }

  if (language === "java" || language === "cpp") {
    logOutput("Java/C++ build execution is prepared for a backend compiler service. This frontend IDE is ready for code editing.");
    logOutput(getLanguagePreview(language, code));
    return;
  }

  logOutput(getLanguagePreview(language, code));
}

function initEditor() {
  require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs" } });

  require(["vs/editor/editor.main"], () => {
    if (!state.project.files.length) {
      state.project = structuredClone(defaultProject);
    }

    state.activeFileId = state.project.files[0].id;

    state.editor = window.monaco.editor.create(document.getElementById("editor-container"), {
      value: state.project.files[0].content,
      language: state.project.files[0].language || detectLanguage(state.project.files[0].name),
      theme: "vs-dark",
      minimap: { enabled: false },
      automaticLayout: true,
      lineNumbersMinChars: 3,
      fontSize: 15,
      scrollBeyondLastLine: false,
      roundedSelection: true,
      padding: { top: 18, bottom: 18 }
    });

    state.monacoReady = true;

    state.editor.onDidChangeModelContent(() => {
      const file = getFileById(state.activeFileId);
      if (file) {
        file.content = state.editor.getValue();
        saveProject();
      }
    });

    languageSelectEl.addEventListener("change", () => {
      const file = getFileById(state.activeFileId);
      if (!file) return;

      file.language = languageSelectEl.value;
      if (state.editor) {
        window.monaco.editor.setModelLanguage(state.editor.getModel(), languageSelectEl.value);
      }
      saveProject();
      logOutput(`Language set to ${languageSelectEl.value} for ${file.name}`);
    });

    document.getElementById("save-btn").addEventListener("click", saveCurrentFile);
    document.getElementById("run-btn").addEventListener("click", runCurrentProject);
    document.getElementById("new-file-btn").addEventListener("click", createNewFile);
    document.getElementById("new-folder-btn").addEventListener("click", createNewFolder);
    document.getElementById("clear-output-btn").addEventListener("click", clearOutput);
    document.getElementById("reset-project-btn").addEventListener("click", resetProject);

    renderTree();
    renderTabs();
    logOutput("CodeCraft IDE started successfully.");
  });
}

window.addEventListener("DOMContentLoaded", initEditor);

window.addEventListener("beforeunload", () => {
  const file = getFileById(state.activeFileId);
  if (file && state.editor) {
    file.content = state.editor.getValue();
    saveProject();
  }
});
