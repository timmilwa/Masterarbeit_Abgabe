import Cocoa

class SelectionListener {
    var globalMonitor: Any?
    var localMonitor: Any?
    
    func start() {
        _ = NSApplication.shared
        
        fputs("Starting SelectionListener...\n", stderr)
        
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true]
        let accessEnabled = AXIsProcessTrustedWithOptions(options as CFDictionary)
        
        fputs("Accessibility enabled: \(accessEnabled)\n", stderr)
        
        if !accessEnabled {
            fputs("WARNING: Accessibility permission required.\n", stderr)
        }

        // Monitor global left mouse up events (end of a click or drag)
        globalMonitor = NSEvent.addGlobalMonitorForEvents(matching: .leftMouseUp) { event in
            self.checkSelection()
        }
        
        // Also local just in case
        localMonitor = NSEvent.addLocalMonitorForEvents(matching: .leftMouseUp) { event in
            self.checkSelection()
            return event
        }
        
        fputs("Selection monitors registered.\n", stderr)
        NSApplication.shared.run()
    }
    
    func checkSelection() {
        // We defer slightly to let the application process the selection event internally
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
            self.performCheck()
        }
    }
    
    func performCheck() {
        let systemWide = AXUIElementCreateSystemWide()
        
        var focusedElement: AnyObject?
        let result = AXUIElementCopyAttributeValue(systemWide, kAXFocusedUIElementAttribute as CFString, &focusedElement)
        
        if result == .success, let element = focusedElement {
            let axElement = element as! AXUIElement
            
            var selectedTextValue: AnyObject?
            let textResult = AXUIElementCopyAttributeValue(axElement, kAXSelectedTextAttribute as CFString, &selectedTextValue)
            
            if textResult == .success, let text = selectedTextValue as? String, !text.isEmpty {
                // Remove newlines and trim to check if it's just whitespace
                if !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    print("TEXT_SELECTED: \(text.prefix(50))...") // Print prefix for debug
                    fflush(stdout)
                    return
                }
            }
        }
        
        print("TEXT_CLEARED")
        fflush(stdout)
    }
}

let listener = SelectionListener()
listener.start()
