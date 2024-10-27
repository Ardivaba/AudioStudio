import gc
import os
import re
import time
import base64
import numpy as np
import torch
from typing import List, Dict, Optional, Tuple
from pydantic import BaseModel
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sam2.build_sam import build_sam2_video_predictor

time.sleep(10)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Point(BaseModel):
    x: int
    y: int
    include: bool

class DetectionRequest(BaseModel):
    points: List[Point]
    frame_number: int = 0

class TrackingRequest(BaseModel):
    initial_frame: int
    target_frames: List[int]

predictor = build_sam2_video_predictor("sam2_hiera_l.yaml", "./checkpoints/sam2_hiera_large.pt")

def extract_frames(video_path: str, max_frames: int = 300) -> Tuple[str, List[str]]:
    unique_id = str(int(time.time()))
    frames_dir = f'frames_{unique_id}'
    os.makedirs(frames_dir, exist_ok=True)

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_number = 0
    frame_files = []

    while frame_number < max_frames:
        ret, frame = cap.read()
        if not ret:
            break

        frame_filename = os.path.join(frames_dir, f'{frame_number:05d}.jpg')
        cv2.imwrite(frame_filename, frame)
        frame_files.append(f'{frame_number:05d}.jpg')
        frame_number += 1

    cap.release()
    return frames_dir, frame_files

@app.post("/upload")
async def upload_video(video: UploadFile = File(...)):
    temp_path = f"temp_{video.filename}"
    with open(temp_path, "wb") as f:
        content = await video.read()
        f.write(content)

    frames_dir, frame_files = extract_frames(temp_path)
    os.remove(temp_path)

    inference_state = predictor.init_state(video_path=frames_dir)

    return {
        "video_id": os.path.basename(frames_dir),
        "total_frames": len(frame_files)
    }

@app.post("/detect/{video_id}")
async def detect_object(video_id: str, request: DetectionRequest):
    frames_dir = f'frames_{video_id}'
    if not os.path.exists(frames_dir):
        raise HTTPException(status_code=404, detail="Video not found")

    points = np.array([[p.x, p.y] for p in request.points], dtype=np.float32)
    labels = np.array([1 if p.include else 0 for p in request.points], dtype=np.int32)

    inference_state = predictor.init_state(video_path=frames_dir)

    _, obj_ids, mask_logits = predictor.add_new_points(
        inference_state=inference_state,
        frame_idx=request.frame_number,
        obj_id=1,
        points=points,
        labels=labels
    )

    mask = (mask_logits[0] > 0.0).cpu().numpy()

    coords = np.where(mask)
    if len(coords[0]) > 0:
        center_y = int(np.mean(coords[0]))
        center_x = int(np.mean(coords[1]))
    else:
        center_x, center_y = 0, 0

    binary_mask = mask.astype(np.uint8) * 255
    _, buffer = cv2.imencode('.png', binary_mask)
    mask_b64 = base64.b64encode(buffer).decode('utf-8')

    return {
        "mask": mask_b64,
        "center": {"x": center_x, "y": center_y},
        "object_id": int(obj_ids[0])
    }

@app.post("/track/{video_id}")
async def track_object(video_id: str, request: TrackingRequest):
    frames_dir = f'frames_{video_id}'
    if not os.path.exists(frames_dir):
        raise HTTPException(status_code=404, detail="Video not found")

    inference_state = predictor.init_state(video_path=frames_dir)
    tracking_results = {}

    for frame_idx, obj_ids, mask_logits in predictor.propagate_in_video(inference_state):
        if frame_idx in request.target_frames:
            mask = (mask_logits[0] > 0.0).cpu().numpy()
            coords = np.where(mask)
            if len(coords[0]) > 0:
                center_y = int(np.mean(coords[0]))
                center_x = int(np.mean(coords[1]))
            else:
                center_x, center_y = 0, 0

            tracking_results[frame_idx] = {
                "center": {"x": center_x, "y": center_y},
                "object_id": int(obj_ids[0])
            }

    gc.collect()
    torch.cuda.empty_cache()

    return tracking_results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7861)