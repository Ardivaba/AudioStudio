import gc
import os
import time
import base64
import numpy as np
import torch
from fastapi import FastAPI, UploadFile, Form, File
from fastapi.middleware.cors import CORSMiddleware
from diffusers.training_utils import set_seed
from depthcrafter.depth_crafter_ppl import DepthCrafterPipeline
from depthcrafter.unet import DiffusersUNetSpatioTemporalConditionModelDepthCrafter
from depthcrafter.utils import read_video_frames, vis_sequence_depth, save_video

# Sleep for 10 seconds on startup
time.sleep(10)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model at startup
unet = DiffusersUNetSpatioTemporalConditionModelDepthCrafter.from_pretrained(
    "tencent/DepthCrafter",
    low_cpu_mem_usage=True,
    torch_dtype=torch.float16,
)
pipe = DepthCrafterPipeline.from_pretrained(
    "stabilityai/stable-video-diffusion-img2vid-xt",
    unet=unet,
    torch_dtype=torch.float16,
    variant="fp16",
)
pipe.to("cuda")
pipe.enable_xformers_memory_efficient_attention()

@app.post("/process")
async def process_video(
    video: UploadFile = File(...),
    num_denoising_steps: int = Form(10),
    guidance_scale: float = Form(1.2),
    max_res: int = Form(1024),
    process_length: int = Form(60)
):
    # Save uploaded video
    temp_path = f"temp_{video.filename}"
    with open(temp_path, "wb") as f:
        f.write(await video.read())

    set_seed(42)

    # Process video
    frames, target_fps = read_video_frames(temp_path, process_length, 15, max_res)

    # Generate depth map
    with torch.inference_mode():
        res = pipe(
            frames,
            height=frames.shape[1],
            width=frames.shape[2],
            output_type="np",
            guidance_scale=guidance_scale,
            num_inference_steps=num_denoising_steps,
            window_size=110,
            overlap=25,
            track_time=True,
        ).frames[0]

    # Process results
    res = res.sum(-1) / res.shape[-1]
    res = (res - res.min()) / (res.max() - res.min())
    vis = vis_sequence_depth(res)

    # Save results to temporary files
    input_temp = "temp_input.mp4"
    vis_temp = "temp_vis.mp4"

    save_video(frames, input_temp, fps=target_fps)
    save_video(vis, vis_temp, fps=target_fps)

    # Read the videos back as bytes
    with open(input_temp, "rb") as f:
        input_video_bytes = f.read()
    with open(vis_temp, "rb") as f:
        depth_video_bytes = f.read()

    # Clean up
    os.remove(temp_path)
    os.remove(input_temp)
    os.remove(vis_temp)
    gc.collect()
    torch.cuda.empty_cache()

    return {
        "input_video": base64.b64encode(input_video_bytes).decode(),
        "depth_video": base64.b64encode(depth_video_bytes).decode()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)