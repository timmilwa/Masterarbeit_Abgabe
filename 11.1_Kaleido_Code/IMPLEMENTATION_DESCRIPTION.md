# Implementierungsbeschreibung: Screenshot-Funktionalität, Keyboard-Shortcuts und Overlay-System

## Übersicht

Dieses Dokument beschreibt detailliert die Implementierung der drei Kernfunktionalitäten dieses Prototyps:
1. **Screenshot-Funktionalität** - Wie Screenshots erstellt und verarbeitet werden
2. **Keyboard-Shortcut-Buttons** - Wie globale Tastenkombinationen implementiert sind
3. **Overlay-System mit Hintergrund-Screenshot** - Wie das Overlay mit dem verschwommenen Hintergrund funktioniert

---

## 1. Screenshot-Funktionalität

### 1.1 Architektur-Übersicht

Die Screenshot-Funktionalität nutzt eine Kombination aus:
- **Electron Desktop Capturer API** für den Zugriff auf Bildschirmquellen
- **HTML5 Canvas API** für die Bildverarbeitung und -konvertierung
- **Window Detection** via Swift-Script für intelligente Fenster-Erkennung
- **Media Stream API** für die Video-Stream-Erfassung

### 1.2 Aktivierung des Screenshot-Modus

**Datei:** `renderer.js` (Zeilen 920-946)

Der Screenshot-Modus wird durch die Funktion `startScreenshotMode()` aktiviert:

```javascript
function startScreenshotMode() {
    isScreenshotMode = true;
    // UI wird versteckt
    chatbot.classList.remove('visible');
    
    // Overlay wird angezeigt
    selectionOverlay.style.display = 'block';
    
    // Anweisungs-Pill wird angezeigt
    const pill = document.getElementById('capture-instructions-pill');
    if (pill) {
        pill.style.opacity = '1';
        pill.style.transform = 'translateX(0) scale(1)';
    }
    
    // Maus-Events werden aktiviert (kein Click-Through mehr)
    setIgnoreMouseEvents(false);
    
    // Fenster-Bounds werden abgerufen für Highlighting
    ipcRenderer.invoke('get-window-bounds').then(fetchedWindows => {
        windows = fetchedWindows.filter(w => w.width > 0 && w.height > 0 && w.layer === 0);
    });
}
```

**Wichtige Aspekte:**
- Das Overlay (`#selection-overlay`) wird über den gesamten Bildschirm gelegt
- Ein visuelles Feedback (Pill) zeigt dem Benutzer, dass der Screenshot-Modus aktiv ist
- Die Fensterliste wird asynchron geladen, um Fenster-Highlighting zu ermöglichen

### 1.3 Fenster-Erkennung und Highlighting

**Datei:** `get_windows.swift`

Das System nutzt ein Swift-Script, das über die **Core Graphics Window List API** alle sichtbaren Fenster abruft:

```swift
let options = CGWindowListOption(arrayLiteral: .optionOnScreenOnly, .excludeDesktopElements)
if let windowList = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] {
    // Fenster werden in JSON-Format ausgegeben
}
```

**Datei:** `main.js` (Zeilen 118-137)

Das Electron Main Process ruft dieses Script auf:

```javascript
ipcMain.handle('get-window-bounds', async () => {
    const { execFile } = require('child_process');
    return new Promise((resolve, reject) => {
        execFile(path.join(__dirname, 'get_windows'), (error, stdout, stderr) => {
            if (error) {
                resolve([]); // Fehlerbehandlung
            } else {
                const windows = JSON.parse(stdout);
                resolve(windows);
            }
        });
    });
});
```

**Datei:** `renderer.js` (Zeilen 1010-1044)

Beim Mausbewegen über das Overlay wird das oberste Fenster unter dem Cursor erkannt und hervorgehoben:

```javascript
selectionOverlay.addEventListener('mousemove', (e) => {
    if (!isScreenshotMode || selectionBox.style.display === 'block') {
        windowHighlight.style.display = 'none';
        return;
    }
    
    const x = e.clientX;
    const y = e.clientY;
    
    // Finde das oberste Fenster, das den Punkt (x,y) enthält
    const found = windows.find(w => {
        return x >= w.x && x <= (w.x + w.width) &&
               y >= w.y && y <= (w.y + w.height);
    });
    
    if (found) {
        // Zeige Highlight-Box um das Fenster
        windowHighlight.style.left = found.x + 'px';
        windowHighlight.style.top = found.y + 'px';
        windowHighlight.style.width = found.width + 'px';
        windowHighlight.style.height = found.height + 'px';
        windowHighlight.style.display = 'block';
    }
});
```

### 1.4 Drag-Selection

**Datei:** `renderer.js` (Zeilen 980-1007)

Der Benutzer kann einen Bereich durch Ziehen auswählen:

```javascript
selectionOverlay.addEventListener('mousedown', (e) => {
    if (!isScreenshotMode) return;
    startX = e.clientX;
    startY = e.clientY;
    
    // Initialisiere Selection-Box
    selectionBox.style.left = startX + 'px';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    selectionBox.style.display = 'block';
});

selectionOverlay.addEventListener('mousemove', (e) => {
    // Berechne Dimensionen der Selection-Box
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    const left = Math.min(currentX, startX);
    const top = Math.min(currentY, startY);
    
    // Aktualisiere Box-Dimensionen
    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';
});
```

### 1.5 Screenshot-Erfassung

**Datei:** `renderer.js` (Zeilen 1074-1198)

Die eigentliche Screenshot-Erfassung erfolgt in `captureScreen(rect)`:

#### Schritt 1: Desktop Capturer API

```javascript
// Hole verfügbare Bildschirmquellen über IPC
const sources = await ipcRenderer.invoke('get-sources');
const source = sources[0]; // Primärer Bildschirm

// Erstelle Media Stream
const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
        mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: source.id,
            minWidth: 1280,
            maxWidth: 4000,
            minHeight: 720,
            maxHeight: 4000
        }
    }
});
```

**Datei:** `main.js` (Zeilen 108-116)

Der Main Process stellt die Bildschirmquellen bereit:

```javascript
ipcMain.handle('get-sources', async () => {
    const sources = await desktopCapturer.getSources({ types: ['screen'] });
    return sources.map(source => ({
        id: source.id,
        name: source.name
    }));
});
```

#### Schritt 2: Video-Stream zu Canvas

```javascript
const video = document.createElement('video');
video.srcObject = stream;

await new Promise((resolve, reject) => {
    video.onloadedmetadata = () => {
        video.play();
        
        // Warte 300ms, damit der erste Frame gerendert wird
        setTimeout(() => {
            // Berechne Skalierungsfaktor (High-DPI Displays)
            const scaleX = video.videoWidth / window.innerWidth;
            const scaleY = video.videoHeight / window.innerHeight;
            
            // Erstelle Canvas für den ausgewählten Bereich
            const outputWidth = rect.width * scaleX;
            const outputHeight = rect.height * scaleY;
            
            const canvas = document.createElement('canvas');
            canvas.width = outputWidth;
            canvas.height = outputHeight;
            const ctx = canvas.getContext('2d');
            
            // Zeichne den spezifischen Bereich
            ctx.drawImage(video,
                rect.left * scaleX, rect.top * scaleY, outputWidth, outputHeight, // Quelle
                0, 0, outputWidth, outputHeight // Ziel
            );
            
            // Konvertiere zu Data URL
            const dataURL = canvas.toDataURL('image/png');
            
            // Stoppe Video-Stream
            stream.getTracks().forEach(track => track.stop());
            
            // Zeige Ergebnis
            showScreenshotModal(dataURL, bgDataURL);
        }, 300);
    };
});
```

#### Schritt 3: Vollständiger Hintergrund-Screenshot

**Wichtig:** Das System erfasst **zwei** Screenshots:

1. **Ausschnitt-Screenshot** (`dataURL`): Der vom Benutzer ausgewählte Bereich
2. **Vollbild-Screenshot** (`bgDataURL`): Der gesamte Bildschirm für den Blur-Effekt

```javascript
// Erstelle zweiten Canvas für Vollbild
const fullCanvas = document.createElement('canvas');
fullCanvas.width = video.videoWidth;
fullCanvas.height = video.videoHeight;
const fullCtx = fullCanvas.getContext('2d');

// Zeichne vollständiges Frame
fullCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

const bgDataURL = fullCanvas.toDataURL('image/png');
```

### 1.6 High-DPI Unterstützung

Das System berücksichtigt Retina/High-DPI Displays durch Skalierungsberechnung:

```javascript
const scaleX = video.videoWidth / window.innerWidth;
const scaleY = video.videoHeight / window.innerHeight;
```

Dies stellt sicher, dass Screenshots in nativer Auflösung erfasst werden, auch auf High-DPI Displays.

### 1.7 Beendigung des Screenshot-Modus

**Datei:** `renderer.js` (Zeilen 948-977)

```javascript
function endScreenshotMode() {
    isScreenshotMode = false;
    
    // Verstecke UI-Elemente
    selectionOverlay.style.display = 'none';
    selectionBox.style.display = 'none';
    windowHighlight.style.display = 'none';
    
    // Bereinige State
    currentHighlightedWindow = null;
    windows = [];
    
    // Stelle Click-Through wieder her basierend auf Mausposition
    if (isMouseOverUI(lastMouseX, lastMouseY)) {
        setIgnoreMouseEvents(false);
    } else {
        setIgnoreMouseEvents(true, true);
    }
}
```

---

## 2. Keyboard-Shortcut-Buttons

### 2.1 Architektur-Übersicht

Die Keyboard-Shortcuts nutzen:
- **Swift-basierter Key Listener** für globale Tastenkombinationen
- **Electron IPC** für Kommunikation zwischen Swift-Prozess und Electron
- **NSEvent API** für System-Level Event-Monitoring

### 2.2 Swift Key Listener

**Datei:** `key_listener.swift`

Der Key Listener ist ein eigenständiger Swift-Prozess, der globale Tastatur-Events überwacht:

```swift
class KeyListener {
    var leftCommandPressed = false
    var rightCommandPressed = false
    var wasTriggered = false
    
    func start() {
        // Initialisiere NSApplication (erforderlich für Event-Handling)
        _ = NSApplication.shared
        
        // Prüfe Accessibility-Berechtigungen
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true]
        let accessEnabled = AXIsProcessTrustedWithOptions(options as CFDictionary)
        
        // Registriere globale Event-Monitore
        globalMonitor = NSEvent.addGlobalMonitorForEvents(matching: .flagsChanged) { event in
            self.handleFlagsChanged(event: event)
        }
        
        // Registriere lokale Event-Monitore
        localMonitor = NSEvent.addLocalMonitorForEvents(matching: .flagsChanged) { event in
            self.handleFlagsChanged(event: event)
            return event
        }
        
        NSApplication.shared.run()
    }
}
```

### 2.3 Tastenkombination: Doppel-Command (⌘⌘)

**Datei:** `key_listener.swift` (Zeilen 42-61)

Die Tastenkombination **Command + Command** (beide Command-Tasten gleichzeitig) wird erkannt:

```swift
func handleFlagsChanged(event: NSEvent) {
    let flags = event.modifierFlags.rawValue
    
    // NSEvent modifier flags für gerätespezifische Command-Tasten
    // 0x08 = NX_DEVICELCMDKEYMASK (Linke Command)
    // 0x10 = NX_DEVICERCMDKEYMASK (Rechte Command)
    
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
```

**Wichtige Details:**
- Verwendet `NX_DEVICELCMDKEYMASK` und `NX_DEVICERCMDKEYMASK` für gerätespezifische Erkennung
- `wasTriggered` verhindert mehrfaches Auslösen während beide Tasten gedrückt sind
- Ausgabe erfolgt über `stdout`, damit der Electron-Prozess es lesen kann

### 2.4 Integration in Electron

**Datei:** `main.js` (Zeilen 164-189)

Der Electron Main Process startet den Key Listener als Child-Prozess:

```javascript
app.whenReady().then(() => {
    // Starte Key Listener
    const { spawn } = require('child_process');
    const keyListener = spawn(path.join(__dirname, 'key_listener'));
    
    // Lausche auf stdout
    keyListener.stdout.on('data', (data) => {
        const message = data.toString().trim();
        
        if (message.includes('TOGGLE_SCREENSHOT')) {
            const wins = BrowserWindow.getAllWindows();
            if (wins.length > 0) {
                wins[0].focus(); // Stelle sicher, dass Fenster Fokus hat
                wins[0].webContents.send('toggle-screenshot');
            }
        }
    });
    
    // Bereinige beim Beenden
    app.on('will-quit', () => {
        keyListener.kill();
    });
});
```

### 2.5 Renderer-Prozess Handler

**Datei:** `renderer.js` (Zeilen 838-845)

Der Renderer-Prozess empfängt die IPC-Nachricht:

```javascript
ipcRenderer.on('toggle-screenshot', () => {
    if (isScreenshotMode) {
        endScreenshotMode();
    } else {
        startScreenshotMode();
    }
});
```

### 2.6 Text-Selection Listener

**Datei:** `main.js` (Zeilen 168-216)

Ein zusätzlicher Swift-Prozess (`selection_listener`) überwacht Text-Selektionen:

```javascript
const selectionListener = spawn(path.join(__dirname, 'selection_listener'));

selectionListener.stdout.on('data', (data) => {
    const message = data.toString().trim();
    const wins = BrowserWindow.getAllWindows();
    
    if (wins.length > 0) {
        if (message.includes('TEXT_SELECTED')) {
            wins[0].webContents.send('toggle-selection-icon', true);
        } else if (message.includes('TEXT_CLEARED')) {
            wins[0].webContents.send('toggle-selection-icon', false);
        }
    }
});
```

**Datei:** `renderer.js` (Zeilen 847-860)

Der Renderer zeigt eine visuelle "Pill" an, wenn Text selektiert ist:

```javascript
ipcRenderer.on('toggle-selection-icon', (event, isSelected) => {
    const textSelectionPill = document.getElementById('text-selection-pill');
    if (!textSelectionPill) return;
    
    if (isSelected) {
        textSelectionPill.style.opacity = '1';
        textSelectionPill.style.transform = 'translateX(0) scale(1)';
    } else {
        textSelectionPill.style.opacity = '0';
        textSelectionPill.style.transform = 'translateX(20px) scale(0.9)';
    }
});
```

### 2.7 Escape-Key Handling

**Datei:** `renderer.js` (Zeilen 832-836, 186-190)

Der Escape-Key wird direkt im Renderer-Prozess abgefangen:

```javascript
// Beende Screenshot-Modus bei Escape
window.addEventListener('keydown', (e) => {
    if (isScreenshotMode && e.key === 'Escape') {
        endScreenshotMode();
    }
});

// Schließe Modal bei Escape
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isModalOpen) {
        hideScreenshotModal();
    }
});
```

---

## 3. Overlay-System mit Hintergrund-Screenshot

### 3.1 Architektur-Übersicht

Das Overlay-System besteht aus:
- **Vollbild-Overlay** mit transparentem Hintergrund
- **Hintergrund-Bild** (Vollbild-Screenshot) mit Blur-Effekt
- **Glass-Panel UI** mit Backdrop-Filter
- **Click-Through Mechanismus** für nicht-interaktive Bereiche

### 3.2 Window-Konfiguration

**Datei:** `main.js` (Zeilen 20-36)

Das Electron-Fenster wird als transparentes, immer-im-Vordergrund-Fenster konfiguriert:

```javascript
mainWindow = new BrowserWindow({
    width: width,  // Vollbild
    height: height,
    x: 0,
    y: 0,
    transparent: true,        // Transparenter Hintergrund
    frame: false,             // Kein Fenster-Rahmen
    alwaysOnTop: true,        // Immer im Vordergrund
    fullscreen: false,
    enableLargerThanScreen: true,
    hasShadow: false,
    webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
    }
});
```

**Wichtig:** `transparent: true` ermöglicht den transparenten Hintergrund, der für das Overlay-System essentiell ist.

### 3.3 Click-Through Mechanismus

**Datei:** `main.js` (Zeilen 59-71)

Das Fenster kann zwischen "Click-Through" und "Interaktiv" umschalten:

```javascript
// Initial: Ignoriere Maus-Events (Click-Through)
mainWindow.setIgnoreMouseEvents(true, { forward: true });

// IPC Handler zum Umschalten
ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win.setIgnoreMouseEvents(ignore, options);
});
```

**Datei:** `renderer.js` (Zeilen 762-829)

Der Renderer-Prozess überwacht die Mausposition und aktiviert Interaktivität nur über UI-Elementen:

```javascript
function isMouseOverUI(x, y) {
    if (isScreenshotMode || isModalOpen) return true;
    
    const el = document.elementFromPoint(x, y);
    if (!el) return false;
    
    // Prüfe ob Element interaktiv ist
    if (el.closest('button') ||
        el.closest('input') ||
        el.closest('.glass-panel') ||
        el.closest('.action-bar') ||
        el.closest('#chatbot') ||
        el.closest('#dev-menu') ||
        el.closest('#orb-wrapper')) {
        return true;
    }
    
    return false;
}

window.addEventListener('mousemove', (e) => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    
    if (isScreenshotMode) return;
    
    const overUI = isMouseOverUI(e.clientX, e.clientY);
    
    if (overUI) {
        setIgnoreMouseEvents(false);  // Aktiv
    } else {
        setIgnoreMouseEvents(true, true);  // Click-Through
    }
});
```

### 3.4 Hintergrund-Bild mit Blur

**Datei:** `renderer.js` (Zeilen 1246-1326)

Das Modal zeigt den Screenshot mit einem verschwommenen Hintergrund:

```javascript
function showScreenshotModal(dataURL, bgDataURL) {
    // Setze Screenshot als Hauptbild
    resultImg.src = dataURL;
    currentScreenshotData = dataURL;
    
    // Setze Hintergrund-Bild
    if (bgDataURL && modalBgImage) {
        modalBgImage.src = bgDataURL;
        
        // Wende Blur und Brightness-Filter an
        modalBgImage.style.filter = `blur(${currentBlurRadius}px) brightness(0.9)`;
        modalBgImage.style.webkitFilter = `blur(${currentBlurRadius}px) brightness(0.9)`;
        
        // Fade-in Animation
        modalBgImage.style.opacity = '0';
        modalBgImage.style.display = 'block';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                modalBgImage.style.opacity = '1';
            });
        });
    }
    
    screenshotModal.style.display = 'flex';
    isModalOpen = true;
    setIgnoreMouseEvents(false);
}
```

**HTML-Struktur:** `index.html` (Zeilen 973-986)

```html
<div id="screenshot-result-modal">
    <!-- Hintergrund-Bild (Vollbild-Screenshot mit Blur) -->
    <img id="modal-bg-image" src="" alt="">
    
    <!-- Zentrale Anchor für Layout -->
    <div id="modal-anchor">
        <!-- UI-Panels hier -->
    </div>
</div>
```

**CSS:** `index.html` (Zeilen 356-372, 973-986)

```css
#screenshot-result-modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: var(--bg-overlay);  /* Semi-transparent */
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    z-index: 3000;
    pointer-events: auto;
}

#modal-bg-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: -1;  /* Hinter allen UI-Elementen */
    opacity: 0;
    transition: opacity 0.4s ease-out;
}
```

### 3.5 Glass-Panel UI

**CSS:** `index.html` (Zeilen 390-417)

Die UI-Panels nutzen Backdrop-Filter für den Glass-Effekt:

```css
.glass-panel {
    width: 320px;
    height: 70vh;
    background-color: var(--bg-panel);  /* Semi-transparent */
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--border-light);
    color: var(--text-primary);
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

**Wichtig:** `backdrop-filter: blur()` erzeugt den Glassmorphism-Effekt, der den verschwommenen Hintergrund durchscheinen lässt.

### 3.6 Blur-Kontrolle

**Datei:** `renderer.js` (Zeilen 288-316)

Der Blur-Radius kann dynamisch angepasst werden:

```javascript
let currentBlurRadius = 8;
let currentBrightness = 0.9;

const updateBackgroundFilter = () => {
    if (modalBgImage) {
        modalBgImage.style.filter = `blur(${currentBlurRadius}px) brightness(${currentBrightness})`;
        modalBgImage.style.webkitFilter = `blur(${currentBlurRadius}px) brightness(${currentBrightness})`;
    }
};

blurSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    blurVal.innerText = val + 'px';
    currentBlurRadius = val;
    updateBackgroundFilter();
});
```

### 3.7 Layout-Struktur

**HTML:** `index.html` (Zeilen 1482-1656)

Das Modal verwendet ein flexibles Layout mit drei Hauptbereichen:

```
┌─────────────────────────────────────────┐
│  #screenshot-result-modal (Vollbild)   │
│  ┌───────────────────────────────────┐  │
│  │ #modal-bg-image (Hintergrund)     │  │
│  │ ┌───────────────────────────────┐ │  │
│  │ │ #modal-anchor (Zentrierung)   │ │  │
│  │ │ ┌──────┐  ┌──────┐  ┌──────┐ │ │  │
│  │ │ │Left  │  │Center│  │Right │ │ │  │
│  │ │ │Panel │  │Column│  │Panel │ │ │  │
│  │ │ └──────┘  └──────┘  └──────┘ │ │  │
│  │ └───────────────────────────────┘ │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**CSS:** `index.html` (Zeilen 374-388, 516-528)

```css
#modal-anchor {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    justify-content: center;
    max-width: 95%;
    max-height: 100vh;
    height: 100vh;
}

#center-column {
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100vh;
    overflow: hidden;
    width: 100%;
    position: relative;
}
```

### 3.8 Fade-In Animation

**Datei:** `renderer.js` (Zeilen 1319-1326)

Das Hintergrund-Bild wird mit einer sanften Fade-In Animation eingeblendet:

```javascript
modalBgImage.style.opacity = '0';
modalBgImage.style.display = 'block';

// Doppeltes requestAnimationFrame für sanfte Animation
requestAnimationFrame(() => {
    requestAnimationFrame(() => {
        modalBgImage.style.opacity = '1';
    });
});
```

**CSS:** `index.html` (Zeilen 982-984)

```css
#modal-bg-image {
    opacity: 0;
    transition: opacity 0.4s ease-out;
}
```

### 3.9 Performance-Optimierungen

1. **Lazy Loading:** Das Hintergrund-Bild wird nur geladen, wenn ein Screenshot erstellt wurde
2. **Canvas-Optimierung:** Screenshots werden in nativer Auflösung erfasst, aber für die Anzeige skaliert
3. **Backdrop-Filter:** Nutzt Hardware-Beschleunigung für Blur-Effekte
4. **Click-Through:** Reduziert CPU-Last durch selektive Event-Verarbeitung

---

## Zusammenfassung der Datenflüsse

### Screenshot-Flow:
1. Benutzer drückt **⌘⌘** → Swift Key Listener erkennt → Electron IPC → Renderer startet Screenshot-Modus
2. Benutzer wählt Bereich → Drag-Selection oder Fenster-Click
3. `captureScreen()` → Desktop Capturer API → Video Stream → Canvas → Data URL
4. Zwei Screenshots: Ausschnitt + Vollbild
5. Modal wird angezeigt mit Blur-Hintergrund

### Keyboard-Shortcut-Flow:
1. Swift Key Listener überwacht globale Events
2. Doppel-Command erkannt → `stdout` → Electron Main Process
3. IPC-Nachricht an Renderer → `toggle-screenshot` Event
4. Renderer startet/beendet Screenshot-Modus

### Overlay-Flow:
1. Vollbild-Screenshot wird als Hintergrund-Bild gesetzt
2. CSS `filter: blur()` wird angewendet
3. Glass-Panels mit `backdrop-filter` werden darüber gelegt
4. Click-Through wird deaktiviert für interaktive Bereiche
5. Fade-In Animation für sanften Übergang

---

## Technische Details

### Abhängigkeiten:
- **Electron** 33.2.1
- **Swift/Objective-C** für System-Level APIs
- **Core Graphics** für Window Detection
- **NSEvent** für Keyboard Monitoring

### Berechtigungen (macOS):
- **Screen Recording** für Desktop Capturer
- **Accessibility** für Keyboard Monitoring

### Browser-APIs:
- `navigator.mediaDevices.getUserMedia()`
- `HTMLCanvasElement.toDataURL()`
- `CSS backdrop-filter`
- `document.elementFromPoint()`

---

## Fazit

Dieses System kombiniert native macOS-Funktionalität (Swift) mit modernen Web-Technologien (Electron, Canvas API) für eine nahtlose Screenshot- und Overlay-Erfahrung. Die Architektur trennt klar zwischen System-Level-Operationen (Swift) und UI-Logik (JavaScript), was Wartbarkeit und Performance optimiert.

