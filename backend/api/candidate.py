import base64
import json
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Body
from typing import Optional
from backend.models.schemas import (
    FaceAnalysisResponse, 
    EmbeddingResponse, 
    BoundingBox,
    CandidateReference
)
from backend.services.face_engine import face_engine, _TEMP_EMBEDDINGS
from backend.services.search_service import CandidateRepository

router = APIRouter(prefix="/candidate", tags=["Candidate Face Processing"])

@router.post("/analyze", response_model=FaceAnalysisResponse)
async def analyze_candidate_photo(
    file: Optional[UploadFile] = File(None),
    image_base64: Optional[str] = Form(None)
):
    """
    Analyzes candidate photograph for real face detection, localization,
    and biometric quality scoring.
    """
    image_bytes = None

    if file is not None:
        image_bytes = await file.read()
    elif image_base64 is not None:
        try:
            # Strip data:image/...;base64, header if present
            if "," in image_base64:
                image_base64 = image_base64.split(",", 1)[1]
            image_bytes = base64.b64decode(image_base64)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid base64 image data: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Please provide an image file or base64 string.")

    if not image_bytes or len(image_bytes) < 100:
        raise HTTPException(status_code=400, detail="Corrupted or empty image payload received.")

    try:
        result = face_engine.analyze_image(image_bytes)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Face detection engine error: {str(e)}")

@router.post("/embedding", response_model=EmbeddingResponse)
async def generate_candidate_embedding(
    file: Optional[UploadFile] = File(None),
    image_base64: Optional[str] = Form(None),
    face_id: Optional[str] = Form(None),
    bounding_box_json: Optional[str] = Form(None)
):
    """
    Extracts deep neural SFace normalized face embedding vector from the candidate face crop.
    Requires biometric_engine_ready == True. Returns HTTP 503 MODEL_NOT_INITIALIZED if unavailable.
    """
    # 1. Enforce Biometric Readiness Check
    if not face_engine.biometric_engine_ready or face_engine._sface_recognizer is None:
        raise HTTPException(
            status_code=503,
            detail="MODEL_NOT_INITIALIZED: SFace ONNX deep neural network model is not initialized or unavailable. Biometric embedding generation is disabled."
        )

    image_bytes = None

    if file is not None:
        image_bytes = await file.read()
    elif image_base64 is not None:
        try:
            if "," in image_base64:
                image_base64 = image_base64.split(",", 1)[1]
            image_bytes = base64.b64decode(image_base64)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid base64 image data: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Please provide an image file or base64 string.")

    bbox: Optional[BoundingBox] = None
    if bounding_box_json:
        try:
            bbox_dict = json.loads(bounding_box_json)
            bbox = BoundingBox(**bbox_dict)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid bounding box JSON: {str(e)}")

    try:
        embedding_result = face_engine.generate_face_embedding(
            image_bytes=image_bytes,
            bbox=bbox,
            face_id=face_id
        )
        
        # Save reference into CandidateRepository
        emb_data = _TEMP_EMBEDDINGS.get(embedding_result.face_id)
        if emb_data:
            CandidateRepository.save_reference(
                candidate_id=embedding_result.face_id,
                face_id=embedding_result.face_id,
                embedding=emb_data["embedding"],
                quality_score=embedding_result.face_quality_score,
                quality_label="GOOD" if embedding_result.face_quality_score >= 0.75 else ("FAIR" if embedding_result.face_quality_score >= 0.50 else "POOR")
            )

        return embedding_result
    except RuntimeError as re:
        err_msg = str(re)
        if "MODEL_NOT_INITIALIZED" in err_msg:
            raise HTTPException(status_code=503, detail=err_msg)
        elif "NO_FACE_DETECTED" in err_msg or "MULTIPLE_FACES_REQUIRE_SELECTION" in err_msg or "FACE_LANDMARKS_UNAVAILABLE" in err_msg:
            raise HTTPException(status_code=400, detail=err_msg)
        elif "FACE_ALIGNMENT_FAILED" in err_msg or "EMBEDDING_GENERATION_FAILED" in err_msg:
            raise HTTPException(status_code=500, detail=err_msg)
        raise HTTPException(status_code=500, detail=err_msg)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding extraction error: {str(e)}")

@router.get("/reference/{identifier}", response_model=CandidateReference)
async def get_candidate_reference(identifier: str):
    """
    Retrieves verified candidate reference metadata.
    Does NOT return the raw embedding vector.
    """
    ref = CandidateRepository.get_reference(identifier)
    if not ref:
        raise HTTPException(status_code=404, detail=f"Candidate reference '{identifier}' not found.")
    return ref

