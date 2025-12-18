#!/usr/bin/env swift

import Cocoa
import Foundation

let options = CGWindowListOption(arrayLiteral: .optionOnScreenOnly, .excludeDesktopElements)
if let windowList = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] {
    var windows: [[String: Any]] = []
    
    for window in windowList {
        if let bounds = window[kCGWindowBounds as String] as? [String: Any],
           let x = bounds["X"] as? CGFloat,
           let y = bounds["Y"] as? CGFloat,
           let width = bounds["Width"] as? CGFloat,
           let height = bounds["Height"] as? CGFloat {
            
            let windowInfo: [String: Any] = [
                "x": x,
                "y": y,
                "width": width,
                "height": height,
                "layer": window[kCGWindowLayer as String] as? Int ?? 0
            ]
            
            windows.append(windowInfo)
        }
    }
    
    if let jsonData = try? JSONSerialization.data(withJSONObject: windows, options: []),
       let jsonString = String(data: jsonData, encoding: .utf8) {
        print(jsonString)
    }
}

