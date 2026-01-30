#!/usr/bin/env python3
"""
Script to process icon: preserve the rounded dark background but ensure transparency
at the very edges to prevent black square artifacts
"""

try:
    from PIL import Image
    import sys
    import os
    import math

    def process_icon_final(input_path, output_path, output_size=512, content_ratio=0.85):
        """
        Process icon: resize with padding, making sure edges are transparent if needed
        but preserving the icon's own dark rounded background
        """
        # Open the original icon
        img = Image.open(input_path)
        
        # Convert to RGBA to handle transparency
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
        
        # Paste the resized icon onto the centered canvas
        final_img.paste(img_resized, (padding, padding), img_resized)
        
        # Now, check if there are any solid black pixels at the very edges of the final image
        # and make them transparent (these would be the "black square" artifacts)
        # But preserve the dark rounded background that's part of the icon design
        width, height = final_img.size
        pixels = final_img.load()
        
        # Make the outer 2-3 pixels transparent if they're solid black
        # This removes any square background artifacts while preserving the icon's design
        edge_thickness = 2
        for y in range(height):
            for x in range(width):
                # Check if we're in the edge region
                is_edge = (x < edge_thickness or x >= width - edge_thickness or 
                          y < edge_thickness or y >= height - edge_thickness)
                
                if is_edge:
                    r, g, b, a = pixels[x, y]
                    # If it's solid black (or very dark) at the edge, make it transparent
                    if r < 10 and g < 10 and b < 10:
                        pixels[x, y] = (0, 0, 0, 0)
        
        # Save the processed icon
        final_img.save(output_path, 'PNG')
        print(f"Successfully processed icon: {output_path} ({output_size}x{output_size} with {content_ratio*100:.0f}% content area, edges cleaned)")

    if __name__ == '__main__':
        input_file = sys.argv[1] if len(sys.argv) > 1 else 'assets/icon.png'
        output_file = sys.argv[2] if len(sys.argv) > 2 else 'assets/icon_dock.png'
        output_size = int(sys.argv[3]) if len(sys.argv) > 3 else 512
        content_ratio = float(sys.argv[4]) if len(sys.argv) > 4 else 0.85
        
        if not os.path.exists(input_file):
            print(f"Error: Input file not found: {input_file}")
            sys.exit(1)
        
        process_icon_final(input_file, output_file, output_size, content_ratio)

except ImportError:
    print("PIL/Pillow not available. Please install it or use another method.")
    sys.exit(1)








