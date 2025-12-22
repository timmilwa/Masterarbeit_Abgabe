#!/usr/bin/env python3
"""
Simple script to create .icns file from a source PNG
Creates all required sizes for macOS icon with proper padding
Removes black square background while preserving icon design
"""

from PIL import Image
import subprocess
import sys
import os
import math

def remove_black_square_background(img):
    """Remove black pixels at corners/edges that create square background"""
    width, height = img.size
    pixels = img.load()
    
    # Process each pixel
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            
            # Check if pixel is black or very dark
            is_black = r < 60 and g < 60 and b < 60
            
            if is_black:
                # Calculate distance from center using Manhattan distance for rounded square detection
                center_x, center_y = width / 2, height / 2
                dist_x = abs(x - center_x) / (width / 2)
                dist_y = abs(y - center_y) / (height / 2)
                
                # For rounded squares, use max distance (L-infinity norm)
                # This better captures the shape of rounded square icons
                dist_from_center = max(dist_x, dist_y)
                
                # Remove black pixels in outer 15% - more aggressive to remove borders
                if dist_from_center > 0.85:
                    pixels[x, y] = (0, 0, 0, 0)  # Transparent
    
    return img

def create_icns(source_png, iconset_dir, icns_file, content_ratio=0.81):
    """Create .icns file from source PNG with padding"""
    
    # Required sizes for .icns (name, size)
    sizes = [
        ('icon_16x16.png', 16),
        ('icon_16x16@2x.png', 32),
        ('icon_32x32.png', 32),
        ('icon_32x32@2x.png', 64),
        ('icon_128x128.png', 128),
        ('icon_128x128@2x.png', 256),
        ('icon_256x256.png', 256),
        ('icon_256x256@2x.png', 512),
        ('icon_512x512.png', 512),
        ('icon_512x512@2x.png', 1024),
    ]
    
    # Create iconset directory if it doesn't exist
    os.makedirs(iconset_dir, exist_ok=True)
    
    # Load source image
    print(f"Loading source image: {source_png}")
    img = Image.open(source_png)
    
    # Ensure RGBA mode for transparency
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # Remove black square background from source image
    print("Removing black square background...")
    img = remove_black_square_background(img)
    
    # Create all sizes with padding
    for filename, output_size in sizes:
        output_path = os.path.join(iconset_dir, filename)
        
        # Calculate content size with padding
        content_size = int(output_size * content_ratio)
        padding = (output_size - content_size) // 2
        
        # Resize icon to content size
        resized = img.resize((content_size, content_size), Image.Resampling.LANCZOS)
        
        # Create transparent canvas
        final_img = Image.new('RGBA', (output_size, output_size), (0, 0, 0, 0))
        
        # Paste centered
        final_img.paste(resized, (padding, padding), resized)
        final_img.save(output_path, 'PNG')
        print(f"Created {filename} ({output_size}x{output_size} with {content_ratio*100:.0f}% content)")
    
    # Use iconutil to create .icns
    print(f"\nCreating .icns file: {icns_file}")
    result = subprocess.run(
        ['iconutil', '-c', 'icns', iconset_dir, '-o', icns_file],
        capture_output=True,
        text=True
    )
    
    if result.returncode == 0:
        print(f"Successfully created {icns_file}")
        return True
    else:
        print(f"Error creating .icns: {result.stderr}")
        return False

if __name__ == '__main__':
    source = 'assets/icon_source.png'
    iconset = 'assets/icon.iconset'
    icns = 'assets/icon.icns'
    content_ratio = 0.81  # 81% content area
    
    if not os.path.exists(source):
        print(f"Error: Source file not found: {source}")
        sys.exit(1)
    
    create_icns(source, iconset, icns, content_ratio)





