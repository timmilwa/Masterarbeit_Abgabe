#!/usr/bin/env python3
"""
Script to process icon: resize with padding, removing black square background at corners
"""

try:
    from PIL import Image
    import sys
    import os

    def process_icon_remove_black_square(input_path, output_path, output_size=512, content_ratio=0.85):
        """
        Process icon: resize with padding, removing black pixels at edges/corners
        
        Args:
            input_path: Input icon file
            output_path: Output icon file
            output_size: Final icon size (512 or 256)
            content_ratio: Ratio of canvas that should contain content
        """
        # Open the original icon
        img = Image.open(input_path)
        
        # Convert to RGBA to handle transparency
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
        # Remove black pixels at the very edges/corners to eliminate square background
        # We'll make pixels transparent if they're very dark and near the edges
        width, height = img.size
        data = list(img.getdata())
        new_data = []
        
        for y in range(height):
            for x in range(width):
                idx = y * width + x
                r, g, b, a = data[idx]
                
                # Calculate distance from center
                center_x, center_y = width / 2, height / 2
                dist_x = abs(x - center_x) / (width / 2)
                dist_y = abs(y - center_y) / (height / 2)
                dist_from_center = max(dist_x, dist_y)
                
                # If pixel is very dark (black) and near the edges (in the outer 5% of the image),
                # make it transparent to remove the square background
                is_black = r < 30 and g < 30 and b < 30
                is_near_edge = dist_from_center > 0.95  # Outer 5% of the image
                
                if is_black and is_near_edge:
                    new_data.append((0, 0, 0, 0))  # Transparent
                else:
                    new_data.append((r, g, b, a))
        
        img.putdata(new_data)
        
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
        print(f"Successfully processed icon (removed black square): {output_path} ({output_size}x{output_size} with {content_ratio*100:.0f}% content area)")

    if __name__ == '__main__':
        input_file = sys.argv[1] if len(sys.argv) > 1 else 'assets/icon.png'
        output_file = sys.argv[2] if len(sys.argv) > 2 else 'assets/icon_dock.png'
        output_size = int(sys.argv[3]) if len(sys.argv) > 3 else 512
        content_ratio = float(sys.argv[4]) if len(sys.argv) > 4 else 0.85
        
        if not os.path.exists(input_file):
            print(f"Error: Input file not found: {input_file}")
            sys.exit(1)
        
        process_icon_remove_black_square(input_file, output_file, output_size, content_ratio)

except ImportError:
    print("PIL/Pillow not available. Please install it or use another method.")
    sys.exit(1)


