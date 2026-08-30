/**
 * Provides the standalone offline Windows desktop application files (Python + PySide6 + OpenCV + ONNX Runtime)
 * allowing one-click export for local Windows deployment as an offline .EXE.
 */

export const WINDOWS_STANDALONE_FILES = {
  'run.bat': `@echo off
title CCTV Candidate Search & Evidence Extraction
echo Starting CCTV Candidate Search Workstation...
if not exist .venv (
    echo Virtual environment not found. Running setup.bat first...
    call setup.bat
)
call .venv\\Scripts\\activate
python main.py
if errorlevel 1 (
    echo Application exited with an error.
    pause
)`,

  'setup.bat': `@echo off
title CCTV Search - One-Click Environment Setup
echo ========================================================
echo   CCTV Candidate Search & Clip Extraction Setup
echo ========================================================
echo.
echo [1/3] Creating Python Virtual Environment...
python -m venv .venv
if errorlevel 1 (
    echo [ERROR] Python 3.10+ is required. Please install Python from python.org
    pause
    exit /b 1
)

echo [2/3] Activating virtual environment & installing dependencies...
call .venv\\Scripts\\activate
python -m pip install --upgrade pip
pip install -r requirements.txt

echo [3/3] Downloading local ONNX Face Models (YuNet + SFace)...
python scripts\\download_models.py

echo.
echo ========================================================
echo   Setup Complete! You can now launch using run.bat
echo   Or compile to CCTV-Candidate-Search.exe via build.bat
echo ========================================================
pause`,

  'build.bat': `@echo off
title Build Standalone Windows Executable
echo ========================================================
echo   Compiling CCTV-Candidate-Search.exe (PyInstaller)
echo ========================================================
call .venv\\Scripts\\activate
pip install pyinstaller
pyinstaller build.spec --noconfirm --clean
echo.
if exist dist\\CCTV-Candidate-Search\\CCTV-Candidate-Search.exe (
    echo [SUCCESS] Standalone Windows App built in: dist\\CCTV-Candidate-Search\\
    echo You can distribute this folder without needing Python installed on client machines!
) else (
    echo [ERROR] Build failed. Check build logs above.
)
pause`,

  'requirements.txt': `# CCTV Candidate Search - Desktop Requirements
numpy>=1.26.0,<2.5.0
opencv-python>=4.9.0
opencv-contrib-python>=4.9.0
onnxruntime>=1.17.0
psutil>=5.9.0
PySide6>=6.6.0
faiss-cpu>=1.8.0
openpyxl>=3.1.0
reportlab>=4.0.0
pandas>=2.2.0
scikit-image>=0.22.0
pyinstaller>=6.6.0; sys_platform == "win32"`,

  'README.md': `# CCTV Candidate Search & Clip Extraction (Windows Desktop)

Enterprise Windows workstation application for automated CCTV candidate identification, biometric matching, human verification, and evidence clip extraction with SHA-256 integrity verification.

## 🚀 Quick Start on Windows

1. Double-click **\`setup.bat\`** (Installs dependencies and downloads local YuNet & SFace ONNX models).
2. Double-click **\`run.bat\`** to start the application directly.
3. Default Login:
   - **Username**: \`admin\`
   - **Password**: \`admin123\`

## 📦 Building Standalone \`.EXE\` (No Python Required for Users)
Run **\`build.bat\`**. It generates \`dist/CCTV-Candidate-Search/CCTV-Candidate-Search.exe\`.

## 🛠 Hardware Acceleration
Automatically activates NVIDIA CUDA / TensorRT if GPU and drivers are present, with seamless multi-threaded CPU fallback.`
};

export function downloadStandaloneFile(filename: keyof typeof WINDOWS_STANDALONE_FILES): void {
  const content = WINDOWS_STANDALONE_FILES[filename];
  if (!content) return;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
