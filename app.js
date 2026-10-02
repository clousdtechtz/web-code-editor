const STORAGE_KEY = "codecraft-ide-project-v1";

const defaultProject = {
  files: [
    {
      id: "index-html",
      name: "index.html",
      path: "index.html",
      folder: "",
      type: "file",
      language: "html",
      content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hello CodeCraft</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>Welcome to CodeCraft!</h1>
        <p>Edit this HTML file and see the preview on the right.</p>
        <button id="myBtn">Click Me</button>
        <p id="demo"></p>
    </div>
    <script src="script.js"><\/script>
</body>
</html>`
    },
    {
      id: "style-css",
      name: "style.css",
      path: "style.css",
      folder: "",
      type: "file",
      language: "css",
      content: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.container {
  background: white;
  padding: 40px;
  border-radius: 15px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  text-align: center;
  max-width: 500px;
}

h1 {
  color: #667eea;
  margin-bottom: 20px;
  font-size: 2.5em;
}

p {
  color: #555;
  margin-bottom: 20px;
  font-size: 1.1em;
}

button {
  background: #667eea;
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 8px;
  font-size: 1em;
  cursor: pointer;
  transition: 0.3s;
}

button:hover {
  background: #764ba2;
}

#demo {
  margin-top: 20px;
  font-weight: bold;
  color: #22c55e;
  min-height: 30px;
}`
    },
    {
      id: "script-js",
      name: "script.js",
      path: "script.js",
      folder: "",
      type: "file",
      language: "javascript",
      content: `let clickCount = 0;

document.getElementById('myBtn').addEventListener('click', function() {
    clickCount++;
    document.getElementById('demo').textContent = 'Button clicked ' + clickCount + ' times!';
});`
    },
    {
      id: "main-java",
      name: "Main.java",
      path: "src/Main.java",
      folder: "src",
      type: "file",
      language: "java",
      content: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from CodeCraft IDE!");
        System.out.println("Write your Java code here.");
    }
}`
    },
    {
      id: "readme-md",
      name: "README.md",
      path: "README.md",
      folder: "",
      type: "file",
      language: "markdown",
      content: `# CodeCraft IDE Project

This is your web project with live preview.

## Features
- Edit HTML, CSS, JavaScript
- Live preview in phone frame
- Save and download your project
- Multiple language support

## How to use
1. Edit the HTML, CSS, or JS files
2. See the live preview on the right
3. Click Save to save your project
4. Download as ZIP to get all files`
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
const previewFrameEl = document.getElementById("preview-frame");

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

function getFileByName(fileName) {
  return state.project.files.find((file) => file.name === fileName) || null;
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

function renderTree() {
  const folders = new Map();
  const rootFiles = [];

  state.project.files.forEach((file) => {
    if (!file.folder || file.folder === "") {
      rootFiles.push(file);
      return;
    }
    if (!folders.has(file.folder)) folders.set(file.folder, []);
    folders.get(file.folder).push(file);
  });

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
    const folderBtn = document.createElement("button");
    folderBtn.type = "button";
    folderBtn.className = "tree-node tree-node-folder";
    folderBtn.innerHTML = `<span>📁</span><span>${folderName}</span>`;
    projectTreeEl.appendChild(folderBtn);

    folders.get(folderName).forEach((file) => {
      const child = document.createElement("button");
      child.type = "button";
      child.className = `tree-node tree-node-file ${state.activeFileId === file.id ? "active" : ""}`;
      child.innerHTML = `<span>📄</span><span>${file.name}</span>`;
      child.addEventListener("click", () => openFile(file.id));
      projectTreeEl.appendChild(child);
    });
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
  logOutput(`✓ Saved: ${file.name}`);
  updatePreview();
}

function createNewFile() {
  const fileName = prompt("Enter a file name (example: Main.java, app.py, index.html):", "NewFile.html");
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
  logOutput(`✓ Created file: ${file.name}`);
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

  state.project.files.push({
    id: uniqueId(),
    name: cleanName,
    path: cleanName,
    folder: cleanName,
    type: "folder",
    language: "folder",
    content: ""
  });

  saveProject();
  renderTree();
  logOutput(`✓ Created folder: ${cleanName}`);
}

function removeFile(fileId) {
  const file = getFileById(fileId);
  if (!file) return;

  if (state.project.files.length <= 1) {
    logOutput("At least one file must remain in the project.");
    return;
  }

  state.project.files = state.project.files.filter((item) => item.id !== fileId);
  const nextFile = state.project.files[0];
  saveProject();
  openFile(nextFile.id);
  logOutput(`✓ Deleted: ${file.name}`);
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
  updatePreview();
  logOutput("✓ Project reset to default sample files.");
}

function updatePreview() {
  const htmlFile = getFileByName("index.html");
  const cssFile = getFileByName("style.css");
  const jsFile = getFileByName("script.js");

  if (!htmlFile) {
    previewFrameEl.innerHTML = "<p>No index.html file found</p>";
    return;
  }

  let html = htmlFile.content;

  if (cssFile && !html.includes("style.css")) {
    html = html.replace("</head>", `<style>${cssFile.content}</style>\n</head>`);
  } else if (cssFile) {
    html = html.replace("<link rel=\"stylesheet\" href=\"style.css\">", `<style>${cssFile.content}</style>`);
  }

  if (jsFile && !html.includes("script.js")) {
    html = html.replace("</body>", `<script>${jsFile.content}</script>\n</body>`);
  } else if (jsFile) {
    html = html.replace("<script src=\"script.js\"><\/script>", `<script>${jsFile.content}</script>`);
  }

  try {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    previewFrameEl.src = url;
    logOutput("✓ Preview updated");
  } catch (error) {
    logOutput(`Error updating preview: ${error.message}`);
  }
}

async function downloadProjectAsZip() {
  if (!window.JSZip) {
    logOutput("Error: JSZip library not loaded");
    return;
  }

  logOutput("📦 Creating ZIP file...");
  const zip = new JSZip();

  state.project.files.forEach((file) => {
    if (file.type === "folder") return;
    const path = file.path || file.name;
    zip.file(path, file.content);
  });

  try {
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "codecraft-project.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logOutput("✓ Project downloaded as codecraft-project.zip");
  } catch (error) {
    logOutput(`Error downloading ZIP: ${error.message}`);
  }
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
        if (file.name === "index.html" || file.name === "style.css" || file.name === "script.js") {
          updatePreview();
        }
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
    document.getElementById("run-btn").addEventListener("click", updatePreview);
    document.getElementById("refresh-preview-btn").addEventListener("click", updatePreview);
    document.getElementById("new-file-btn").addEventListener("click", createNewFile);
    document.getElementById("new-folder-btn").addEventListener("click", createNewFolder);
    document.getElementById("clear-output-btn").addEventListener("click", clearOutput);
    document.getElementById("reset-project-btn").addEventListener("click", resetProject);
    document.getElementById("download-btn").addEventListener("click", downloadProjectAsZip);

    renderTree();
    renderTabs();
    updatePreview();
    logOutput("🚀 CodeCraft IDE started successfully.");
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
