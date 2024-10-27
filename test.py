import requests
import base64

url = "http://localhost:7860/process"

with open("1.mp4", "rb") as f:
    response = requests.post(
        url,
        files={"video": ("1.mp4", f, "video/mp4")},
        data={
            "num_denoising_steps": 4,
            "guidance_scale": 1.2,
            "max_res": 512,
            "process_length": 60
        }
    )

result = response.json()

# Save the videos
with open("output_input.mp4", "wb") as f:
    f.write(base64.b64decode(result["input_video"]))
with open("output_depth.mp4", "wb") as f:
    f.write(base64.b64decode(result["depth_video"]))