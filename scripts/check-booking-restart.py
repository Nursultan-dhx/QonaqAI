"""Real JAR upgrade/restart check; creates and removes its own disposable file H2 inside .tools."""
import argparse
import http.cookiejar
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from datetime import date, timedelta

repo = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument("--jar", default=str(repo / "backend/target/qonaqai-0.1.0.jar"))
parser.add_argument("--baseline", help="Optional Module 03 JAR for an additive schema upgrade check")
parser.add_argument("--port", type=int, default=18088)
args = parser.parse_args()
base = "http://127.0.0.1:" + str(args.port)
proc = None
opener = None
credentials = {"email": "booking-restart@example.com", "password": "Booking-restart-9876"}

def request(path, method="GET", body=None, expected=200):
    payload = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(base + path, data=payload, method=method, headers={"Content-Type": "application/json"})
    try:
        with opener.open(req, timeout=15) as response:
            code, raw = response.status, response.read()
    except urllib.error.HTTPError as failure:
        code, raw = failure.code, failure.read()
    result = json.loads(raw) if raw else None
    assert code == expected, (method, path, code, result)
    return result

def stop():
    global proc
    if proc is not None:
        proc.terminate()
        try:
            proc.wait(timeout=20)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=5)
        proc = None

def start(jar, folder, label):
    global proc, opener
    stop()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    env = dict(os.environ, PORT=str(args.port), QONAQ_DB_URL="jdbc:h2:file:" + str(folder / "db/qonaqai") + ";DB_CLOSE_ON_EXIT=FALSE;LOCK_TIMEOUT=10000")
    (folder / "db").mkdir(exist_ok=True)
    with (folder / (label + ".log")).open("w") as log:
        proc = subprocess.Popen(["java", "-jar", str(jar)], cwd=folder, env=env, stdout=log, stderr=subprocess.STDOUT)
    for _ in range(400):
        if proc.poll() is not None:
            raise RuntimeError((folder / (label + ".log")).read_text())
        try:
            request("/api/package-options")
            return
        except (urllib.error.URLError, ConnectionError, TimeoutError):
            time.sleep(0.1)
    raise RuntimeError("Application startup timeout")

def save(event_id):
    quote = request(f"/api/events/{event_id}/estimate/preview", "POST", {"packageCode": "STANDARD", "services": [{"type": "PHOTOGRAPHY", "hours": 3}]})
    body = dict(packageCode="STANDARD", services=[{"type": "PHOTOGRAPHY", "hours": 3}], expectedConfigurationVersion=None,
                expectedEventInputToken=quote["eventInputToken"], expectedPricingToken=quote["pricingToken"])
    for key in ["packageCatalogVersion", "serviceCatalogVersion", "venueCatalogVersion"]:
        body[key] = quote[key]
    return request(f"/api/events/{event_id}/package", "PUT", body)

(repo / ".tools").mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix="booking-restart-", dir=repo / ".tools") as temp:
    folder = Path(temp)
    current = folder / "module04.jar"
    shutil.copyfile(args.jar, current)
    try:
        start(Path(args.baseline).resolve() if args.baseline else current, folder, "before")
        request("/api/auth/register", "POST", dict(credentials, name="Booking restart"), 201)
        day = str(date.today() + timedelta(days=30))
        draft = dict(title="Booking restart", type="CORPORATE", date=day, guests=80, budget=2000000, strategy="ECONOMY", venueId=1)
        first = request("/api/events", "POST", draft, 201)["event"]["id"]
        second = request("/api/events", "POST", dict(draft, title="Replacement booking"), 201)["event"]["id"]
        saved = save(first)
        other = save(second)
        if args.baseline:
            start(current, folder, "upgraded")
            request("/api/auth/login", "POST", credentials)
            assert request(f"/api/events/{first}/package") == saved
            print("PASS: Module 03 -> Module 04 additive schema upgrade preserves event/package/estimate")
        interval = dict(start=day + "T18:00:00+05:00", end=day + "T22:00:00+05:00")
        query = urllib.parse.urlencode(interval)
        assert request("/api/venues/1/availability?" + query)["available"]
        booked = request(f"/api/events/{first}/bookings", "POST", dict(interval, estimateId=saved["currentEstimate"]["estimateId"]), 201)
        start(current, folder, "restart-confirmed")
        request("/api/auth/login", "POST", credentials)
        assert request("/api/bookings") == [booked]
        assert request(f"/api/events/{first}/package") == saved
        assert not request("/api/venues/1/availability?" + query)["available"]
        failure = request(f"/api/events/{second}/bookings", "POST", dict(interval, estimateId=other["currentEstimate"]["estimateId"]), 409)
        assert failure["code"] == "VENUE_UNAVAILABLE"
        print("PASS: confirmed booking, exact interval, estimate reference and unavailable slot survive process restart")
        cancelled = request(f"/api/bookings/{booked['id']}/cancel", "POST")
        request(f"/api/events/{first}", "DELETE", expected=204)
        start(current, folder, "restart-cancelled")
        request("/api/auth/login", "POST", credentials)
        assert request("/api/bookings") == [cancelled]
        assert request("/api/venues/1/availability?" + query)["available"]
        assert request(f"/api/bookings/{booked['id']}/cancel", "POST") == cancelled
        replacement = request(f"/api/events/{second}/bookings", "POST", dict(interval, estimateId=other["currentEstimate"]["estimateId"]), 201)
        assert replacement["status"] == "CONFIRMED"
        print("PASS: cancellation/history survive restart and event deletion; released slot can be booked again")
    finally:
        stop()
