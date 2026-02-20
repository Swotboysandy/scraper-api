"""
Cookie Capture - NetMirror (net22.cc)
Run: python capture_cookies.py
"""
import subprocess, sys, os, time, json

try:
    import requests
    import websocket
except ImportError:
    print("Run: pip install websocket-client requests")
    sys.exit(1)

DEBUG_PORT = 9222

def find_chrome():
    for p in [
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
    ]:
        if os.path.exists(p):
            return p
    return None

def kill_chrome():
    """Kill Chrome - handle all error cases"""
    try:
        subprocess.run(
            ["taskkill", "/F", "/IM", "chrome.exe"],
            capture_output=True, timeout=5
        )
    except Exception:
        pass  # Chrome might not be running, that's fine
    
    # Also try via PowerShell as backup
    try:
        subprocess.run(
            ["powershell", "-Command", "Stop-Process -Name chrome -Force -ErrorAction SilentlyContinue"],
            capture_output=True, timeout=5
        )
    except Exception:
        pass
    
    time.sleep(2)

def main():
    print("\n=== Cookie Capture Tool ===\n")
    
    chrome = find_chrome()
    if not chrome:
        print("[X] Chrome not found")
        return
    print(f"Chrome: {chrome}")
    
    # Kill Chrome (silently, don't care if it fails)
    print("Closing Chrome...")
    kill_chrome()
    
    # Launch Chrome with debug port
    print(f"Launching Chrome...")
    try:
        subprocess.Popen(
            [chrome, f"--remote-debugging-port={DEBUG_PORT}",
             "--no-first-run", "--no-default-browser-check",
             "https://net22.cc"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
    except Exception as e:
        print(f"[X] Failed to launch Chrome: {e}")
        return
    
    # Wait for Chrome debug port (30 sec)
    print("Connecting", end="", flush=True)
    connected = False
    for i in range(30):
        try:
            r = requests.get(f"http://localhost:{DEBUG_PORT}/json", timeout=2)
            if r.status_code == 200:
                print(" OK!")
                connected = True
                break
        except Exception:
            pass
        print(".", end="", flush=True)
        time.sleep(1)
    
    if not connected:
        print("\n\n[X] Could not connect to Chrome debug port.")
        print("\nTry this manually:")
        print('1. Open PowerShell and run:')
        print(f'   & "{chrome}" --remote-debugging-port={DEBUG_PORT} https://net22.cc')
        print('2. Then run this script again')
        return
    
    print("\n" + "=" * 50)
    print("  Chrome is open! Solve the captcha.")
    print("  Wait for the HOME PAGE to load.")  
    print("  Then press ENTER here.")
    print("=" * 50)
    input("\n>> ENTER when ready... ")
    
    # Get cookies
    print("\nGrabbing cookies...")
    try:
        version = requests.get(f"http://localhost:{DEBUG_PORT}/json/version", timeout=5).json()
        ws_url = version.get("webSocketDebuggerUrl")
        
        ws = websocket.create_connection(ws_url, timeout=10)
        ws.send(json.dumps({"id": 1, "method": "Network.getAllCookies"}))
        result = json.loads(ws.recv())
        ws.close()
        
        all_cookies = result.get("result", {}).get("cookies", [])
    except Exception as e:
        print(f"[X] Failed: {e}")
        return
    
    # Filter
    site_cookies = [c for c in all_cookies if "net22" in c.get("domain", "")]
    if not site_cookies:
        site_cookies = all_cookies
    
    cookie_str = "; ".join(f"{c['name']}={c['value']}" for c in site_cookies) + ";"
    
    print(f"\nFound {len(site_cookies)} cookies!\n")
    for c in site_cookies:
        v = c['value'][:40] + ('...' if len(c['value']) > 40 else '')
        print(f"  {c['name']} = {v}")
    
    print(f"\n{'='*50}")
    print("CF_COOKIES value:")
    print(f"{'='*50}\n")
    print(cookie_str)
    
    with open("captured_cookies.txt", "w") as f:
        f.write(cookie_str)
    print(f"\nSaved to captured_cookies.txt")
    
    # Update .env
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            lines = f.readlines()
        found = False
        for i, line in enumerate(lines):
            if line.startswith("CF_COOKIES="):
                lines[i] = f"CF_COOKIES={cookie_str}\n"
                found = True; break
        if not found:
            lines.append(f"CF_COOKIES={cookie_str}\n")
        with open(env_path, "w") as f:
            f.writelines(lines)
        print("Updated .env!")
    
    print("\nDone! Update CF_COOKIES on Vercel and redeploy.")

if __name__ == "__main__":
    main()
