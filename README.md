# AutoScan OBD2

A React + TypeScript web app that reads, explains and clears car trouble codes (DTCs) through a **USB ELM327 adapter**, straight from the browser using the **Web Serial API**. Built for **2002+ Korean, German, Japanese and Chinese cars (including MG)**, covering all code sections (**P** powertrain, **C** chassis, **B** body, **U** network). A built-in **Simulator** lets you try everything without a car or an adapter.

## Features

- **Automatic protocol detection** - ISO 9141-2, ISO 14230-4 KWP2000 (5-baud and fast init), SAE J1850 PWM/VPW and ISO 15765-4 CAN (11/29 bit, 250/500 kbaud).
- **Read codes** - stored (Mode 03), pending (Mode 07) and permanent (Mode 0A) codes, MIL status and DTC count (Mode 01 PID 01), and **freeze frame** data (Mode 02).
- **Plain-language explanations** - title, system, severity (always shown with icon and text), symptoms, likely causes, suggested fixes and a "can I drive?" answer.
- **Clear codes** (Mode 04) behind a confirmation dialog with preconditions and a mandatory checkbox.
- **Module scan on CAN cars** - queries every ECU that answers UDS `19 02` (engine, transmission, ABS, airbag, body, gateway...) and can clear a module with UDS `14 FF FF FF`.
- **Live data** - gauges and sparklines for the PIDs your car supports (rpm, speed, coolant, load, fuel trims, MAF, throttle, voltage, temperatures...). Metric or imperial units.
- **VIN read and offline VIN decode** to make and model year (with check-digit validation).
- **Offline code lookup** - search by code or keyword, filter by system and brand. Unknown codes still get a meaningful explanation built from the code structure.
- **History** - every scan is saved in your browser only; export JSON or print a report.
- **Simulator** with seven preset vehicles and protocol-correct framing (CAN ISO-TP multi-frame, K-line headers with checksums), so the real parser is exercised.
- Dark "instrument cluster" theme plus a light theme, responsive layout (sidebar on desktop, bottom tab bar under 768 px), keyboard accessible, optional raw ELM327 console for advanced users.

## Offline code database

| Set | Entries | Notes |
|---|---|---|
| Generic (SAE J2012 style) | 567 | P0xxx, P2xxx, P3xxx, C0xxx, B0xxx, U0xxx including O2 sensors, misfire, VVT, fuel, EVAP, EGR, catalyst, transmission, DPF/SCR, hybrid, network |
| Korean (Hyundai, Kia, Genesis) | 38 | Manufacturer codes plus brand-specific guidance on standard codes |
| German (VW group, BMW/Mini, Mercedes-Benz, Opel) | 43 | VAG P1xxx codes, BMW DME codes, brand notes |
| Japanese (Toyota/Lexus, Honda/Acura, Nissan/Infiniti, Mazda, Subaru, Mitsubishi, Suzuki) | 61 | Manufacturer-defined P1xxx codes plus brand notes |
| Chinese (MG, Chery, Geely, BYD, Great Wall / Haval, Changan, JAC) | 38 | Brand guidance on standard codes, grouped by engine family (turbo petrol, diesel, hybrid). Chinese manufacturer-defined codes are not included because they are not reliably documented outside dealer tools |

Manufacturer-specific meanings differ by brand, model and year. Treat them as guidance and confirm against the service information for your exact vehicle.

## Supported hardware, protocols and brands

- **Adapters**: any USB ELM327-compatible adapter - OBDLink SX/EX, vLinker FS, genuine ELM327, and FTDI / CH340 based clones. Bluetooth and Wi-Fi adapters are not supported (the transport interface leaves room for Web Bluetooth later).
- **Protocols**: ISO 9141-2, ISO 14230-4 (KWP 5-baud/fast), SAE J1850 PWM/VPW, ISO 15765-4 CAN 11/29-bit at 250/500 kbaud.
- **Brands**: Hyundai, Kia, Genesis; Volkswagen, Audi, Skoda, Seat, Porsche, BMW, Mini, Mercedes-Benz, Opel; Toyota, Lexus, Honda, Acura, Nissan, Infiniti, Mazda, Subaru, Mitsubishi, Suzuki; MG (SAIC and 2002–2005 MG Rover), Chery, Geely, BYD, Great Wall / Haval, Changan, JAC. Other makes work for generic OBD2 codes.
- **Browsers**: Chrome or Edge on desktop (Web Serial). Firefox and Safari have no Web Serial support - the Simulator and Code Lookup still work there.

## Run it

```bash
npm install
npm run dev        # development server
npm run build      # type-check and production build into dist/
npm run preview    # serve the production build
npm test           # unit and component tests (Vitest)
npm run typecheck  # TypeScript
npm run lint       # ESLint
```

The build uses relative asset paths (`base: './'`) and a hash router, so `dist/` can be hosted on any static host (GitHub Pages, S3, Netlify...). Web Serial requires a secure context (HTTPS or `http://localhost`); opening `index.html` from `file://` will not work.

## Connecting the USB adapter

1. **Drivers.** Most adapters work out of the box on Linux, macOS and recent Windows. Cheap clones with a **CH340/CH341** chip need the WCH driver on older Windows/macOS; **FTDI** based adapters need the FTDI VCP driver on older systems. If the adapter does not show up as a serial port, install the matching driver and re-plug it.
2. **Plug in.** Insert the adapter into the OBD2 port (usually under the dashboard, driver side) and switch the **ignition ON** (engine off is fine for reading and clearing).
3. **Open the app in Chrome or Edge** (desktop) over `https://` or `http://localhost`.
4. Go to **Connect**, choose *USB ELM327 adapter*, keep the baud rate at **38400** (the default for most ELM327 adapters; try 115200 for OBDLink/vLinker or 500000 for some), choose the vehicle's region/make/year (or tick auto-detect from VIN) and press **Connect**. The browser asks you to pick the serial port.
5. The checklist shows: open port, reset adapter, detect protocol, read VIN. Protocol search on K-line cars can take up to ~10 seconds.

If it fails: check the ignition is ON, re-seat the adapter, try another baud rate, and make sure no other program (a phone app, serial monitor) is holding the port.

## Using the simulator

On the Connect page press **Try the simulator** (or pick *Simulator* in step 1 and choose a vehicle): 2015 Hyundai Elantra (CAN), 2006 Kia Sorento (KWP), 2012 VW Golf (CAN, two OBD ECUs), 2004 Toyota Corolla (ISO 9141-2), 2018 BMW 320i (CAN) and 2010 Honda Civic (CAN). Clearing codes really clears the simulated codes. In the simulator, permanent codes are cleared as well, as if the repair and drive cycle had been completed.

## Safety notes

- Clearing codes does **not** fix the fault; the code returns if the problem persists.
- Clearing resets the readiness monitors and erases freeze-frame data. The car may fail an emissions inspection until a full drive cycle completes.
- Clear codes only with the **ignition ON and the engine OFF**. **Never operate the app while driving.**
- Module reading (ABS, airbag, body) works only on CAN cars and only for modules that answer standard UDS. Older K-line cars need manufacturer tools for those modules.
- Do not probe airbag (SRS) circuits yourself; use a qualified technician.
- This app only reads and clears codes. It does not code, adapt or program modules.
- Not affiliated with or endorsed by any vehicle manufacturer. Use at your own risk.

## Project layout

```
src/obd/          transport (Web Serial + Simulator), ELM327 driver, parser, DTC/PID/VIN/UDS logic, service
src/data/         makes + WMI table, DTC knowledge base (generic, korean, german, japanese)
src/state/        React context (connection, codes, live data, console log), history/settings storage
src/components/   UI building blocks (gauges, code cards, dialogs, console, layout)
src/pages/        Connect, Dashboard, Codes, Modules, Live data, Lookup, History, Settings
docs/DESIGN.md    design and implementation plan
```

## License

No license has been chosen yet.
