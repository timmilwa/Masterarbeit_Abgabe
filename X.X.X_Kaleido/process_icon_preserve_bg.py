#!/usr/bin/env python3
"""
Script to process icon: resize with padding, preserving the black background
"""

try:
    from PIL import Image
    import sys
    import os

    def process_icon_preserve_bg(input_path, output_path, output_size=512, content_ratio=0.85):
        """
        Process icon: resize with padding, preserving the original background
        
        Args:
            input_path: Input icon file
            output_path: Output icon file
            output_size: Final icon size (512 or 256)
            content_ratio: Ratio of canvas that should contain content (0.85 = 85% means 7.5% padding on each side)
        """
        # Open the original icon
        img = Image.open(input_path)
        
        # Convert to RGBA to handle transparency if needed, but preserve the image as-is
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Calculate the size for the content (with padding)
        content_size = int(output_size * content_ratio)
        
        # Resize the icon to fit within the padded area
        img_resized = img.resize((content_size, content_size), Image.Resampling.LANCZOS)
        
        # Create a new transparent canvas at the output size
        final_img = Image.new('RGBA', (output_size, output_size), (0, 0, 0, 0))
        
        # Calculate padding to center the content
        padding = (output_size - content_size) // 2
        
        # Paste the resized icon onto the centered canvas (preserving all pixels including black background)
        final_img.paste(img_resized, (padding, padding), img_resized)
        
        # Save the processed icon
        final_img.save(output_path, 'PNG')
        print(f"Successfully processed icon (preserving background): {output_path} ({output_size}x{output_size} with {content_ratio*100:.0f}% content area)")

    if __name__ == '__main__':
        input_file = sys.argv[1] if len(sys.argv) > 1 else 'assets/icon.png'
        output_file = sys.argv[2] if len(sys.argv) > 2 else 'assets/icon_dock.png'
        output_size = int(sys.argv[3]) if len(sys.argv) > 3 else 512
        content_ratio = float(sys.argv[4]) if len(sys.argv) > 4 else 0.85
        
        if not os.path.exists(input_file):
            print(f"Error: Input file not found: {input_file}")
            sys.exit(1)
        
        process_icon_preserve_bg(input_file, output_file, output_size, content_ratio)

except ImportError:
    print("PIL/Pillow not available. Please install it or use another method.")
    sys.exit(1)








