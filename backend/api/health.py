import os
import platform
import psutil
from fastapi import APIRouter
from backend.models.schemas import HealthResponse, SystemInfoResponse
from backend.services.face_engine import face_engine

router = APIRouter(tags=["Health & Telemetry"])

@router.get("/health", response_model=HealthResponse)
async def get_health():
    """Health check endpoint confirming FastAPI backend operational status."""
    return HealthResponse(
        status="healthy",
        service="CCTV Candidate Search Backend",
        version="1.0.0"
    )

@router.get("/system/info", response_model=SystemInfoResponse)
async def get_system_info():
    """Returns local workstation operating system, hardware, and runtime telemetry."""
    # RAM telemetry
    mem = psutil.virtual_memory()
    ram_total_gb = round(mem.total / (1024 ** 3), 1)
    ram_available_gb = round(mem.available / (1024 ** 3), 1)

    # ONNX Runtime providers check
    onnx_providers = []
    try:
        import onnxruntime as ort
        onnx_providers = ort.get_available_providers()
    except Exception:
        onnx_providers = ["CPUExecutionProvider"]

    # GPU / CUDA detection
    cuda_available = "CUDAExecutionProvider" in onnx_providers
    gpu_available = cuda_available or any("GPU" in p or "CUDA" in p or "DirectML" in p or "CoreML" in p for p in onnx_providers)
    
    # Try detecting GPU Name if available
    gpu_name = None
    if cuda_available:
        try:
            import torch
            if torch.cuda.is_available():
                gpu_name = torch.cuda.get_device_name(0)
        except Exception:
            gpu_name = "NVIDIA CUDA Hardware Accelerator"
    elif gpu_available:
        gpu_name = "Hardware Acceleration Device"

    selected_provider = "CUDAExecutionProvider" if cuda_available else ("DirectMLExecutionProvider" if "DirectMLExecutionProvider" in onnx_providers else "CPUExecutionProvider")

    return SystemInfoResponse(
        os=platform.system(),
        os_release=platform.release(),
        python_version=platform.python_version(),
        cpu=platform.processor() or "Multi-Core CPU",
        cpu_cores=os.cpu_count() or 4,
        ram_total_gb=ram_total_gb,
        ram_available_gb=ram_available_gb,
        gpu_available=gpu_available,
        gpu_name=gpu_name,
        cuda_available=cuda_available,
        onnx_providers=onnx_providers,
        biometric_engine_ready=face_engine.biometric_engine_ready,
        face_detection_model=face_engine.face_detection_model,
        face_recognition_model=face_engine.face_recognition_model,
        model_files_present=face_engine.model_files_present,
        missing_model_files=face_engine.missing_model_files,
        selected_execution_provider=selected_provider,
        embedding_dimension=face_engine.embedding_dimension,
        model_initialization_error=face_engine.model_initialization_error
    )
