#!/usr/bin/env swift

import Cocoa
import ApplicationServices

class KeyListener {
    var screenshotTriggered = false
    var canvasTriggered = false
    var globalMonitor: Any?
    var localMonitor: Any?
    
    func start() {
        _ = NSApplication.shared
        
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true]
        let accessEnabled = AXIsProcessTrustedWithOptions(options as CFDictionary)
        
        if !accessEnabled {
            fputs("ERROR: Accessibility permissions not granted. Please enable Kaleido in System Settings > Privacy & Security > Accessibility.\n", stderr)
            fflush(stderr)
            // Still try to set up monitors - they might work after user grants permission
        }
        
        globalMonitor = NSEvent.addGlobalMonitorForEvents(matching: .flagsChanged) { [weak self] event in
            self?.handleFlagsChanged(event: event)
        }
        
        localMonitor = NSEvent.addLocalMonitorForEvents(matching: .flagsChanged) { [weak self] event in
            self?.handleFlagsChanged(event: event)
            return event
        }
        
        // Check if global monitor was successfully created
        if globalMonitor == nil && !accessEnabled {
            fputs("ERROR: Failed to create global keyboard monitor. Accessibility permissions required.\n", stderr)
            fflush(stderr)
        } else if globalMonitor != nil {
            fputs("INFO: Keyboard listener started successfully.\n", stderr)
            fflush(stderr)
        }
        
        NSApplication.shared.run()
    }
    
    func handleFlagsChanged(event: NSEvent) {
        let flags = event.modifierFlags.rawValue
        
        // NX_DEVICELCMDKEYMASK = 0x08 (Left Command)
        // NX_DEVICERCMDKEYMASK = 0x10 (Right Command)
        // NX_DEVICELALTKEYMASK = 0x20 (Left Option/Alt)
        // NX_DEVICERALTKEYMASK = 0x40 (Right Option/Alt)
        let leftCmdPressed = (flags & 0x8) != 0
        let rightCmdPressed = (flags & 0x10) != 0
        let leftAltPressed = (flags & 0x20) != 0
        let rightAltPressed = (flags & 0x40) != 0
        
        // Check if both Command keys are pressed (screenshot mode)
        let bothCmdPressed = leftCmdPressed && rightCmdPressed
        
        // Check if any Command key AND any Option/Alt key are pressed (open canvas)
        let anyCmdPressed = leftCmdPressed || rightCmdPressed
        let anyAltPressed = leftAltPressed || rightAltPressed
        let cmdAndAltPressed = anyCmdPressed && anyAltPressed
        
        // Handle both Command keys -> screenshot mode
        if bothCmdPressed {
            if !screenshotTriggered {
                print("TOGGLE_SCREENSHOT")
                fflush(stdout)
                screenshotTriggered = true
            }
        } else {
            screenshotTriggered = false
        }
        
        // Handle Option + Command -> open canvas
        if cmdAndAltPressed {
            if !canvasTriggered {
                print("OPEN_CANVAS")
                fflush(stdout)
                canvasTriggered = true
            }
        } else {
            canvasTriggered = false
        }
    }
}

let listener = KeyListener()
listener.start()

