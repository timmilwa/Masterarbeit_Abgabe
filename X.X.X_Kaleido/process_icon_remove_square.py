#!/usr/bin/env python3
"""
Script to process icon: remove black square background at corners while preserving
the rounded dark background that's part of the icon design
"""

try:
    from PIL import Image
    import sys
    import os
    import math

    def process_icon_remove_square(input_path, output_path, output_size=512, content_ratio=0.85, corner_radius=0.15):
        """
        Process icon: resize with padding, remove black square corners while preserving rounded background
        
        Args:
            input_path: Input icon file
            output_path: Output icon file
            output_size: Final icon size (512 or 256)
            content_ratio: Ratio of canvas that should contain content
            corner_radius: Radius of rounded corners (as ratio of icon size, typically 0.15-0.2)
        """
        # Open the original icon
        img = Image.open(input_path)
        
        # Convert to RGBA to handle transparency
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Remove black square background from corners of original
        # Make pixels transparent if they're black and in the corner regions
        width, height = img.size
        pixels = img.load()
        corner_radius_pixels = int(min(width, height) * corner_radius)
        
        for y in range(height):
            for x in range(width):
                r, g, b, a = pixels[x, y]
                
                # Check if pixel is black or very dark
                is_black = r < 30 and g < 30 and b < 30
                
                if is_black:
                    # Calculate distance to nearest corner
                    dist_to_corners = [
                        math.sqrt((x - 0)**2 + (y - 0)**2),  # Top-left
                        math.sqrt((x - width)**2 + (y - 0)**2),  # Top-right
                        math.sqrt((x - 0)**2 + (y - height)**2),  # Bottom-left
                        math.sqrt((x - width)**2 + (y - height)**2)  # Bottom-right
                    ]
                    min_dist = min(dist_to_corners)
                    
                    # If we're close to a corner (in the corner region), make it transparent
                    # This removes the square background while preserving the rounded icon
                    if min_dist < corner_radius_pixels:
                        pixels[x, y] = (0, 0, 0, 0)
        
        # Calculate the size for the content (with padding)
        content_size = int(output_size * content_ratio)
        
        # Resize the icon to fit within the padded area
        img_resized = img.resize((content_size, content_size), Image.Resampling.LANCZOS)
        
        # Create a new transparent canvas at the output size
        final_img = Image.new('RGBA', (output_size, output_size), (0, 0, 0, 0))
        
        # Calculate padding to center the content
        padding = (output_size - content_size) // 2
        
        # Paste the resized icon onto the centered canvas
        final_img.paste(img_resized, (padding, padding), img_resized)
        
        # Save the processed icon
        final_img.save(output_path, 'PNG')
        print(f"Successfully processed icon (removed square corners): {output_path} ({output_size}x{output_size} with {content_ratio*100:.0f}% content area)")

    if __name__ == '__main__':
        input_file = sys.argv[1] if len(sys.argv) > 1 else 'assets/icon.png'
        output_file = sys.argv[2] if len(sys.argv) > 2 else 'assets/icon_dock.png'
        output_size = int(sys.argv[3]) if len(sys.argv) > 3 else 512
        content_ratio = float(sys.argv[4]) if len(sys.argv) > 4 else 0.85
        
        if not os.path.exists(input_file):
            print(f"Error: Input file not found: {input_file}")
            sys.exit(1)
        
        process_icon_remove_square(input_file, output_file, output_size, content_ratio)

except ImportError:
    print("PIL/Pillow not available. Please install it or use another method.")
    sys.exit(1)








