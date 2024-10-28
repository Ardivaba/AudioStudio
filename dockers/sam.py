import gc
import os
import time
import numpy as np
import torch
from typing import List, Dict, Optional, Tuple
from pydantic import BaseModel
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sam2.build_sam import build_sam2_video_predictor
import cv2

time.sleep(10)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if not os.path.exists('frames'):
    os.makedirs('frames')

class Point(BaseModel):
    x: int
    y: int
    include: bool

class DetectionRequest(BaseModel):
    points: List[Point]
    frame_number: int = 0

class TrackingRequest(BaseModel):
    points: List[Point]
    initial_frame: int
    target_frames: List[int]

predictor = build_sam2_video_predictor("sam2_hiera_l.yaml", "./checkpoints/sam2_hiera_large.pt")

def extract_frames(video_path: str, max_frames: int = 300) -> Tuple[str, List[str]]:
    frames_dir = os.path.join('frames', f'frames_{int(time.time())}')
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
    return frames_dir, frame_files, fps

@app.post("/upload")
async def upload_video(video: UploadFile = File(...)):
    try:
        temp_path = f"temp_{video.filename}"
        with open(temp_path, "wb") as f:
            content = await video.read()
            f.write(content)

        frames_dir, frame_files, fps = extract_frames(temp_path)
        os.remove(temp_path)

        video_id = os.path.basename(frames_dir).replace('frames_', '')

        inference_state = predictor.init_state(video_path=frames_dir)

        return {
            "video_id": video_id,
            "total_frames": len(frame_files),
            "fps": fps,
            "message": "Upload successful"
        }
    except Exception as e:
        print(f"Error processing video: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect/frames/{video_id}")
async def detect_object(video_id: str, request: DetectionRequest):
    frames_dir = os.path.join('frames', f'frames_{video_id}')
    if not os.path.exists(frames_dir):
        raise HTTPException(status_code=404, detail=f"Video frames not found for ID: {video_id}")

    inference_state = predictor.init_state(video_path=frames_dir)

    points = np.array([[p.x, p.y] for p in request.points], dtype=np.float32)
    labels = np.array([1 if p.include else 0 for p in request.points], dtype=np.int32)

    print(f"Input points: {points}")
    print(f"Labels: {labels}")

    _, obj_ids, mask_logits = predictor.add_new_points(
        inference_state=inference_state,
        frame_idx=request.frame_number,
        obj_id=1,
        points=points,
        labels=labels
    )

    mask = (mask_logits[0] > 0.0).cpu().numpy()
    if len(mask.shape) == 3:
        mask = mask[0]

    rows, cols = np.where(mask)
    print(f"Points found: {len(rows)}")

    if len(rows) > 0:
        center_y = int(np.mean(rows))
        center_x = int(np.mean(cols))
    else:
        center_x = points[0][0]
        center_y = points[0][1]

    return {
        "center": {"x": center_x, "y": center_y},
        "object_id": int(obj_ids[0])
    }

@app.post("/track/frames/{video_id}")
async def track_object(video_id: str, request: TrackingRequest):
    frames_dir = os.path.join('frames', f'frames_{video_id}')
    if not os.path.exists(frames_dir):
        raise HTTPException(status_code=404, detail=f"Video frames not found for ID: {video_id}")

    inference_state = predictor.init_state(video_path=frames_dir)

    points = np.array([[p.x, p.y] for p in request.points], dtype=np.float32)
    labels = np.array([1 if p.include else 0 for p in request.points], dtype=np.int32)

    print(f"Initial points: {points}")
    print(f"Labels: {labels}")

    predictor.add_new_points(
        inference_state=inference_state,
        frame_idx=request.initial_frame,
        obj_id=1,
        points=points,
        labels=labels
    )

    tracking_results = {}
    for frame_idx, obj_ids, mask_logits in predictor.propagate_in_video(inference_state):
        if frame_idx in request.target_frames:
            mask = (mask_logits[0] > 0.0).cpu().numpy()
            if len(mask.shape) == 3:
                mask = mask[0]

            rows, cols = np.where(mask)
            print(f"Frame {frame_idx} - Points found: {len(rows)}")

            if len(rows) > 0:
                center_y = int(np.mean(rows))
                center_x = int(np.mean(cols))
            else:
                if frame_idx > 0 and frame_idx - 1 in tracking_results:
                    center_x = tracking_results[frame_idx - 1]["center"]["x"]
                    center_y = tracking_results[frame_idx - 1]["center"]["y"]
                else:
                    center_x = points[0][0]
                    center_y = points[0][1]

            print(f"Frame {frame_idx} - Center: x={center_x}, y={center_y}")

            tracking_results[frame_idx] = {
                "center": {"x": center_x, "y": center_y},
                "object_id": int(obj_ids[0])
            }

    gc.collect()
    torch.cuda.empty_cache()

    return tracking_results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
