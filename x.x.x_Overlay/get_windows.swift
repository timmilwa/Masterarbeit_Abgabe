import Foundation
import Quartz

struct WindowInfo: Codable {
    let x: Int
    let y: Int
    let width: Int
    let height: Int
    let ownerName: String
    let name: String
    let layer: Int
}

let options = CGWindowListOption(arrayLiteral: .optionOnScreenOnly, .excludeDesktopElements)
if let windowList = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] {
    var windows: [WindowInfo] = []
    for entry in windowList {
        if let boundsDict = entry[kCGWindowBounds as String] as? [String: CGFloat],
           let layer = entry[kCGWindowLayer as String] as? Int {
            
            let x = Int(boundsDict["X"] ?? 0)
            let y = Int(boundsDict["Y"] ?? 0)
            let width = Int(boundsDict["Width"] ?? 0)
            let height = Int(boundsDict["Height"] ?? 0)
            let ownerName = entry[kCGWindowOwnerName as String] as? String ?? ""
            let name = entry[kCGWindowName as String] as? String ?? ""
            
            windows.append(WindowInfo(x: x, y: y, width: width, height: height, ownerName: ownerName, name: name, layer: layer))
        }
    }
    
    let encoder = JSONEncoder()
    if let data = try? encoder.encode(windows) {
        print(String(data: data, encoding: .utf8)!)
    }
}
