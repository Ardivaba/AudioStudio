Flow is:
- You upload video
- AI generates depth map video using DepthCrafter AI
- You click on objects you want to track
- AI tracks these objects using Facebook's SAM 2
- You then compile SAM 2's tracking data with Depth Map  video, you get 3D representation of that objects movement from 2D video
- You then place sounds in Three.JS, attach them to tracked objects or w/e and compile a sound file you can then use in your video editing software
- Meaning that you could use ElevenAI to generate 2D sounds and make them 3D effortlessly, eg: "Slow bullet whizzing past the camera"

You have to patch SAM 2 and DepthCrafter docker images app.py manually with files in ./dockers

License is: Do whatever the fuck you want with the code, as I'm not convinced that it's a good idea anymore.