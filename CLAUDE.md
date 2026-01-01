# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript-based automated server renewal system for KataBump dashboard (https://dashboard.katabump.com). It uses Puppeteer to automate the login and server renewal process, including handling Cloudflare Turnstile CAPTCHA challenges.

The system is specifically designed to:
- Automatically log into KataBump dashboard
- Navigate to specific server detail pages
- Handle Cloudflare Turnstile verification using coordinate-based clicking
- Execute server renewal operations
- Support batch processing of multiple servers

## Key Commands

### Development
```bash
# Install dependencies
pnpm install

# Build TypeScript
pnpm run build

# Run in development mode
pnpm run dev

# Run tests
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # Generate coverage report
pnpm test:ui           # Run Vitest UI

# Run production build
pnpm start             # Run from dist/
pnpm start:config      # Run with config.json

# Run test scripts
npx ts-node scripts/test-full-renewal.ts
npx ts-node scripts/test-fingerprint-detection.ts  # Test browser fingerprint anti-detection
```

### Cleanup
```bash
pnpm run clean         # Remove dist/ directory
```

## Architecture

### Core Components

**RenewalTask** (`src/index.ts`)
- Main orchestrator that coordinates the entire renewal workflow
- Manages browser lifecycle and executes renewal operations
- Supports both single-server and batch renewal modes
- Entry point for programmatic API usage

**BrowserController** (`src/browser/controller.ts`)
- Manages Puppeteer browser instance lifecycle using `puppeteer-extra` with stealth plugin
- Implements comprehensive browser fingerprint anti-detection measures
- Configures DNS over HTTPS (DoH) using Chrome fieldtrial parameters
- Handles page navigation and Cloudflare verification detection
- Supports persistent user data directory for caching (`userDataDir`)

**LoginProcessor** (`src/tasks/login.ts`)
- Automates the login process for KataBump dashboard
- Detects if user is already logged in (when using `userDataDir`)
- Fills login form and optionally clicks "Remember me" checkbox
- Handles login result verification

**ServerLocator** (`src/tasks/locator.ts`)
- Locates servers within the dashboard interface
- Supports direct URL navigation to server detail pages
- Alternative fallback: navigate by clicking through the UI

**RenewalExecutor** (`src/tasks/renewal.ts`)
- Executes the actual server renewal operation
- Handles the renewal modal and Cloudflare Turnstile CAPTCHA
- Uses coordinate-based clicking to bypass shadow-root(closed)
- Implements random mouse movement to simulate human behavior
- Validates CAPTCHA completion by checking token length (>500 chars)

### Important Implementation Details

#### Cloudflare Turnstile Handling

The system uses a sophisticated approach to handle Cloudflare Turnstile:

1. **Detection**: Checks for `input[name="cf-turnstile-response"]` element
2. **Coordinate-based clicking**: Uses `page.mouse.click(x, y)` to bypass shadow-root(closed)
3. **Human behavior simulation**: Performs 3-5 random mouse movements before clicking
4. **Token validation**: Checks if token value length > 500 characters (successful tokens are very long, failed tokens start with "0.")

The clicking strategy:
- Locates "Captcha" label element
- Calculates click position: `label.x + 200px, label.y + (label.height / 2)`
- Uses Puppeteer's mouse API which can penetrate Shadow DOM

#### Login State Detection

When `userDataDir` is configured, the system detects if already logged in by:
- Checking URL for `/dashboard` or `/servers`
- Searching page content for "Dashboard", "Servers", or "服务器"
- Skipping login form if already authenticated

#### Browser Configuration

Key browser settings:
- **DoH**: Uses https://doh.pub/dns-query by default
- **Viewport**: 1920x1080 (configurable)
- **User Data Directory**: Enables session persistence and caching
- **Executable Path**: Can specify custom Chrome installation path

### Configuration Structure

Located in `config.json` (see `config.example.json` for template):

```typescript
interface RenewalConfig {
  targetUrl: string;              // Dashboard URL
  credentials: {
    username: string;
    password: string;
  };
  servers: Array<{
    id: string;
    name?: string;
  }>;
  browser: {
    headless?: boolean;
    executablePath?: string;
    userDataDir?: string;         // For persistence and caching
    dohUrl?: string;              // DNS over HTTPS URL
    timeout?: number;
    waitUntil?: string;
    windowWidth?: number;
    windowHeight?: number;
  };
  retry: {
    maxRetries: number;
    retryInterval: number;
    retryOnTimeout: boolean;
  };
  notifications: {
    enableEmail: boolean;
    enableWebhook: boolean;
    enableStdout: boolean;
  };
}
```

### Error Handling

The system defines specific error types in `src/types/index.ts`:
- `CONFIG_ERROR`: Missing or invalid configuration
- `NETWORK_ERROR`: Network connectivity issues
- `BROWSER_ERROR`: Browser launch or page load failures
- `PARSE_ERROR`: Page structure changes, element not found
- `VERIFY_ERROR`: Login or CAPTCHA verification failures
- `BUSINESS_ERROR`: Server not found, renewal failed

All errors extend `RenewalError` class with type, message, and optional code.

### Browser Fingerprint Anti-Detection

The system implements comprehensive anti-detection measures to avoid bot detection:

#### 1. Puppeteer-Extra with Stealth Plugin
- Uses `puppeteer-extra` instead of standard `puppeteer`
- Applies `puppeteer-extra-plugin-stealth` to hide common automation indicators
- Community-maintained plugin that addresses numerous bot detection vectors

#### 2. Browser Launch Arguments
Multiple anti-detection flags are set:
```typescript
'--disable-blink-features=AutomationControlled'  // Most important
'--disable-extensions-except=/dev/null'
'--disable-infobars'
'--disable-gpu'
'--disable-accelerated-2d-canvas'
// ... and 20+ more flags
```

#### 3. JavaScript Context Overrides
The following properties are overridden in each page:

- **`navigator.webdriver`**: Set to `false` (most important)
- **`window.chrome`**: Faked to exist with `runtime: {}`
- **`navigator.plugins`**: Returns realistic plugin list (Chrome PDF Plugin, etc.)
- **`navigator.languages`**: Returns `['zh-CN', 'zh', 'en-US', 'en']`
- **`navigator.platform`**: Returns `'Win32'`
- **`navigator.hardwareConcurrency`**: Returns `8`
- **`navigator.deviceMemory`**: Returns `8`
- **`navigator.connection`**: Returns realistic 4G connection info

#### 4. WebGL Fingerprint Masking
```javascript
WebGLRenderingContext.prototype.getParameter = function(parameter) {
  if (parameter === 37445) return 'Intel Inc.';
  if (parameter === 37446) return 'Intel Iris OpenGL Engine';
  return getParameter.call(this, parameter);
};
```

#### 5. Canvas Fingerprint Noise
Adds tiny random noise to canvas rendering to make each fingerprint unique:
```javascript
// Randomly modifies 0.1% of pixels' alpha channel
if (Math.random() < 0.001) {
  imageData.data[i + 3] = imageData.data[i + 3] ^ 1;
}
```

#### 6. Timezone and Locale Configuration
- **Timezone**: Set to `'Asia/Shanghai'` (UTC+8)
- **Accept-Language**: `'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7'`
- **Date.getTimezoneOffset()**: Returns `-480` (UTC+8)
- **Intl.DateTimeFormat().timeZone**: Returns `'Asia/Shanghai'`

#### 7. Screen Properties
```javascript
screen.width = 1920
screen.height = 1080
screen.availWidth = 1920
screen.availHeight = 1040
```

#### Testing Anti-Detection

Run the fingerprint detection test script:
```bash
npx ts-node scripts/test-fingerprint-detection.ts
```

This will:
1. Launch browser with anti-detection measures
2. Visit multiple bot detection websites (sannysoft.com, antoinevastel.com, etc.)
3. Take screenshots of results
4. Display current fingerprint data in a table
5. Save fingerprint data to JSON

Expected results on good detection sites:
- **Sannysoft**: Mostly green (passed), some yellow may appear
- **AHS Headless**: Should show "Non-headless browser detected"
- **navigator.webdriver**: Should be `false`
- **WebGL Vendor**: Should show "Intel Inc." or similar

#### Limitations

The current implementation does NOT address:
1. **TLS/JA3 Fingerprint**: Puppeteer's TLS handshake differs from real Chrome
   - Solution: Use curl-impersonate or commercial proxy services
2. **HTTP/2 Fingerprint**: May differ from real browser
3. **Behavioral Analysis**: Mouse movement patterns, typing speed
   - Mitigation: The system already adds random mouse movements before CAPTCHA clicks

For production use against sophisticated detection, consider:
- Using residential proxies
- Implementing request delay randomization
- Adding more realistic user behavior simulation
- Using curl-impersonate for network-level fingerprint matching

### Testing

- **Framework**: Vitest (not Jest)
- **Location**: `tests/unit/` and `tests/integration/`
- **Test scripts**: Located in `scripts/` directory for manual testing
- **Coverage goal**: 80% line coverage, 70% branch coverage

## Workflow for Single Server Renewal

1. BrowserController launches browser with DoH configuration
2. Navigate to target URL (dashboard)
3. Wait for Cloudflare verification (if present)
4. LoginProcessor checks login state, fills form if needed
5. ServerLocator navigates directly to server detail page using URL: `https://dashboard.katabump.com/servers/edit?id={serverId}`
6. RenewalExecutor opens renewal modal by clicking "Renew" button
7. Handle Cloudflare Turnstile:
   - Wait 20 seconds for page load
   - Perform random mouse movements (3-5 times)
   - Click verification area using coordinates
   - Poll for token completion (up to 60 seconds)
   - Validate token length > 500 chars
8. Click "Renew" button in modal
9. Verify renewal result
10. Close browser

## Important Gotchas

1. **Shadow DOM Access**: The Turnstile iframe is hidden in shadow-root(closed). You cannot access it via DOM queries. Use coordinate-based clicking with `page.mouse.click()`.

2. **CAPTCHA Token Validation**: Successful Turnstile tokens are >500 characters. Failed tokens start with "0." and are much shorter. Always check `value.length > 500`.

3. **Login State**: When `userDataDir` is set, the browser remembers login sessions. Always check if already logged in before attempting to fill login forms.

4. **Direct URL Navigation**: Server detail pages can be accessed directly via `https://dashboard.katabump.com/servers/edit?id={serverId}`. This is more reliable than clicking through the UI.

5. **Mouse Movement Timing**: Random mouse movements use variable steps based on distance. The `steps` parameter in `page.mouse.move()` controls smoothness.

6. **DoH Configuration**: The system uses Chrome fieldtrial parameters to enable DNS over HTTPS, not command-line flags.

## File Structure Notes

- `src/index.ts`: Main entry point, exports `RenewalTask` class
- `src/config/`: Configuration schema and loader
- `src/browser/`: Browser control and page operations
- `src/tasks/`: Business logic (login, locate, renew)
- `src/utils/logger.ts`: Centralized logging with timestamps and levels
- `src/types/index.ts`: All TypeScript type definitions
- `scripts/`: Manual test scripts for development
- `tests/`: Unit and integration tests
- `screenshots/`: Debug screenshots saved during development
