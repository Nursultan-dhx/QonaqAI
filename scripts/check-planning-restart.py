"""Verify real file-H2 persistence and optional Module 04 -> 05/06 additive schema upgrade.
Creates its own disposable directory inside .tools; never opens the normal application database.
"""
import argparse
from datetime import date, timedelta
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

repo = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument("--jar", default=str(repo / "backend/target/qonaqai-0.1.0.jar"))
parser.add_argument("--baseline", help="Optional JAR built from Module 04 for a schema-upgrade check")
parser.add_argument("--port", type=int, default=18096)
args = parser.parse_args()
base = f"http://127.0.0.1:{args.port}"
process = None
opener = None
credentials = dict(email="planning-restart@example.test", password="Planning-restart-9876")


def request(path, method="GET", body=None, expected=200):
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(base + path, data=data, method=method, headers={"Content-Type": "application/json"})
    try:
        with opener.open(req, timeout=5) as response:
            code, raw = response.status, response.read()
    except urllib.error.HTTPError as failure:
        code, raw = failure.code, failure.read()
    value = json.loads(raw.decode("utf-8")) if raw else None
    assert code == expected, (method, path, code, value)
    return value


def stop():
    global process
    if process is not None:
        process.terminate()
        try:
            process.wait(timeout=15)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)
        process = None


def same(actual, expected, label):
    assert actual == expected, {"check": label, "before": expected, "after": actual}


def start(jar, folder, label):
    global process, opener
    stop()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    # Windows terminate() is an abrupt process stop: flush each commit instead of relying on a shutdown hook.
    env = dict(os.environ, PORT=str(args.port), QONAQ_DB_URL=f"jdbc:h2:file:{folder / 'db/qonaqai'};DB_CLOSE_ON_EXIT=FALSE;WRITE_DELAY=0")
    java = str(Path(env["JAVA_HOME"]) / "bin/java.exe") if os.name == "nt" and env.get("JAVA_HOME") else "java"
    with (folder / (label + ".log")).open("w") as log:
        process = subprocess.Popen([java, "-jar", str(jar)], cwd=folder, env=env, stdout=log, stderr=subprocess.STDOUT,
                                   creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
    deadline = time.monotonic() + 50
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError((folder / (label + ".log")).read_text(errors="replace"))
        try:
            request("/api/package-options")
            return
        except (urllib.error.URLError, ConnectionError, TimeoutError):
            time.sleep(0.15)
    raise RuntimeError("Application startup timeout")


tools = (repo / ".tools").resolve()
assert tools.parent == repo.resolve()
tools.mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix="planning-restart-", dir=tools) as temporary:
    folder = Path(temporary).resolve()
    assert folder.parent == tools
    (folder / "db").mkdir()
    current = folder / "module05-06.jar"
    shutil.copyfile(args.jar, current)
    try:
        start(Path(args.baseline).resolve() if args.baseline else current, folder, "before")
        request("/api/auth/register", "POST", dict(credentials, name="Проверка перезапуска"), 201)
        day = str(date.today() + timedelta(days=60))
        event_body = dict(title="Проект после перезапуска", type="CORPORATE", date=day, guests=80,
                          budget=2000000, strategy="ECONOMY", venueId=1)
        event = request("/api/events", "POST", event_body, 201)["event"]
        event_id = event["id"]
        quote = request(f"/api/events/{event_id}/estimate/preview", "POST", dict(packageCode="BASIC", services=[]))
        body = dict(packageCode="BASIC", services=[], expectedConfigurationVersion=None,
                    expectedEventInputToken=quote["eventInputToken"], expectedPricingToken=quote["pricingToken"])
        for key in ["packageCatalogVersion", "serviceCatalogVersion", "venueCatalogVersion"]:
            body[key] = quote[key]
        saved = request(f"/api/events/{event_id}/package", "PUT", body)
        booking = request(f"/api/events/{event_id}/bookings", "POST", dict(start=day+"T18:00:00+05:00",
                          end=day+"T20:00:00+05:00", estimateId=saved["currentEstimate"]["estimateId"]), 201)
        # The baseline event endpoint predates microsecond normalization; compare its persisted representation.
        persisted_events = request("/api/events")
        if args.baseline:
            start(current, folder, "upgraded")
            request("/api/auth/login", "POST", credentials)
            upgraded_events = request("/api/events")
            same(upgraded_events, persisted_events, "events after upgrade")
            same(request(f"/api/events/{event_id}/package"), saved, "estimate after upgrade")
            same(request("/api/bookings"), [booking], "booking after upgrade")
            assert request("/api/account/plan")["plan"]["code"] == "FREE"
            print("PASS: Module 04 -> 05/06 schema upgrade preserves account, event, estimate and booking", flush=True)
        draft = request(f"/api/events/{event_id}/proposal-draft", "POST", {})
        proposal_body = dict(title="Документ после перезапуска", body=draft["body"]+"\n\nПравка пользователя.", sourceToken=draft["sourceToken"])
        proposal = request(f"/api/events/{event_id}/proposals", "POST", proposal_body, 201)
        request("/api/account/plan", "PUT", dict(code="PRO"))
        before = request("/api/account/dashboard")
        start(current, folder, "restarted")
        request("/api/auth/login", "POST", credentials)
        after = request("/api/account/dashboard")
        same(after, before, "dashboard after restart")
        same(request(f"/api/proposals/{proposal['id']}"), proposal, "proposal after restart")
        print("PASS: edited proposal, Pro plan, events, quotes, booking and notifications survive process restart", flush=True)
        request(f"/api/bookings/{booking['id']}/cancel", "POST", {})
        request(f"/api/events/{event_id}", "PUT", dict(event_body, guests=90))
        assert request(f"/api/proposals/{proposal['id']}")["freshness"] == "OUTDATED"
        start(current, folder, "restarted-outdated")
        request("/api/auth/login", "POST", credentials)
        document = request(f"/api/proposals/{proposal['id']}")
        assert document["freshness"] == "OUTDATED"
        assert document["body"] == proposal["body"]
        assert request("/api/account/dashboard")["events"][0]["bookingStatus"] == "CANCELLED"
        print("PASS: outdated proposal and cancelled booking remain accurate after another restart", flush=True)
    except Exception:
        logs = sorted(folder.glob("*.log"), key=lambda path: path.stat().st_mtime)
        if logs:
            diagnostic = tools / "planning-restart-failure.log"
            shutil.copyfile(logs[-1], diagnostic)
            print("Server diagnostic saved to " + str(diagnostic), flush=True)
        raise
    finally:
        stop()
