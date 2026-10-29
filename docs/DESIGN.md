# AutoScan OBD2 — Design & Implementation Plan

A React web app for reading, explaining and clearing diagnostic trouble codes (DTCs)
on 2002+ vehicles (focus: Korean, German, Japanese and Chinese brands, including MG) through a USB
ELM327-compatible OBD2 adapter.

---

## 1. Goals / Non-goals

**Goals**
- Connect to a USB OBD2 adapter (ELM327, OBDLink SX/EX, vLinker FS, any FTDI/CH340 ELM clone) from the browser via the **Web Serial API** (Chrome / Edge desktop).
- Automatic protocol detection, covering every OBD2 protocol a 2002+ car can use:
  - ISO 9141-2 (older Asian/European cars, 2002–2005)
  - ISO 14230-4 KWP2000 (5-baud and fast init; common on Korean/Japanese/German 2002–2008)
  - SAE J1850 PWM / VPW (rare for target brands, but handled by the ELM)
  - ISO 15765-4 CAN 11/29-bit, 250/500 kbps (all cars sold in US from 2008, EU ~2006+)
- Read **stored (Mode 03)**, **pending (Mode 07)** and **permanent (Mode 0A)** DTCs.
- Read MIL (check-engine light) status and DTC count (Mode 01 PID 01).
- Read **freeze frame** (Mode 02) for the code that triggered the MIL.
- **Clear DTCs** (Mode 04) behind a safety confirmation dialog.
- **Explain each code**: title, system section, severity, symptoms, likely causes, suggested fixes. Generic SAE codes plus manufacturer-specific codes for Korean, German, Japanese and Chinese brands.
- Cover **all sections**: P (Powertrain), C (Chassis), B (Body), U (Network).
- **Module scan** on CAN cars: query every ECU that answers on the bus (engine, transmission, ABS, airbag, body…) with UDS `19 02` and clear with UDS `14 FF FF FF`.
- Live data (Mode 01 PIDs) with gauges.
- VIN read (Mode 09 PID 02) plus offline VIN decode to make and model year.
- Offline code lookup (works without an adapter).
- Built-in **Simulator** transport so the full UI works and can be tested without a car.
- Scan history saved locally, exportable as JSON or a printable report.

**Non-goals (v1)**
- Coding, adaptations, key programming or other write operations beyond clearing DTCs.
- Bluetooth adapters. The transport interface leaves room for Web Bluetooth later.
- Mobile browsers (Web Serial is desktop-only). The UI is still responsive.

---

## 2. Tech stack

| Concern | Choice |
|---|---|
| Build | Vite + React 18/19 + TypeScript (strict) |
| Routing | `react-router-dom` (HashRouter, so it works on static hosting) |
| State | React context + `useReducer` (no external state library) |
| Styling | Plain CSS with design tokens (CSS variables) in `src/styles/` |
| Icons | `lucide-react` |
| Tests | Vitest + @testing-library/react + jsdom |
| Lint/typecheck | `tsc --noEmit`, ESLint (vite default config) |

---

## 3. Architecture

```
src/
  obd/
    transport/
      Transport.ts          interface: open(), close(), write(str), onData / readUntilPrompt()
      SerialTransport.ts    Web Serial (navigator.serial), 38400 baud default, configurable 9600/115200/230400/500000
      SimulatorTransport.ts in-memory ELM327 emulator (scripted vehicles & faults)
    elm327.ts               command queue, ">" prompt handling, timeouts, init sequence, response cleanup
    protocols.ts            ATDPN number → protocol name / CAN flag
    parser.ts               hex response → bytes, multi-ECU split, ISO-TP multi-frame reassembly
    dtc.ts                  2-byte DTC decode/encode, Mode 03/07/0A response parsing
    pids.ts                 Mode 01 PID table (formula, unit, min/max) + supported-PID bitmap decode
    freezeFrame.ts          Mode 02 helpers
    vin.ts                  Mode 09 VIN parse + offline VIN decode (WMI table, year char)
    uds.ts                  UDS 19 02 / 14 FF FF FF for module scan (CAN only)
    modules.ts              known ECU addresses per manufacturer group
    service.ts              high-level DiagnosticService: connect(), readAllCodes(), clearCodes(), readLive(), scanModules()
  data/
    dtc/
      generic.ts            SAE J2012 generic codes (P0xxx, P2xxx, P3xxx, C0xxx, B0xxx, U0xxx)
      korean.ts             Hyundai / Kia / Genesis specific
      german.ts             VW / Audi / Skoda / Seat / Porsche / BMW / Mini / Mercedes / Opel
      japanese.ts           Toyota / Lexus / Honda / Acura / Nissan / Infiniti / Mazda / Subaru / Mitsubishi / Suzuki
      chinese.ts            MG / Chery / Geely / BYD / Great Wall-Haval / Changan / JAC (brand notes on SAE codes)
      index.ts              lookup(code, make?) → DtcInfo | fallback built from code structure
    makes.ts                makes grouped by region, with WMI prefixes
  state/
    DiagnosticContext.tsx   connection state, vehicle, codes, live data, log
    history.ts              localStorage persistence (try/catch-wrapped)
  components/              Button, Card, Badge, Gauge, SeverityPill, ConfirmDialog, ConsoleLog, EmptyState, Spinner
  pages/
    ConnectPage.tsx         pick transport (USB / Simulator), baud, vehicle make/year, connect progress steps
    DashboardPage.tsx       vehicle card, MIL, code counts by type, quick actions, 4 headline gauges
    CodesPage.tsx           stored / pending / permanent tabs, code cards with explanations, freeze frame, Clear button
    CodeDetail (drawer)     full explanation for one code
    ModulesPage.tsx         module scan results per ECU (CAN only; explains limits on K-line cars)
    LiveDataPage.tsx        selectable PIDs, gauges and sparklines, polling rate
    LookupPage.tsx          offline search by code or keyword, filter by section and brand
    HistoryPage.tsx         saved scans, export JSON, print report
    SettingsPage.tsx        baud rate, timeouts, units (metric/imperial), raw console toggle
  App.tsx, main.tsx
tests/ (or colocated *.test.ts)
```

### 3.1 Transport interface

```ts
interface Transport {
  readonly kind: 'serial' | 'simulator';
  open(): Promise<void>;
  close(): Promise<void>;
  write(data: string): Promise<void>;          // raw ASCII, caller appends "\r"
  onData(cb: (chunk: string) => void): () => void;
  readonly isOpen: boolean;
}
```

### 3.2 ELM327 driver (`elm327.ts`)
- Serial command queue: only one command in flight at a time.
- `send(cmd, timeoutMs)` writes `cmd + "\r"` and buffers input until the `>` prompt arrives. It then strips echo, `SEARCHING...`, `BUS INIT: ...OK`, blank lines and spaces.
- Error tokens are mapped to typed errors: `NO DATA`, `UNABLE TO CONNECT`, `CAN ERROR`, `BUS ERROR`, `BUS INIT: ...ERROR`, `?`, `STOPPED`, `BUFFER FULL`, `FB ERROR`, `DATA ERROR`, `<RX ERROR`.
- Init sequence: `ATZ` (wait ~1.5 s) → `ATE0` → `ATL0` → `ATS1` → `ATH1` → `ATAT1` → `ATSP0` → `0100` (forces protocol search, 10 s timeout on K-line) → `ATDPN` → `ATRV` (battery voltage) → `ATI` (adapter version).
- Headers stay on (`ATH1`) so the app can tell which ECU answered (7E8, 7E9…, or the K-line source byte).

### 3.3 Response parsing (`parser.ts`)
Must handle all these formats, each covered by unit tests:
- CAN 11-bit single frame with headers: `7E8 06 43 02 01 33 01 71`
- CAN multi-frame (ISO-TP), e.g. Mode 09 VIN or more than 3 DTCs: `7E8 10 14 49 02 01 31 47 31`, `7E8 21 ...`, `7E8 22 ...`
- CAN 29-bit headers: `18 DA F1 10 ...`
- Multiple ECUs answering (7E8 and 7E9 lines interleaved).
- K-line / J1850 with headers: `48 6B 10 43 01 33 00 00 00 00 C4` (3 header bytes + checksum)
- Responses without headers (fallback when `ATH0` is used).
- Output: `EcuResponse[] = { ecu: string, data: number[] }` with the service byte included.

### 3.4 DTC decoding (`dtc.ts`)
- 2 bytes → code: bits 15-14 give the letter (P/C/B/U), bits 13-12 the first digit, then 3 hex nibbles.
- Mode 03/07/0A on CAN: `43 <count> <dtc pairs…>`. On non-CAN: `43 <pairs…>` with no count byte, padded with `00 00`.
- Skip `0000` padding. De-duplicate across frames, but keep the ECU source for each code.
- Mode 01 PID 01: MIL bit (A7) and DTC count (A0-6).

### 3.5 Module scan (`uds.ts`, `modules.ts`)
- Only on CAN protocols (ATDPN 6–9). On K-line cars the UI explains that this needs a manufacturer tool and shows only the engine-ECU data reachable through OBD2.
- For each candidate address: `ATSH <tx>`, `ATCRA <rx>`, send `19 02 FF`. A positive response is `59 02 <mask> [DTC(3 bytes) status]…`. UDS DTCs are 3 bytes: the first 2 bytes map to the P/C/B/U code, the 3rd byte is the failure type (shown as `-XX`).
- Candidate addresses:
  - Standard OBD range 7E0–7E7 (all brands).
  - Brand-group extras from `modules.ts`, e.g. Hyundai/Kia ABS 7D1, airbag 7D2, BCM 770; VW group gateway 710, ABS 713, airbag 715; Toyota 7B0 ABS, 780 airbag; and so on. Each entry has `{ name, section, tx, rx }`.
- Negative response `7F 19 xx` or a timeout means "module not responding / not supported". Neither is fatal.
- Clear per module: `14 FF FF FF` (needs confirmation).
- Restore the default header after the scan (`ATSH 7DF`, `ATCRA` reset to auto with `ATAR`).

### 3.6 DTC knowledge base (`data/dtc`)
```ts
type Section = 'Powertrain' | 'Chassis' | 'Body' | 'Network';
type Severity = 'low' | 'medium' | 'high' | 'critical';
interface DtcInfo {
  code: string;            // "P0301"
  title: string;           // "Cylinder 1 Misfire Detected"
  section: Section;
  system: string;          // "Ignition / Misfire", "Fuel & Air Metering", "Emissions", "ABS", ...
  severity: Severity;
  description: string;     // plain-language explanation
  symptoms: string[];
  causes: string[];
  fixes: string[];
  canDrive: string;        // "Drive gently to a workshop" / "Stop driving" …
  makes?: string[];        // set for manufacturer-specific codes
}
```
- Generic set: roughly 300+ of the most common codes. Must include P0010–P0020, P0030–P0060 (O2 heaters), P0068–P0128, P0130–P0167, P0171–P0175, P0191–P0193, P0200–P0206, P0217–P0222, P0230, P0234/P0299, P0300–P0312, P0325–P0345, P0335–P0340, P0351–P0358, P0400–P0456 (EGR/EVAP), P0420/P0430, P0440–P0457, P0480–P0483, P0500–P0507, P0560–P0563, P0600–P0606, P0700–P0780 (transmission), P2096–P2099, P2187/P2189, P2195–P2198, P242F/P2463 (DPF), plus common C0xxx, B0xxx and U0xxx (U0001, U0100, U0101, U0121, U0140, U0151, U0155…).
- Manufacturer-specific sets: about 30–60 well-known codes per group (e.g. Hyundai P1326 knock-sensing engine protection, VW P2015 intake manifold flap, BMW 2A82 VANOS, Toyota P1349 VVT, Honda P1456 EVAP, Nissan P1610 NATS, Subaru P0420 behaviour notes, Mazda P0456…).
- **Fallback**: an unknown code still gets a meaningful generic explanation built from its structure: section from the letter, generic vs. manufacturer from the 2nd character, and subsystem from the 3rd digit (P0**1**xx fuel/air, P0**3**xx ignition, P0**4**xx emissions, P0**7**xx transmission, …).
- Lookup order: manufacturer-specific for the selected make, then generic, then fallback.

### 3.7 Live data PIDs (`pids.ts`)
At minimum: 04 load, 05 coolant temp, 06–09 fuel trims, 0B MAP, 0C RPM, 0D speed, 0E timing advance, 0F IAT, 10 MAF, 11 throttle, 1F run time, 21 distance with MIL on, 2F fuel level, 31 distance since clear, 33 baro, 42 module voltage, 46 ambient temp, 5C oil temp. The app decodes the supported-PID bitmaps (0100/0120/0140/0160) and only offers PIDs the car supports.

### 3.8 VIN decoding (`vin.ts`)
- WMI table for target brands: KMH (Hyundai), KNA/KND/KNM (Kia), KMT (Genesis), WVW/WVG/3VW (VW), WAU/WA1 (Audi), WBA/WBS/WBX/5UX (BMW), WDB/WDD/WDC/W1K/W1N (Mercedes), WP0/WP1 (Porsche), TMB (Skoda), VSS (Seat), W0L (Opel), JT/4T/5T (Toyota), JTH (Lexus), JHM/1HG/2HG/SHH (Honda), 19U/JH4 (Acura), JN/1N/3N (Nissan), JNK (Infiniti), JM1/JM3 (Mazda), JF1/JF2/4S3/4S4 (Subaru), JA3/JA4/ML3 (Mitsubishi), JS (Suzuki).
- Model year from the 10th character (Y=2000, 1–9 = 2001–2009, A–Y = 2010–2030, skipping I/O/Q/U/Z, with the 30-year cycle resolved toward ≥2002).
- Validate the check digit (9th character) and show a warning on mismatch, since EU cars often don't use it.

---

## 4. UX / Visual design

**Look**: a dark "instrument cluster" theme by default, with a light theme toggle.
- Background `#0b0f14`, surface `#121821`, raised `#1a2230`, border `#253043`
- Text `#e6edf3`, muted `#8b98a9`
- Accent (brand) `#22d3ee` (cyan), accent-2 `#3b82f6`
- Severity: low `#22c55e`, medium `#eab308`, high `#f97316`, critical `#ef4444`
- MIL indicator: amber `#f59e0b` with glow when on
- Font: Inter / system-ui; monospace (JetBrains Mono / ui-monospace) for codes and the console.
- Radius 12px on cards, 8px on controls; 8px spacing grid.

**Layout**
- Left sidebar (collapses into a bottom tab bar under 768px): Dashboard, Trouble Codes, Modules, Live Data, Code Lookup, History, Settings.
- Top bar: connection pill (Disconnected / Connecting… / Connected · protocol · 12.4 V), vehicle name, Connect/Disconnect button.
- The Connect screen is a 3-step stepper: **1. Adapter** (USB / Simulator, with a browser-support check) → **2. Vehicle** (region tabs Korean / German / Japanese / Chinese, then make and year 2002–current, or "Auto-detect from VIN") → **3. Connect** (live checklist: open port ✓, reset adapter ✓, detect protocol ✓, read VIN ✓).
- Code cards: big monospace code, title, section badge, severity pill, ECU source, and an expandable "Why / Symptoms / Causes / Fixes / Can I drive?" area.
- Clear-codes dialog: lists the preconditions (ignition ON, engine OFF, the fault is repaired, the readiness monitors will reset and the car may fail inspection until a drive cycle completes). The user must tick a checkbox before the red "Clear codes" button becomes active.
- A raw ELM console panel (toggle in Settings) for advanced users.
- Accessibility: every control is keyboard reachable, has visible focus rings and aria labels, and severity is never shown by colour alone (each pill also carries an icon and text).

---

## 5. Simulator
`SimulatorTransport` emulates an ELM327 (v1.5 banner, AT command replies, `>` prompt, ~20–60 ms latency):
- Preset vehicles: `2015 Hyundai Elantra (CAN 11-bit)`, `2006 Kia Sorento (ISO 14230 KWP)`, `2012 VW Golf (CAN)`, `2004 Toyota Corolla (ISO 9141-2)`, `2018 BMW 320i (CAN)`, `2010 Honda Civic (CAN)`.
- Each preset has a VIN, stored, pending and permanent DTCs, freeze-frame data, extra modules (CAN cars) with their own DTCs, and live-data generators (RPM idle with noise, warming coolant…).
- Responses use the correct framing for the preset's protocol (headers, multi-frame for VIN, K-line headers with checksum), so the parser is exercised for real.
- Mode 04 / UDS 14 actually clears the simulated codes.

---

## 6. Test plan
Unit (Vitest):
1. `dtc.test.ts`: decode `0133`→P0133, `C1 23`→U0123, `81 00`→B0100, `41 00`→C0100, `00 00`→skip; Mode 03 CAN with count byte; K-line padding; multi-ECU.
2. `parser.test.ts`: CAN single frame, ISO-TP VIN multi-frame (3 frames → 17 chars), 29-bit headers, K-line headers + checksum, no-header mode, noise lines (`SEARCHING...`, `BUS INIT: ...OK`).
3. `pids.test.ts`: RPM `41 0C 1A F8` → 1726 rpm, coolant `41 05 7B` → 83 °C, supported bitmap decode.
4. `vin.test.ts`: decode make/year for one VIN per region, check digit validation.
5. `dtcdb.test.ts`: lookup prefers the make-specific entry, falls back to generic, unknown codes get a fallback with the correct section, every DB entry has non-empty causes and fixes, and there are no duplicate codes within a file.
6. `elm327.test.ts` with SimulatorTransport: init sequence detects the protocol, readAllCodes returns the preset codes, clearCodes empties them, an error token maps to a typed error.
7. `uds.test.ts`: parse `59 02 FF ...` 3-byte DTCs with status, `7F 19 11` negative response.
8. Component tests: CodesPage renders codes from context; the Clear dialog needs the checkbox before confirming.

End-to-end (Playwright, run by the reviewer): connect with the Simulator, read codes, open a detail view, clear codes, check the dashboard shows 0, run a module scan, check live data updates, look up a code.

Commands: `npm run dev`, `npm run build`, `npm test`, `npm run typecheck`, `npm run lint`.

---

## 7. Safety & limits (shown in the app's About/Help)
- Clearing codes does not fix the fault. The code returns if the problem persists.
- Clearing resets readiness monitors and freeze-frame data.
- Use only with the ignition ON and the engine OFF for Clear; never operate the app while driving.
- Reading ABS/airbag/body modules is possible only on CAN cars and only for modules that answer standard UDS. Older K-line cars need manufacturer tools for those modules.
