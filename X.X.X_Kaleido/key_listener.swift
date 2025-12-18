#!/usr/bin/env swift

import Cocoa
import ApplicationServices

class KeyListener {
    var leftCommandPressed = false
    var rightCommandPressed = false
    var wasTriggered = false
    var globalMonitor: Any?
    var localMonitor: Any?
    
    func start() {
        _ = NSApplication.shared
        
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true]
        let accessEnabled = AXIsProcessTrustedWithOptions(options as CFDictionary)
        
        if !accessEnabled {
            // Accessibility permissions required - user will be prompted
        }
        
        globalMonitor = NSEvent.addGlobalMonitorForEvents(matching: .flagsChanged) { [weak self] event in
            self?.handleFlagsChanged(event: event)
        }
        
        localMonitor = NSEvent.addLocalMonitorForEvents(matching: .flagsChanged) { [weak self] event in
            self?.handleFlagsChanged(event: event)
            return event
        }
        
        NSApplication.shared.run()
    }
    
    func handleFlagsChanged(event: NSEvent) {
        let flags = event.modifierFlags.rawValue
        
        // NX_DEVICELCMDKEYMASK = 0x08 (Linke Command)
        // NX_DEVICERCMDKEYMASK = 0x10 (Rechte Command)
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

