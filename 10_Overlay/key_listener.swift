import Cocoa

class KeyListener {
    var leftCommandPressed = false
    var rightCommandPressed = false
    var wasTriggered = false
    
    var globalMonitor: Any?
    var localMonitor: Any?
    
    func start() {
        // Initialize NSApplication - required for some event handling
        _ = NSApplication.shared
        
        fputs("Starting KeyListener (v3 - NSApp)...\n", stderr)
        
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true]
        let accessEnabled = AXIsProcessTrustedWithOptions(options as CFDictionary)
        
        fputs("Accessibility enabled: \(accessEnabled)\n", stderr)
        
        if !accessEnabled {
            fputs("WARNING: Accessibility permission required.\n", stderr)
        }

        // Monitor global events
        globalMonitor = NSEvent.addGlobalMonitorForEvents(matching: .flagsChanged) { event in
            self.handleFlagsChanged(event: event)
        }
        
        // Monitor local events
        localMonitor = NSEvent.addLocalMonitorForEvents(matching: .flagsChanged) { event in
            self.handleFlagsChanged(event: event)
            return event
        }
        
        fputs("Event monitors registered.\n", stderr)
        
        NSApplication.shared.run()
    }
    
    func handleFlagsChanged(event: NSEvent) {
        let flags = event.modifierFlags.rawValue
        
        // NSEvent modifier flags for device-specific command keys
        // 0x08 = NX_DEVICELCMDKEYMASK (Left Command)
        // 0x10 = NX_DEVICERCMDKEYMASK (Right Command)
        
        let leftCmdPressed = (flags & 0x8) != 0
        let rightCmdPressed = (flags & 0x10) != 0
        
        if leftCmdPressed && rightCmdPressed {
            if !wasTriggered {
                print("TOGGLE_SCREENSHOT")
                fflush(stdout)
                wasTriggered = true
            }
        } else {
            wasTriggered = false
        }
    }
}

let listener = KeyListener()
listener.start()
