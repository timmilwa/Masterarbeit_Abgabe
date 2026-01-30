from PIL import Image, ImageOps
import os

def resize_icon():
    input_path = 'assets/input_icon.png'
    output_path = 'assets/icon.png'
    
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found")
        return

    try:
        # Open original image
        img = Image.open(input_path).convert("RGBA")
        
        # Standard macOS icon visible area is roughly 80-85% of the full canvas
        # Canvas size
        TARGET_SIZE = (1024, 1024)
        
        # New inner size (85% of 1024 is ~870)
        # Let's go with 850px to be safe and standard looking
        INNER_SIZE = (850, 850)
        
        # Resize original image to inner size, using high quality resampling
        img_resized = img.resize(INNER_SIZE, Image.Resampling.LANCZOS)
        
        # Create new transparent canvas
        new_icon = Image.new("RGBA", TARGET_SIZE, (0, 0, 0, 0))
        
        # Calculate centering position
        x = (TARGET_SIZE[0] - INNER_SIZE[0]) // 2
        y = (TARGET_SIZE[1] - INNER_SIZE[1]) // 2
        
        # Paste resized image onto canvas
        new_icon.paste(img_resized, (x, y), img_resized)
        
        # Save back
        new_icon.save(output_path, "PNG")
        print(f"Successfully resized icon to {TARGET_SIZE} with {INNER_SIZE} content.")
        
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    resize_icon()
