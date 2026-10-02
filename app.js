const STORAGE_KEY = "codecraft-ide-project-v1";

const defaultProject = {
  files: [
    {
      id: "src/Main.java",
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
      id: "src/App.cpp",
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
      id: "src/hello.py",
      name: "hello.py",
      path: "src/hello.py",
      folder: "src",
      type: "file",
      language: "python",
      content: `print("Hello from CodeCraft IDE!")
print("Python is ready to run.")`
    },
    {
      id: "README.md",
      name: "README.md",
      path: "README.md",
      folder: "",
      type: "file",
      language: "markdown",
      content: `# CodeCraft IDE\n\nA lightweight web-based code editor inspired by IDE workspaces.\n\n## Features\n- Multi-language editing\n- File explorer\n- Tabs and output console\n- Save to browser storage\n\n## Run\nOpen this project in a browser and click Run.`
    }
  ]
};

const state = {
  project: loadProject(),
  activeFileId: null,
  editor: null,
  monacoReady: false,
  outputs: []
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
    return parsed.files && parsed.files.length ? parsed : structuredClone(defaultProject);
  } catch (error) {
    console.warn("Project load failed:", error);
    return structuredClone(defaultProject);
  }
}

function saveProject() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.project));
}

function uniqueId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getFileById(id) {
  return state.project.files.find((file) => file.id === id) || null;
}

function getFileExtension(fileName) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.at(-1).toLowerCase() : "";
}

function detectLanguage(fileName) {
  const extension = getFileExtension(fileName);
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
    md: "markdown"
  };

  return map[extension] || "plaintext";
}

function ensureFilePath(file) {
  return file.path || file.name;
}

function renderTree() {
  const folders = new Map();

  state.project.files.forEach((file) => {
    if (!file.folder) {
      folders.set("root", [...(folders.get("root") || []), file]);
      return;
    }

    const key = file.folder;
    folders.set(key, [...(folders.get(key) || []), file]);
  });

  const rootEntries = [...new Set([...folders.keys(), ...state.project.files.map((f) => f.folder).filter(Boolean)])];

  projectTreeEl.innerHTML = "";

  const renderFolder = (folderName) => {
    const folderFiles = folders.get(folderName) || [];
    const folderNode = document.createElement("div");
    folderNode.className = "tree-node tree-node-folder";
    folderNode.innerHTML = `
      <span>📁</span>
      <span>${folderName || "root"}</span>
    `;

    const childWrap = document.createElement("div");
    childWrap.style.display = "block";

    folderFiles.forEach((file) => {
      const btn = document.createElement("button");
      btn.className = `tree-node tree-node-file ${state.activeFileId === file.id ? "active" : ""}`;
      btn.type = "button";
      btn.innerHTML = `
        <span>📄</span>
        <span>${file.name}</span>
      `;
      btn.addEventListener("click", () => openFile(file.id));
      childWrap.appendChild(btn);
    });

    if (!folderFiles.length) {
      const empty = document.createElement("div");
      empty.className = "tree-node tree-node-file";
      empty.style.opacity = "0.7";
      empty.textContent = "No files yet";
      childWrap.appendChild(empty);
    }

    folderNode.appendChild(childWrap);
    return folderNode;
  };

  rootEntries.forEach((folderName) => {
    if (!folderName || folderName === "root") {
      const rootFiles = folders.get("root") || [];
      rootFiles.forEach((file) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `tree-node tree-node-file ${state.activeFileId === file.id ? "active" : ""}`;
        btn.innerHTML = `
          <span>📄</span>
          <span>${file.name}</span>
        `;
        btn.addEventListener("click", () => openFile(file.id));
        projectTreeEl.appendChild(btn);
      });
      return;
    }

    projectTreeEl.appendChild(renderFolder(folderName));
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
      if (event.target.classList.contains("tab-close")) {
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
  updateEditorFromFile(file);
}

function updateEditorFromFile(file) {
  if (!state.monacoReady || !state.editor) return;

  const model = state.editor.getModel();
  const currentFile = getFileById(state.activeFileId);

  if (!currentFile) return;

  const language = currentFile.language || detectLanguage(currentFile.name);
  if (model && model.getValue() !== currentFile.content) {
    state.editor.setValue(currentFile.content);
  }

  const thisModel = state.editor.getModel();
  if (thisModel) {
    window.monaco.editor.setModelLanguage(thisModel, language);
  }
}

function rememberEditorChanges() {
  const active = getFileById(state.activeFileId);
  if (!active || !state.editor) return;
  active.content = state.editor.getValue();
  saveProject();
}

function createNewFile() {
  const fileName = prompt("Enter a new file name (example: Main.java):", "NewFile.java");
  if (!fileName) return;

  const normalized = fileName.trim();
  if (!normalized) return;

  const file = {
    id: uniqueId(),
    name: normalized,
    path: normalized,
    folder: "",
    type: "file",
    language: detectLanguage(normalized),
    content: ""
  };

  state.project.files.push(file);
  saveProject();
  openFile(file.id);
}

function createNewFolder() {
  const folderName = prompt("Enter folder name:", "resources");
  if (!folderName) return;

  const clean = folderName.trim();
  if (!clean) return;

  const folderKey = `${clean}`;
  const exists = state.project.files.some((file) => file.folder === folderKey || file.path.startsWith(`${folderKey}/`));
  if (exists) {
    logOutput(`Folder "${clean}" already exists.`);
    return;
  }

  state.project.files.push({
    id: uniqueId(),
    name: folderKey,
    path: folderKey,
    folder: folderKey,
    type: "folder",
    language: "folder",
    content: ""
  });

  saveProject();
  renderTree();
  logOutput(`Created folder: ${clean}`);
}

function removeFile(fileId) {
  const file = getFileById(fileId);
  if (!file) return;

  if (state.project.files.length === 1) {
    logOutput("At least one file must remain in the project.");
    return;
  }

  state.project.files = state.project.files.filter((item) => item.id !== fileId);
  const nextActive = state.project.files[0];
  saveProject();
  openFile(nextActive.id);
}

function logOutput(message) {
  const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const line = `[${timestamp}] ${message}`;
  state.outputs.push(line);
  outputConsoleEl.textContent = state.outputs.join("\n");
  outputConsoleEl.scrollTop = outputConsoleEl.scrollHeight;
}

function clearOutput() {
  state.outputs = [];
  outputConsoleEl.textContent = "Console cleared.";
}

function saveCurrentFile() {
  const active = getFileById(state.activeFileId);
  if (!active || !state.editor) {
    logOutput("No file is currently open to save.");
    return;
  }

  active.content = state.editor.getValue();
  saveProject();
  logOutput(`Saved: ${active.name}`);
}

function runCurrentProject() {
  const active = getFileById(state.activeFileId);
  if (!active) {
    logOutput("Please select a file before running.");
    return;
  }

  const content = state.editor ? state.editor.getValue() : active.content;
  const language = active.language || detectLanguage(active.name);

  logOutput(`Running ${active.name} (${language})`);

  if (language === "javascript") {
    try {
      const result = Function(`"use strict";\n${content}`)();
      logOutput(result === undefined ? "Execution finished with no return value." : String(result));
    } catch (error) {
      logOutput(`Runtime error: ${error.message}`);
    }
    return;
  }

  if (language === "python") {
    logOutput("Python execution is available in a full backend environment. In this browser IDE, the code is prepared for execution in a connected runtime.");
    logOutput("Current file preview:\n" + content.split("\n").slice(0, 6).join("\n"));
    return;
  }

  if (language === "java" || language === "cpp") {
    logOutput("This browser-based IDE is ready for Java/C++ source editing. Connect a backend compiler to enable full build and execution.");
    logOutput("Source preview:\n" + content.split("\n").slice(0, 8).join("\n"));
    return;
  }

  logOutput("Execution preview:\n" + content.split("\n").slice(0, 8).join("\n"));
}

function initEditor() {
  require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs" } });

  require(["vs/editor/editor.main"], () => {
    const activeFile = state.project.files[0];
    state.activeFileId = activeFile.id;

    state.editor = window.monaco.editor.create(document.getElementById("editor-container"), {
      value: activeFile.content,
      language: activeFile.language || detectLanguage(activeFile.name),
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
      rememberEditorChanges();
    });

    languageSelectEl.addEventListener("change", () => {
      const active = getFileById(state.activeFileId);
      if (!active) return;
      active.language = languageSelectEl.value;
      if (state.editor) {
        window.monaco.editor.setModelLanguage(state.editor.getModel(), languageSelectEl.value);
      }
      saveProject();
      logOutput(`Language changed for ${active.name}: ${languageSelectEl.value}`);
    });

    document.getElementById("save-btn").addEventListener("click", saveCurrentFile);
    document.getElementById("run-btn").addEventListener("click", runCurrentProject);
    document.getElementById("new-file-btn").addEventListener("click", createNewFile);
    document.getElementById("new-folder-btn").addEventListener("click", createNewFolder);
    document.getElementById("clear-output-btn").addEventListener("click", clearOutput);

    renderTree();
    renderTabs();
    logOutput("CodeCraft IDE started successfully.");
  });
}

window.addEventListener("DOMContentLoaded", initEditor);

window.addEventListener("beforeunload", () => {
  if (state.editor && state.activeFileId) {
    const file = getFileById(state.activeFileId);
    if (file) file.content = state.editor.getValue();
    saveProject();
  }
});
